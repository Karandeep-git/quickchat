import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  deleteMessage,
  editMessage,
  getMessages,
  getUserForSidebar,
  markMessageAsSeen,
  sendMessage,
} from "../controllers/messageController.js";

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUserForSidebar);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen);
messageRouter.post("/send/:id", protectRoute, sendMessage);
messageRouter.put("/:id", protectRoute, editMessage);
messageRouter.delete("/:id", protectRoute, deleteMessage);
messageRouter.get("/:id", protectRoute, getMessages);

export default messageRouter;
