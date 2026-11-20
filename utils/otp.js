
import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "crypto";

export const generateOTP = () => {
  return randomInt(100000, 1000000).toString();
};

export const hashOTP = (otp) => {
  return createHmac(
    "sha256",
    process.env.OTP_SECRET
  )
    .update(otp)
    .digest("hex");
};

export const verifyOTP = (otp, storedHash) => {
  const generatedHash = Buffer.from(
    hashOTP(otp),
    "hex"
  );

  const savedHash = Buffer.from(
    storedHash,
    "hex"
  );

  return (
    generatedHash.length === savedHash.length &&
    timingSafeEqual(generatedHash, savedHash)
  );
};
