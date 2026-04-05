import express from "express";
import http from "http";
import "dotenv/config";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Initialize socket.io server
export const io = new Server(server, {
    cors: { origin: clientUrl, credentials: true }
});


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


// Store online users
export const userSocketMap = {}     // { userId: socketId }

// Socket.io connection handler 
io.on("connection", (socket) => {
    
    const userId = socket.userId;


    console.log("User connected", userId);

    if (userId) userSocketMap[userId] = socket.id;

    // Emit online users to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        console.log("User Disconnected", userId);
        if (userId && userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    })
})

// Middleware setup
app.use(express.json({ limit: "4mb" }));
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);

// Route setup
app.use("/api/status", (req, res) => res.send("Server is live."));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Connect to MONGODB
await connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server is running on PORT:" + PORT));
