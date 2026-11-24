import Profile from "./models/profile.model.js";

/**
 * Profile repository providing data-access methods for the Profile model.
 * All methods return plain JS objects (never raw Mongoose documents),
 * except save() which accepts a Mongoose document and returns a plain object
 * so that the pre-save hook that computes profileCompletionPercentage and
 * isBuilder is preserved.
 */

/**
 * Find a profile by userId.
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @param {boolean} [populateAuth=false] - when true, populates userId with email and role from Auth
 * @returns {Promise<object|null>}
 */
export async function findByUserId(userId, populateAuth = false) {
  let query = Profile.findOne({ userId });
  if (populateAuth) {
    query = query.populate("userId", "email role");
  }
  const doc = await query.lean();
  return doc || null;
}

/**
 * Find a profile by its _id.
 * @param {string|import("mongoose").Types.ObjectId} profileId
 * @param {boolean} [populateAuth=false]
 * @returns {Promise<object|null>}
 */
export async function findById(profileId, populateAuth = false) {
  let query = Profile.findById(profileId);
  if (populateAuth) {
    query = query.populate("userId", "email role");
  }
  const doc = await query.lean();
  return doc || null;
}

/**
 * Create a new profile document.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function create(data) {
  const doc = await Profile.create(data);
  return doc.toObject();
}

/**
 * Find a profile by userId and update it, upserting if not found.
 * Uses findOneAndUpdate with upsert:true and new:true so the returned
 * document reflects the applied update.
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function upsertByUserId(userId, data) {
  const doc = await Profile.findOneAndUpdate(
    { userId },
    { ...data, userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc;
}

/**
 * Save a Mongoose document and return a plain object.
 * This method must receive a live Mongoose document (not a plain object) so
 * that the pre-save hook that computes profileCompletionPercentage and
 * isBuilder runs correctly.
 * @param {import("mongoose").Document} profileDoc - a live Mongoose Profile document
 * @returns {Promise<object>}
 */
export async function save(profileDoc) {
  const saved = await profileDoc.save();
  return saved.toObject();
}

/**
 * Update a profile by userId using findOneAndUpdate.
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @param {object} updateData - MongoDB update expression or plain field map
 * @returns {Promise<object|null>}
 */
export async function updateByUserId(userId, updateData) {
  const doc = await Profile.findOneAndUpdate({ userId }, updateData, {
    new: true,
  }).lean();
  return doc || null;
}

/**
 * Find multiple profiles matching a filter.
 * @param {object} filter
 * @param {{ sort?: object, limit?: number, populate?: Array }} [options={}]
 * @returns {Promise<object[]>}
 */
export async function findMany(filter = {}, options = {}) {
  let query = Profile.find(filter);
  if (options.sort) {
    query = query.sort(options.sort);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.populate) {
    for (const pop of options.populate) {
      query = query.populate(pop);
    }
  }
  return query.lean();
}

/**
 * Find a single profile matching a filter.
 * @param {object} filter
 * @returns {Promise<object|null>}
 */
export async function findOne(filter) {
  const doc = await Profile.findOne(filter).lean();
  return doc || null;
}

/**
 * Retrieve a live Mongoose document for mutation-then-save patterns.
 * Unlike findByUserId this returns the raw Mongoose document so callers can
 * mutate fields and hand the document to save().
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @returns {Promise<import("mongoose").Document|null>}
 */
export async function findDocumentByUserId(userId) {
  return Profile.findOne({ userId });
}

/**
 * Retrieve a live Mongoose document by custom filter for mutation-then-save patterns.
 * @param {object} filter
 * @returns {Promise<import("mongoose").Document|null>}
 */
export async function findDocument(filter) {
  return Profile.findOne(filter);
}

const profileRepository = {
  findByUserId,
  findById,
  findOne,
  create,
  upsertByUserId,
  save,
  updateByUserId,
  findMany,
  findDocumentByUserId,
  findDocument,
};

export default profileRepository;
