import mongoose from "mongoose";
import Message from "../models/message.js";
import User from "../models/user.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

const getDirectConversationMatch = (myId, otherUserId) => ({
  conversationId: null,
  $or: [
    { senderId: myId, receiverId: otherUserId },
    { senderId: otherUserId, receiverId: myId },
  ],
});

const buildDirectPreview = (message) => {
  if (!message) {
    return null;
  }

  if (message.deletedForEveryone) {
    return "Message removed";
  }

  if (message.image && !message.text) {
    return "Photo";
  }

  return message.text || "Attachment";
};

const emitMessageSeen = (message) => {
  const senderSocketId = userSocketMap[String(message.senderId)];

  if (senderSocketId) {
    io.to(senderSocketId).emit("message:seen", {
      messageId: String(message._id),
      receiverId: String(message.receiverId),
      seenAt: message.seenAt,
    });
  }
};

const emitMessageUpdated = (message) => {
  const targetSocketIds = [
    userSocketMap[String(message.senderId)],
    userSocketMap[String(message.receiverId)],
  ].filter(Boolean);

  targetSocketIds.forEach((socketId) => {
    io.to(socketId).emit("message:updated", message);
  });
};

export const getUserForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const objectUserId = new mongoose.Types.ObjectId(String(userId));

    const [filteredUsers, lastMessages, unseenCounts] = await Promise.all([
      User.find({ _id: { $ne: userId } }).select("-password").lean(),
      Message.aggregate([
        {
          $match: {
            conversationId: null,
            $or: [{ senderId: objectUserId }, { receiverId: objectUserId }],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            chatUserId: {
              $cond: [
                { $eq: ["$senderId", objectUserId] },
                "$receiverId",
                "$senderId",
              ],
            },
            text: 1,
            image: 1,
            deletedForEveryone: 1,
            createdAt: 1,
          },
        },
        {
          $group: {
            _id: "$chatUserId",
            lastMessageAt: { $first: "$createdAt" },
            lastMessageText: { $first: "$text" },
            lastMessageImage: { $first: "$image" },
            lastMessageDeleted: { $first: "$deletedForEveryone" },
          },
        },
      ]),
      Message.aggregate([
        {
          $match: {
            conversationId: null,
            receiverId: objectUserId,
            seen: false,
          },
        },
        {
          $group: {
            _id: "$senderId",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const lastMessageMap = new Map(
      lastMessages.map((message) => [
        String(message._id),
        {
          lastMessageAt: message.lastMessageAt,
          lastMessagePreview: buildDirectPreview({
            text: message.lastMessageText,
            image: message.lastMessageImage,
            deletedForEveryone: message.lastMessageDeleted,
          }),
        },
      ]),
    );

    const unseenMessages = Object.fromEntries(
      unseenCounts.map((entry) => [String(entry._id), entry.count]),
    );

    const users = filteredUsers
      .map((user) => ({
        ...user,
        type: "direct",
        lastMessageAt: lastMessageMap.get(String(user._id))?.lastMessageAt || null,
        lastMessagePreview:
          lastMessageMap.get(String(user._id))?.lastMessagePreview || "",
      }))
      .sort((userA, userB) => {
        const timeA = userA.lastMessageAt
          ? new Date(userA.lastMessageAt).getTime()
          : 0;
        const timeB = userB.lastMessageAt
          ? new Date(userB.lastMessageAt).getTime()
          : 0;

        return timeB - timeA;
      });

    res.json({ success: true, users, unseenMessages });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;
    const seenAt = new Date();

    await Message.updateMany(
      {
        conversationId: null,
        senderId: selectedUserId,
        receiverId: myId,
        seen: false,
      },
      { seen: true, seenAt },
    );

    const messages = await Message.find(
      getDirectConversationMatch(myId, selectedUserId),
    ).sort({ createdAt: 1 });

    const seenMessages = messages.filter(
      (message) =>
        String(message.receiverId) === String(myId) &&
        String(message.senderId) === String(selectedUserId) &&
        message.seen,
    );

    seenMessages.forEach(emitMessageSeen);

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: id,
        receiverId: req.user._id,
        conversationId: null,
      },
      { seen: true, seenAt: new Date() },
      { new: true },
    );

    if (!updatedMessage) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    emitMessageSeen(updatedMessage);

    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;
    const hasText = typeof text === "string" && text.trim().length > 0;

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

    const receiverSocketId = userSocketMap[String(receiverId)];
    const deliveredAt = receiverSocketId ? new Date() : null;

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: hasText ? text.trim() : "",
      image: imageUrl,
      deliveredAt,
    });

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const trimmedText = typeof text === "string" ? text.trim() : "";

    if (!trimmedText) {
      return res
        .status(400)
        .json({ success: false, message: "Message text is required" });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      { _id: id, senderId: req.user._id, deletedForEveryone: false },
      { text: trimmedText, editedAt: new Date() },
      { new: true },
    );

    if (!updatedMessage) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    emitMessageUpdated(updatedMessage);

    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedMessage = await Message.findOneAndUpdate(
      { _id: id, senderId: req.user._id },
      {
        text: "This message was removed",
        image: "",
        deletedForEveryone: true,
        editedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedMessage) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    emitMessageUpdated(updatedMessage);

    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
