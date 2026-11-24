import Auth from "./models/auth.model.js";

/**
 * Repository for Auth records.
 *
 * All methods return plain JS objects (never raw Mongoose documents)
 * so callers remain decoupled from the ORM layer.
 */

/**
 * Find an Auth record by its database identifier.
 *
 * @param {string} id - The Auth document _id.
 * @returns {Promise<object|null>} Plain auth object or null if not found.
 */
export async function findById(id) {
  const doc = await Auth.findById(id).lean();
  return doc || null;
}

/**
 * Find an Auth record by email address.
 *
 * @param {string} email - The email to search for.
 * @returns {Promise<object|null>} Plain auth object or null if not found.
 */
export async function findByEmail(email) {
  const doc = await Auth.findOne({ email }).lean();
  return doc || null;
}

/**
 * Find an Auth record by Google OAuth subject ID or by email.
 * Used during Google OAuth sign-in to detect existing accounts.
 *
 * @param {string} googleId - Google OAuth subject (sub) value.
 * @param {string} email - Fallback email address.
 * @returns {Promise<object|null>} Plain auth object or null if not found.
 */
export async function findByGoogleIdOrEmail(googleId, email) {
  const doc = await Auth.findOne({
    $or: [{ googleId }, { email }],
  }).lean();
  return doc || null;
}

/**
 * Insert a new Auth record.
 *
 * @param {object} data - Field values for the new Auth record.
 * @returns {Promise<object>} The created plain auth object.
 */
export async function create(data) {
  const doc = await Auth.create(data);
  return doc.toObject();
}

/**
 * Apply a partial update to the Auth record with the given ID.
 *
 * @param {string} id - The Auth document _id.
 * @param {object} data - Partial field values to merge in.
 * @returns {Promise<object|null>} The updated plain auth object, or null if not found.
 */
export async function updateById(id, data) {
  const doc = await Auth.findByIdAndUpdate(id, data, { new: true }).lean();
  return doc || null;
}

/**
 * Persist changes made directly on a Mongoose Auth document instance.
 * Also supports plain objects with _id by delegating to updateById.
 *
 * @param {import('mongoose').Document|object} doc - A live Mongoose Auth document or plain object.
 * @returns {Promise<object>} The saved document as a plain object.
 */
export async function save(doc) {
  if (doc && typeof doc.save === "function") {
    const saved = await doc.save();
    return saved.toObject ? saved.toObject() : saved;
  }
  if (doc && doc._id) {
    const { _id, ...data } = doc;
    return updateById(_id, data);
  }
  return doc;
}

/**
 * Find by email and update, creating the record if none exists (upsert).
 * Used when verifying email OTPs to materialise an Auth record on first sign-up.
 *
 * @param {string} email - The email to match.
 * @param {object} data - Fields to set on insert or update.
 * @returns {Promise<object>} The resulting plain auth object (created or updated).
 */
export async function upsertByEmail(email, data) {
  const doc = await Auth.findOneAndUpdate(
    { email },
    data,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc;
}

/**
 * Find a live (non-lean) Mongoose Auth document by its ID.
 *
 * @param {string} id - The Auth document _id.
 * @returns {Promise<import('mongoose').Document|null>} Live Mongoose document or null.
 */
export async function findDocumentById(id) {
  return Auth.findById(id);
}

/**
 * Find a live (non-lean) Mongoose Auth document by filter.
 *
 * @param {object} filter - Query filter.
 * @returns {Promise<import('mongoose').Document|null>} Live Mongoose document or null.
 */
export async function findDocument(filter) {
  return Auth.findOne(filter);
}

const authRepository = {
  findById,
  findByEmail,
  findByGoogleIdOrEmail,
  create,
  updateById,
  save,
  upsertByEmail,
  findDocumentById,
  findDocument,
};

export default authRepository;
