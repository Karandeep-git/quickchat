import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  createGroupConversation,
  getGroupConversations,
  getGroupMessages,
  removeGroupMember,
  sendGroupMessage,
  updateGroupConversation,
} from "../controllers/conversationController.js";

const conversationRouter = express.Router();

conversationRouter.get("/groups", protectRoute, getGroupConversations);
conversationRouter.post("/groups", protectRoute, createGroupConversation);
conversationRouter.get("/groups/:id/messages", protectRoute, getGroupMessages);
conversationRouter.post("/groups/:id/messages", protectRoute, sendGroupMessage);
conversationRouter.put("/groups/:id", protectRoute, updateGroupConversation);
conversationRouter.delete(
  "/groups/:id/members/:memberId",
  protectRoute,
  removeGroupMember,
);

export default conversationRouter;
