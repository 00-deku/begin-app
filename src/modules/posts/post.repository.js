import Post from "./models/post.model.js";

/**
 * Create a new post.
 * @param {object} data - Post fields.
 * @returns {Promise<object>} Created post as plain object.
 */
async function create(data) {
  const doc = await Post.create(data);
  return doc.toObject();
}

/**
 * Find posts matching a filter.
 * @param {object} filter - Mongoose filter query.
 * @param {object} [options={}] - Query options.
 * @param {object} [options.sort] - Sort specification.
 * @param {number} [options.limit] - Maximum number of results.
 * @returns {Promise<object[]>} Array of plain post objects.
 */
async function findMany(filter = {}, options = {}) {
  let query = Post.find(filter).lean();
  if (options.sort) {
    query = query.sort(options.sort);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  return query;
}

/**
 * Find a post by its ID.
 * @param {string} id - Post document ID.
 * @returns {Promise<object|null>} Plain post object or null.
 */
async function findById(id) {
  return Post.findById(id).lean();
}

/**
 * Update a post by its ID.
 * @param {string} id - Post document ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object|null>} Updated post as plain object, or null if not found.
 */
async function updateById(id, data) {
  return Post.findByIdAndUpdate(id, data, { new: true }).lean();
}

/**
 * Delete a post by its ID.
 * @param {string} id - Post document ID.
 * @returns {Promise<object>} Mongoose delete result.
 */
async function deleteById(id) {
  return Post.findByIdAndDelete(id).lean();
}

const postRepository = {
  create,
  findMany,
  findById,
  updateById,
  deleteById,
};

export default postRepository;
