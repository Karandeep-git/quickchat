import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastSeen: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    groupImage: { type: String, default: "" },
  },
  { timestamps: true },
);

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
