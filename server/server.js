import express from "express";
import http from "http";
import "dotenv/config";
import cors from "cors";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import conversationRouter from "./routes/conversationRoutes.js";
import statusRouter from "./routes/statusRoutes.js";

const app = express();
const server = http.createServer(app);

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "https://quickchat-rosy.vercel.app",
];

const allowedOrigins = [
  ...new Set(
    [process.env.CLIENT_URL, process.env.CLIENT_URLS, ...defaultAllowedOrigins]
      .filter(Boolean)
      .flatMap((value) => value.split(","))
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
];

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
};

export const io = new Server(server, { cors: corsOptions });
export const userSocketMap = {};

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("join:conversation", (conversationId) => {
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
    }
  });

  socket.on("leave:conversation", (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });

  socket.on("typing:start", ({ toUserId, conversationId, type }) => {
    if (type === "group" && conversationId) {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        type: "group",
        conversationId,
        userId,
        isTyping: true,
      });
      return;
    }

    const receiverSocketId = userSocketMap[String(toUserId)];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing:update", {
        type: "direct",
        userId,
        isTyping: true,
      });
    }
  });

  socket.on("typing:stop", ({ toUserId, conversationId, type }) => {
    if (type === "group" && conversationId) {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        type: "group",
        conversationId,
        userId,
        isTyping: false,
      });
      return;
    }

    const receiverSocketId = userSocketMap[String(toUserId)];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing:update", {
        type: "direct",
        userId,
        isTyping: false,
      });
    }
  });

  socket.on("disconnect", () => {
    if (userId && userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

app.use(express.json({ limit: "8mb" }));
app.use(cors(corsOptions));

app.use("/api/status", statusRouter);
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/conversations", conversationRouter);

await connectDB();

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log("Server is running on PORT:" + PORT));
}

export default server;
