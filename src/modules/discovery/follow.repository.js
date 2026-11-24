import Follow from "./models/follow.model.js";

/**
 * Repository for Follow documents. All methods return plain objects, never raw
 * Mongoose documents.
 */

/**
 * Find a single follow record matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @returns {Promise<object|null>} Plain object or null.
 */
export async function findOne(filter) {
  const doc = await Follow.findOne(filter).lean();
  return doc || null;
}

/**
 * Create a new follow record.
 * @param {object} data - Fields to persist.
 * @returns {Promise<object>} Plain object of the created document.
 */
export async function create(data) {
  const doc = await Follow.create(data);
  return doc.toObject();
}

/**
 * Delete a single follow record matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @returns {Promise<number>} Number of documents deleted (0 or 1).
 */
export async function deleteOne(filter) {
  const result = await Follow.deleteOne(filter);
  return result.deletedCount;
}

/**
 * Find multiple follow records matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @param {object} [options={}] - Query options.
 * @param {string|object} [options.select] - Fields to include or exclude.
 * @returns {Promise<object[]>} Array of plain objects.
 */
export async function findMany(filter, options = {}) {
  let query = Follow.find(filter);
  if (options.select) {
    query = query.select(options.select);
  }
  return query.lean();
}

/**
 * Count follow records matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @returns {Promise<number>} Document count.
 */
export async function count(filter) {
  return Follow.countDocuments(filter);
}

const followRepository = {
  findOne,
  create,
  deleteOne,
  findMany,
  count,
};

export default followRepository;

