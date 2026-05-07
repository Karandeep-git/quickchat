import cloudinary from "../lib/cloudinary.js";
import Status from "../models/status.js";
import User from "../models/user.js";
import { io, userSocketMap } from "../server.js";

const STATUS_TTL_MS = 24 * 60 * 60 * 1000;

const formatViewer = (viewer) => ({
  userId: String(viewer.userId?._id || viewer.userId),
  fullName: viewer.userId?.fullName || "",
  profilePic: viewer.userId?.profilePic || "",
  viewedAt: viewer.viewedAt,
});

const formatStatus = (status, currentUserId) => ({
  _id: String(status._id),
  userId: String(status.userId?._id || status.userId),
  user: status.userId?._id
    ? {
        _id: String(status.userId._id),
        fullName: status.userId.fullName,
        profilePic: status.userId.profilePic,
        bio: status.userId.bio,
      }
    : null,
  text: status.text || "",
  image: status.image || "",
  createdAt: status.createdAt,
  expiresAt: status.expiresAt,
  viewers: (status.viewers || []).map(formatViewer),
  viewerCount: status.viewers?.length || 0,
  hasViewed: (status.viewers || []).some(
    (viewer) => String(viewer.userId?._id || viewer.userId) === String(currentUserId),
  ),
  isMine: String(status.userId?._id || status.userId) === String(currentUserId),
});

const emitStatusRefresh = (excludeUserId = null) => {
  Object.entries(userSocketMap).forEach(([userId, socketId]) => {
    if (excludeUserId && String(userId) === String(excludeUserId)) {
      return;
    }

    io.to(socketId).emit("status:updated");
  });
};

export const getStatuses = async (req, res) => {
  try {
    const now = new Date();
    const currentUserId = String(req.user._id);

    const statuses = await Status.find({ expiresAt: { $gt: now } })
      .populate("userId", "fullName profilePic bio")
      .populate("viewers.userId", "fullName profilePic")
      .sort({ createdAt: -1 });

    const activeUserIds = [...new Set(statuses.map((status) => String(status.userId._id)))];
    const usersWithStatuses = await User.find({ _id: { $in: activeUserIds } })
      .select("fullName profilePic bio")
      .lean();

    const grouped = new Map();

    statuses.forEach((status) => {
      const statusUserId = String(status.userId._id);
      if (!grouped.has(statusUserId)) {
        grouped.set(statusUserId, {
          userId: statusUserId,
          user:
            usersWithStatuses.find((user) => String(user._id) === statusUserId) || null,
          statuses: [],
          hasUnviewed: false,
          latestStatusAt: status.createdAt,
        });
      }

      const formattedStatus = formatStatus(status, currentUserId);
      const entry = grouped.get(statusUserId);
      entry.statuses.push(formattedStatus);
      entry.hasUnviewed = entry.hasUnviewed || !formattedStatus.hasViewed;
      if (new Date(formattedStatus.createdAt) > new Date(entry.latestStatusAt)) {
        entry.latestStatusAt = formattedStatus.createdAt;
      }
    });

    const myStatuses = [];
    const contacts = [];

    [...grouped.values()]
      .sort((entryA, entryB) => new Date(entryB.latestStatusAt) - new Date(entryA.latestStatusAt))
      .forEach((entry) => {
        const normalizedEntry = {
          ...entry,
          user: entry.user
            ? {
                ...entry.user,
                _id: String(entry.user._id),
              }
            : null,
        };

        if (String(entry.userId) === currentUserId) {
          myStatuses.push(...normalizedEntry.statuses);
        } else {
          contacts.push(normalizedEntry);
        }
      });

    res.json({
      success: true,
      myStatuses,
      contacts,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStatus = async (req, res) => {
  try {
    const { text, image } = req.body;
    const trimmedText = typeof text === "string" ? text.trim() : "";

    if (!trimmedText && !image) {
      return res.status(400).json({
        success: false,
        message: "Status text or image is required",
      });
    }

    let imageUrl = "";
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const status = await Status.create({
      userId: req.user._id,
      text: trimmedText,
      image: imageUrl,
      expiresAt: new Date(Date.now() + STATUS_TTL_MS),
    });

    const populatedStatus = await Status.findById(status._id)
      .populate("userId", "fullName profilePic bio")
      .populate("viewers.userId", "fullName profilePic");

    emitStatusRefresh();

    res.status(201).json({
      success: true,
      status: formatStatus(populatedStatus, req.user._id),
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markStatusViewed = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = String(req.user._id);

    const status = await Status.findOne({
      _id: id,
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "fullName profilePic bio")
      .populate("viewers.userId", "fullName profilePic");

    if (!status) {
      return res
        .status(404)
        .json({ success: false, message: "Status not found" });
    }

    let didCreateView = false;

    if (String(status.userId._id || status.userId) !== currentUserId) {
      const hasViewed = status.viewers.some(
        (viewer) => String(viewer.userId?._id || viewer.userId) === currentUserId,
      );

      if (!hasViewed) {
        status.viewers.push({
          userId: req.user._id,
          viewedAt: new Date(),
        });
        await status.save();
        didCreateView = true;
      }
    }

    const refreshedStatus = await Status.findById(id)
      .populate("userId", "fullName profilePic bio")
      .populate("viewers.userId", "fullName profilePic");

    const ownerUserId = String(refreshedStatus.userId._id || refreshedStatus.userId);
    const ownerSocketId = userSocketMap[ownerUserId];
    if (ownerSocketId && didCreateView && ownerUserId !== currentUserId) {
      io.to(ownerSocketId).emit("status:viewed", {
        statusId: String(refreshedStatus._id),
        viewer: {
          userId: currentUserId,
          fullName: req.user.fullName,
          profilePic: req.user.profilePic,
          viewedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      status: formatStatus(refreshedStatus, req.user._id),
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const status = await Status.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!status) {
      return res
        .status(404)
        .json({ success: false, message: "Status not found" });
    }

    emitStatusRefresh();

    res.json({ success: true, message: "Status deleted" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
