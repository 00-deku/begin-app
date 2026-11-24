import EmailOTP from "./models/otp.model.js";

/**
 * Repository for EmailOTP records.
 *
 * All methods return plain JS objects (never raw Mongoose documents)
 * so callers remain decoupled from the ORM layer.
 */

/**
 * Find the most recent active (unused, unexpired) OTP record for a given
 * email and purpose combination.
 *
 * @param {string} email - The email address the OTP was sent to.
 * @param {string} purpose - The OTP purpose ("SIGNUP" or "LOGIN").
 * @returns {Promise<object|null>} Plain OTP object or null if not found.
 */
export async function findActiveOTP(email, purpose) {
  const doc = await EmailOTP.findOne({
    email,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).lean();
  return doc || null;
}

/**
 * Insert a new EmailOTP record.
 *
 * @param {object} data - Field values for the new OTP record.
 * @returns {Promise<object>} The created plain OTP object.
 */
export async function createOTP(data) {
  const doc = await EmailOTP.create(data);
  return doc.toObject();
}

/**
 * Mark an OTP record as used by setting isUsed to true and recording
 * the verification timestamp.
 *
 * @param {string} id - The EmailOTP document _id.
 * @returns {Promise<void>}
 */
export async function markOTPUsed(id) {
  await EmailOTP.updateOne(
    { _id: id },
    { isUsed: true, verifiedAt: new Date() }
  );
}

/**
 * Delete all OTP records for a given email and purpose.
 * Used to invalidate previous OTPs before issuing a new one.
 *
 * @param {string} email - The email address.
 * @param {string} purpose - The OTP purpose ("SIGNUP" or "LOGIN").
 * @returns {Promise<number>} The count of deleted records.
 */
export async function deleteOTPsByEmailAndPurpose(email, purpose) {
  const result = await EmailOTP.deleteMany({ email, purpose });
  return result.deletedCount;
}

/**
 * Delete a single OTP record by its database identifier.
 *
 * @param {string} id - The EmailOTP document _id.
 * @returns {Promise<boolean>} True if a record was deleted, false otherwise.
 */
export async function deleteOTPById(id) {
  const result = await EmailOTP.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

/**
 * Increment the failed-attempt counter on an OTP record.
 * Called after each incorrect OTP submission.
 *
 * @param {string} id - The EmailOTP document _id.
 * @returns {Promise<void>}
 */
export async function incrementAttempts(id) {
  await EmailOTP.updateOne({ _id: id }, { $inc: { attempts: 1 } });
}

/**
 * Find a single OTP record by generic filter.
 *
 * @param {object} filter - Query filter.
 * @returns {Promise<object|null>} Plain OTP object or null.
 */
export async function findOne(filter) {
  const doc = await EmailOTP.findOne(filter).lean();
  return doc || null;
}

/**
 * Find a recent OTP record created within a given cooldown window.
 * Used to enforce rate-limiting on OTP requests.
 *
 * @param {string} email - The email address.
 * @param {string} purpose - The OTP purpose ("SIGNUP" or "LOGIN").
 * @param {Date} since - Only records created after this date are returned.
 * @returns {Promise<object|null>} Plain OTP object or null.
 */
export async function findRecentOTP(email, purpose, since) {
  const doc = await EmailOTP.findOne({
    email,
    purpose,
    createdAt: { $gt: since },
  }).lean();
  return doc || null;
}

const otpRepository = {
  findActiveOTP,
  createOTP,
  markOTPUsed,
  deleteOTPsByEmailAndPurpose,
  deleteOTPById,
  incrementAttempts,
  findOne,
  findRecentOTP,
};

export default otpRepository;
