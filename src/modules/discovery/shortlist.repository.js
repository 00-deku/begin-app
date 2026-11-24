import Shortlist from "./models/shortlist.model.js";

/**
 * Repository for Shortlist documents. All methods return plain objects, never raw
 * Mongoose documents.
 */

/**
 * Find a single shortlist record matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @returns {Promise<object|null>} Plain object or null.
 */
export async function findOne(filter) {
  const doc = await Shortlist.findOne(filter).lean();
  return doc || null;
}

/**
 * Create a new shortlist record.
 * @param {object} data - Fields to persist.
 * @returns {Promise<object>} Plain object of the created document.
 */
export async function create(data) {
  const doc = await Shortlist.create(data);
  return doc.toObject();
}

/**
 * Delete a single shortlist record matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @returns {Promise<number>} Number of documents deleted (0 or 1).
 */
export async function deleteOne(filter) {
  const result = await Shortlist.deleteOne(filter);
  return result.deletedCount;
}

/**
 * Find multiple shortlist records matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @param {object} [options={}] - Query options.
 * @param {string|object} [options.sort] - Sort specification.
 * @param {string|object} [options.select] - Fields to include or exclude.
 * @returns {Promise<object[]>} Array of plain objects.
 */
export async function findMany(filter, options = {}) {
  let query = Shortlist.find(filter);
  if (options.sort) {
    query = query.sort(options.sort);
  }
  if (options.select) {
    query = query.select(options.select);
  }
  return query.lean();
}

/**
 * Count shortlist records matching the given filter.
 * @param {object} filter - Mongoose filter object.
 * @returns {Promise<number>} Document count.
 */
export async function count(filter) {
  return Shortlist.countDocuments(filter);
}

const shortlistRepository = {
  findOne,
  create,
  deleteOne,
  findMany,
  count,
};

export default shortlistRepository;

