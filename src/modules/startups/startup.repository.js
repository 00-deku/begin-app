import Startup from "./models/startup.model.js";

/**
 * Repository layer for the Startup model.
 * All public methods return plain JS objects (via .toObject() or .lean()),
 * never raw Mongoose documents, so callers are decoupled from Mongoose internals.
 */

/**
 * Apply an array of populate configs to a Mongoose query and return it.
 * @param {import("mongoose").Query} query
 * @param {Array<{path: string, select?: string}>} [populates]
 * @returns {import("mongoose").Query}
 */
function applyPopulate(query, populates) {
  if (!Array.isArray(populates)) return query;
  for (const config of populates) {
    query = query.populate(config);
  }
  return query;
}

/**
 * Find a startup by its _id.
 * @param {string|import("mongoose").Types.ObjectId} startupId
 * @param {{ populate?: Array<{path: string, select?: string}> }} [options]
 * @returns {Promise<object|null>}
 */
export async function findById(startupId, options = {}) {
  let query = Startup.findById(startupId);
  query = applyPopulate(query, options.populate);
  const doc = await query.exec();
  if (!doc) return null;
  return doc.toObject();
}

/**
 * Find multiple startups matching a filter.
 * @param {object} filter - Mongoose filter object
 * @param {{ sort?: object, limit?: number, populate?: Array<{path: string, select?: string}> }} [options]
 * @returns {Promise<object[]>}
 */
export async function findMany(filter = {}, options = {}) {
  let query = Startup.find(filter);
  if (options.sort) {
    query = query.sort(options.sort);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  query = applyPopulate(query, options.populate);
  const docs = await query.exec();
  return docs.map((doc) => doc.toObject());
}

/**
 * Create a new startup document.
 * @param {object} data - Fields to set on the new document
 * @returns {Promise<object>}
 */
export async function create(data) {
  const doc = await Startup.create(data);
  return doc.toObject();
}

/**
 * Update a startup by its _id, returning the updated document.
 * @param {string|import("mongoose").Types.ObjectId} startupId
 * @param {object} updateData - Mongoose update expression
 * @returns {Promise<object|null>}
 */
export async function updateById(startupId, updateData) {
  const doc = await Startup.findByIdAndUpdate(startupId, updateData, {
    new: true,
    runValidators: true,
  });
  if (!doc) return null;
  return doc.toObject();
}

/**
 * General-purpose findOneAndUpdate supporting upserts.
 * @param {object} filter
 * @param {object} updateData
 * @param {{ upsert?: boolean, new?: boolean, runValidators?: boolean }} [options]
 * @returns {Promise<object|null>}
 */
export async function findOneAndUpdate(filter, updateData, options = {}) {
  const doc = await Startup.findOneAndUpdate(filter, updateData, {
    new: true,
    runValidators: true,
    ...options,
  });
  if (!doc) return null;
  return doc.toObject();
}

/**
 * Save a live Mongoose document (preserving pre-save hooks) and return a plain object.
 * The caller is responsible for fetching the Mongoose document via the model when
 * mutation + save semantics are needed.
 * @param {import("mongoose").Document} doc - A Mongoose document instance
 * @returns {Promise<object>}
 */
export async function save(doc) {
  const saved = await doc.save();
  return saved.toObject();
}

/**
 * Hard-delete a startup by _id.
 * @param {string|import("mongoose").Types.ObjectId} id
 * @returns {Promise<object|null>}
 */
export async function deleteById(id) {
  const doc = await Startup.findByIdAndDelete(id);
  if (!doc) return null;
  return doc.toObject();
}

/**
 * Count startup documents matching a filter.
 * @param {object} [filter]
 * @returns {Promise<number>}
 */
export async function count(filter = {}) {
  return Startup.countDocuments(filter);
}

/**
 * Fetch a raw Mongoose document by _id (used internally by service methods
 * that must mutate the document and call save()).
 * @param {string|import("mongoose").Types.ObjectId} startupId
 * @returns {Promise<import("mongoose").Document|null>}
 */
export async function findDocumentById(startupId) {
  return Startup.findById(startupId);
}

export default {
  findById,
  findMany,
  create,
  updateById,
  findOneAndUpdate,
  save,
  deleteById,
  count,
  findDocumentById,
};
