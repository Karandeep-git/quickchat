import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

const markConversationSeen = async (
  conversationId,
  userId,
  seenAt = new Date(),
) => {
  await Conversation.findOneAndUpdate(
    { _id: conversationId, "lastSeen.userId": userId },
    { $set: { "lastSeen.$.seenAt": seenAt } },
  );

  await Conversation.findOneAndUpdate(
    { _id: conversationId, "lastSeen.userId": { $ne: userId } },
    {
      $push: {
        lastSeen: { userId, seenAt },
      },
    },
  );
};

const getLastSeenDate = (conversation, currentUserId) =>
  conversation.lastSeen?.find(
    (entry) => String(entry.userId) === String(currentUserId),
  )?.seenAt || new Date(0);

const buildGroupPreview = (message) => {
  if (!message) {
    return "";
  }

  if (message.deletedForEveryone) {
    return "Message removed";
  }

  if (message.image && !message.text) {
    return "Photo";
  }

  return message.text || "Attachment";
};

const formatConversation = (conversation, currentUserId) => ({
  _id: String(conversation._id),
  type: "group",
  name: conversation.name,
  groupImage: conversation.groupImage,
  adminId: String(conversation.adminId?._id || conversation.adminId),
  memberIds: conversation.memberIds.map((member) =>
    String(member._id || member),
  ),
  members: conversation.memberIds.map((member) => ({
    _id: String(member._id || member),
    fullName: member.fullName || "",
    email: member.email || "",
    profilePic: member.profilePic || "",
    bio: member.bio || "",
  })),
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
  lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
  lastMessagePreview: conversation.lastMessagePreview || "",
  unseenCount: conversation.unseenCount || 0,
  isAdmin:
    String(conversation.adminId?._id || conversation.adminId) ===
    String(currentUserId),
});

const getPopulatedConversation = (conversationId) =>
  Conversation.findById(conversationId)
    .populate("memberIds", "fullName email profilePic bio")
    .populate("adminId", "fullName email profilePic");

const emitGroupUpdate = (memberIds, group, action = "updated") => {
  memberIds.forEach((memberId) => {
    const socketId = userSocketMap[String(memberId)];
    if (socketId) {
      io.to(socketId).emit("group:updated", {
        action,
        group,
      });
    }
  });
};

export const getGroupConversations = async (req, res) => {
  try {
    const currentUserId = String(req.user._id);
    const groups = await Conversation.find({ memberIds: req.user._id })
      .populate("memberIds", "fullName email profilePic bio")
      .populate("adminId", "fullName email profilePic")
      .sort({ updatedAt: -1 });

    const groupIds = groups.map((group) => group._id);
    const lastMessages = await Message.find({
      conversationId: { $in: groupIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const latestMessageByConversation = new Map();
    lastMessages.forEach((message) => {
      const key = String(message.conversationId);
      if (!latestMessageByConversation.has(key)) {
        latestMessageByConversation.set(key, message);
      }
    });

    const formattedGroups = await Promise.all(
      groups.map(async (group) => {
        const viewerSeenAt = getLastSeenDate(group, currentUserId);
        const unseenCount = await Message.countDocuments({
          conversationId: group._id,
          senderId: { $ne: req.user._id },
          createdAt: { $gt: viewerSeenAt },
        });

        const latestMessage = latestMessageByConversation.get(String(group._id));

        return formatConversation(
          {
            ...group.toObject(),
            lastMessageAt: latestMessage?.createdAt || group.updatedAt,
            lastMessagePreview: buildGroupPreview(latestMessage),
            unseenCount,
          },
          currentUserId,
        );
      }),
    );

    res.json({
      success: true,
      groups: formattedGroups,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGroupConversation = async (req, res) => {
  try {
    const { name, memberIds = [], groupImage } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return res
        .status(400)
        .json({ success: false, message: "Group name is required" });
    }

    const uniqueMemberIds = [
      ...new Set(
        [req.user._id.toString(), ...memberIds.map((memberId) => String(memberId))]
          .filter(Boolean),
      ),
    ];

    if (uniqueMemberIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Add at least one other member to create a group",
      });
    }

    const validUsers = await User.find({
      _id: { $in: uniqueMemberIds },
    }).select("_id");

    if (validUsers.length !== uniqueMemberIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected group members are invalid",
      });
    }

    let groupImageUrl = "";
    if (groupImage) {
      const uploadResponse = await cloudinary.uploader.upload(groupImage);
      groupImageUrl = uploadResponse.secure_url;
    }

    const group = await Conversation.create({
      name: trimmedName,
      adminId: req.user._id,
      memberIds: uniqueMemberIds,
      lastSeen: uniqueMemberIds.map((memberId) => ({
        userId: memberId,
        seenAt: new Date(),
      })),
      groupImage: groupImageUrl,
    });

    const populatedGroup = await getPopulatedConversation(group._id);
    const formattedGroup = formatConversation(populatedGroup.toObject(), req.user._id);

    emitGroupUpdate(uniqueMemberIds, formattedGroup, "created");

    res.status(201).json({
      success: true,
      group: formattedGroup,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      memberIds: req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const messages = await Message.find({ conversationId })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    await markConversationSeen(conversationId, req.user._id);

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: conversationId } = req.params;
    const senderId = req.user._id;
    const hasText = typeof text === "string" && text.trim().length > 0;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      memberIds: senderId,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    if (!hasText && !image) {
      return res.status(400).json({
        success: false,
        message: "Message text or image is required",
      });
    }

    let imageUrl = "";
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = await Message.create({
      senderId,
      conversationId,
      text: hasText ? text.trim() : "",
      image: imageUrl,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { updatedAt: newMessage.createdAt },
    });
    await markConversationSeen(conversationId, senderId, newMessage.createdAt);

    const populatedMessage = await Message.findById(newMessage._id).populate(
      "senderId",
      "fullName profilePic",
    );

    io.to(`conversation:${conversationId}`).emit("newMessage", {
      ...populatedMessage.toObject(),
      type: "group",
    });

    conversation.memberIds.forEach((memberId) => {
      const memberSocketId = userSocketMap[String(memberId)];
      if (memberSocketId) {
        io.to(memberSocketId).emit("conversation:updated", {
          conversationId: String(conversationId),
          type: "group",
          updatedAt: newMessage.createdAt,
        });
      }
    });

    res.json({ success: true, newMessage: populatedMessage });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGroupConversation = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { name, groupImage, memberIds } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      memberIds: req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    if (String(conversation.adminId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can update group details",
      });
    }

    const updates = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (groupImage) {
      const uploadResponse = await cloudinary.uploader.upload(groupImage);
      updates.groupImage = uploadResponse.secure_url;
    }

    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const uniqueNewMemberIds = [
        ...new Set(
          memberIds.filter(
            (memberId) =>
              !conversation.memberIds.some(
                (existingMemberId) =>
                  String(existingMemberId) === String(memberId),
              ),
          ),
        ),
      ];

      if (uniqueNewMemberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Selected members are already part of this group",
        });
      }

      const validUsers = await User.find({
        _id: { $in: uniqueNewMemberIds },
      }).select("_id");

      if (validUsers.length !== uniqueNewMemberIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more selected group members are invalid",
        });
      }

      updates.$addToSet = {
        memberIds: { $each: uniqueNewMemberIds },
      };

      updates.$push = {
        lastSeen: {
          $each: uniqueNewMemberIds.map((memberId) => ({
            userId: memberId,
            seenAt: new Date(),
          })),
        },
      };
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid group changes were provided",
      });
    }

    await Conversation.findByIdAndUpdate(conversationId, updates);
    const populatedGroup = await getPopulatedConversation(conversationId);
    const formattedGroup = formatConversation(populatedGroup.toObject(), req.user._id);

    emitGroupUpdate(
      populatedGroup.memberIds.map((member) => member._id),
      formattedGroup,
    );

    res.json({
      success: true,
      group: formattedGroup,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const { id: conversationId, memberId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      memberIds: req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    if (String(conversation.adminId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can remove members",
      });
    }

    if (String(memberId) === String(conversation.adminId)) {
      return res.status(400).json({
        success: false,
        message: "The group creator cannot be removed",
      });
    }

    const isMember = conversation.memberIds.some(
      (conversationMemberId) => String(conversationMemberId) === String(memberId),
    );

    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: "Selected user is not part of this group",
      });
    }

    if (conversation.memberIds.length <= 2) {
      return res.status(400).json({
        success: false,
        message: "A group must keep at least two members",
      });
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      $pull: {
        memberIds: memberId,
        lastSeen: { userId: memberId },
      },
    });

    const populatedGroup = await getPopulatedConversation(conversationId);
    const formattedGroup = formatConversation(populatedGroup.toObject(), req.user._id);

    emitGroupUpdate(
      populatedGroup.memberIds.map((member) => member._id),
      formattedGroup,
    );

    const removedUserSocketId = userSocketMap[String(memberId)];
    if (removedUserSocketId) {
      io.sockets.sockets
        .get(removedUserSocketId)
        ?.leave(`conversation:${conversationId}`);
      io.to(removedUserSocketId).emit("group:updated", {
        action: "removed",
        conversationId: String(conversationId),
      });
    }

    res.json({
      success: true,
      group: formattedGroup,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
