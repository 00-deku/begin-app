import { Schema, model } from "mongoose";

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    postType: {
      type: String,
      enum: ["Update", "Milestone", "Looking For"],
      default: "Update",
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    CoverImageUrl: {
      type: String,
      required: false,
    },
    profileImageUrl: {
      type: String,
      required: true,
    },
    StartupName: {
      type: String,
      required: true,
    },
    time: {
      type: Date,
      default: Date.now,
      required: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      required: true,
    },
    commentsCount: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Post = model("post", postSchema);

export default Post;
