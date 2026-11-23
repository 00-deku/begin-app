import Post from "./models/post.model.js";

/**
 * Posts service handling feed updates and milestone publications.
 */

export async function createPost(postData) {
  return await Post.create(postData);
}

export async function getRecentPosts(limit = 20) {
  return await Post.find().sort({ createdAt: -1 }).limit(limit);
}
