
import EmailOTP from "../models/opt.model.js";

import {
  generateOTP,
  hashOTP,
} from "../utils/otp.js";

import sendOTPEmail from "./email.service.js";

const sendVerificationOTP = async (email, purpose) => {
  email = email.toLowerCase().trim();

  // Prevent frequent OTP requests
  const recentOTP = await EmailOTP.findOne({
    email,
    purpose,
    createdAt: {
      $gt: new Date(Date.now() - 60 * 1000),
    },
  });

  if (recentOTP) {
    throw new Error(
      "Please wait 60 seconds before requesting another OTP."
    );
  }

  // Invalidate previous OTPs
  await EmailOTP.deleteMany({
    email,
    purpose,
  });

  const otp = generateOTP();

  const otpRecord = await EmailOTP.create({
    email,
    otpHash: hashOTP(otp),
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    isUsed: false,
  });

  try {
    await sendOTPEmail({
      to: email,
      otp,
      purpose,
    });

    return {
      message: "OTP sent successfully.",
    };

  } catch (error) {
    await EmailOTP.deleteOne({
      _id: otpRecord._id,
    });

    throw error;
  }
};

export default sendVerificationOTP;
