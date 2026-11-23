import { createHmac, randomInt, timingSafeEqual } from "crypto";
import config from "../../config/env.js";

/**
 * Cryptographic utility functions for OTP generation, hashing, and verification.
 */

export const generateOTP = () => {
  return randomInt(100000, 1000000).toString();
};

export const hashOTP = (otp) => {
  return createHmac("sha256", config.otp.secret)
    .update(otp)
    .digest("hex");
};

export const verifyOTP = (otp, storedHash) => {
  if (!otp || !storedHash) return false;

  const generatedHash = Buffer.from(hashOTP(otp), "hex");
  const savedHash = Buffer.from(storedHash, "hex");

  return (
    generatedHash.length === savedHash.length &&
    timingSafeEqual(generatedHash, savedHash)
  );
};
