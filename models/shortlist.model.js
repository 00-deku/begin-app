import mongoose, { Schema } from "mongoose";

/**
 * Shortlist model allowing builders and founders to save prospective co-founders,
 * teammates, or startups to a private bookmark list with optional internal notes.
 */

const shortlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ["USER", "STARTUP"],
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    note: {
      type: String,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

shortlistSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });

const Shortlist = mongoose.model("Shortlist", shortlistSchema);
export default Shortlist;
