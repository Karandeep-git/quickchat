import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  createStatus,
  deleteStatus,
  getStatuses,
  markStatusViewed,
} from "../controllers/statusController.js";

const statusRouter = express.Router();

statusRouter.get("/", protectRoute, getStatuses);
statusRouter.post("/", protectRoute, createStatus);
statusRouter.post("/:id/view", protectRoute, markStatusViewed);
statusRouter.delete("/:id", protectRoute, deleteStatus);

export default statusRouter;
