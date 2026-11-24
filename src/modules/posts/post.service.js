import postRepository from "./post.repository.js";

/**
 * Posts service handling feed updates and milestone publications.
 */

export async function createPost(postData) {
  return postRepository.create(postData);
}

export async function getRecentPosts(limit = 20) {
  return postRepository.findMany({}, { sort: { createdAt: -1 }, limit });
}
