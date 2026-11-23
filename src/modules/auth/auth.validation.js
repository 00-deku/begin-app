import { BadRequestError } from "../../shared/errors/index.js";
import { sanitizeEmail } from "../../shared/utils/string.utils.js";

/**
 * Validation functions for authentication endpoints.
 */

export function validateRequestOTPPayload(body) {
  let { email, purpose } = body || {};

  if (!email || !purpose) {
    throw new BadRequestError("Email and purpose are required.");
  }

  email = sanitizeEmail(email);
  purpose = String(purpose).toUpperCase().trim();

  if (!["SIGNUP", "LOGIN"].includes(purpose)) {
    throw new BadRequestError("Invalid purpose.");
  }

  return { email, purpose };
}

export function validateVerifyOTPPayload(body) {
  let { email, otp, purpose } = body || {};

  if (!email || !otp || !purpose) {
    throw new BadRequestError("Email, OTP and purpose are required.");
  }

  email = sanitizeEmail(email);
  purpose = String(purpose).toUpperCase().trim();
  otp = String(otp).trim();

  return { email, otp, purpose };
}
