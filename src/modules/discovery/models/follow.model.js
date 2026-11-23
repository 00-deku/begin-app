import mongoose, { Schema } from "mongoose";

/**
 * Follow model supporting social follows of members (USER) and startups (STARTUP).
 * Used for personalized feed curation and updates.
 */

const followSchema = new Schema(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["USER", "STARTUP"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

followSchema.index({ followerId: 1, targetType: 1, targetId: 1 }, { unique: true });

const Follow = mongoose.model("Follow", followSchema);
export default Follow;
