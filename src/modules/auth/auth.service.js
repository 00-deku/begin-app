import jwt from "jsonwebtoken";
import config from "../../config/env.js";
import Auth from "./models/auth.model.js";
import EmailOTP from "./models/otp.model.js";
import Profile from "../profiles/models/profile.model.js";
import sendOTPEmail from "../../infrastructure/email/email.service.js";
import { generateOTP, hashOTP, verifyOTP } from "../../shared/utils/crypto.utils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "../../shared/errors/index.js";

/**
 * Authentication service managing credential-less email OTP flows,
 * Google OAuth profile resolution, and JWT session issuance.
 */

export const requestOTP = async (email, purpose) => {
  const user = await Auth.findOne({ email });

  if (purpose === "SIGNUP" && user?.isEmailVerified) {
    throw new ConflictError("Account already exists. Please login.");
  }

  if (purpose === "LOGIN" && !user) {
    throw new NotFoundError("Account not found. Please signup.");
  }

  if (user && !user.isActive) {
    throw new ForbiddenError("Account is inactive.");
  }

  // Prevent frequent OTP requests within cooldown window
  const recentOTP = await EmailOTP.findOne({
    email,
    purpose,
    createdAt: {
      $gt: new Date(Date.now() - config.otp.cooldownSeconds * 1000),
    },
  });

  if (recentOTP) {
    throw new BadRequestError("Please wait 60 seconds before requesting another OTP.");
  }

  // Invalidate previous OTPs for this email and purpose
  await EmailOTP.deleteMany({ email, purpose });

  const otp = generateOTP();
  console.log(`[AUTH OTP] Code for ${email} (${purpose}): ${otp}`);

  const otpRecord = await EmailOTP.create({
    email,
    otpHash: hashOTP(otp),
    purpose,
    expiresAt: new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000),
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
      message: "OTP sent successfully. Check your email or server log.",
      devOtp: config.env !== "production" ? otp : undefined,
    };
  } catch (error) {
    if (config.env !== "production") {
      console.warn(`[AUTH OTP] Email sending failed (${error.message}). Use dev OTP: ${otp}`);
      return {
        message: `OTP sent (Dev code: ${otp}).`,
        devOtp: otp,
      };
    }

    await EmailOTP.deleteOne({ _id: otpRecord._id });
    throw error;
  }
};

export const verifyOTPAndAuthenticate = async (email, otp, purpose) => {
  const otpRecord = await EmailOTP.findOne({
    email,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new BadRequestError("OTP expired or not found. Please request a new one.");
  }

  if (otpRecord.attempts >= config.otp.maxAttempts) {
    await EmailOTP.deleteOne({ _id: otpRecord._id });
    throw new BadRequestError("Too many failed attempts. Please request a new OTP.");
  }

  const isValid = verifyOTP(otp, otpRecord.otpHash);
  if (!isValid) {
    await EmailOTP.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
    throw new BadRequestError("Invalid OTP. Please try again.");
  }

  await EmailOTP.updateOne(
    { _id: otpRecord._id },
    { isUsed: true, verifiedAt: new Date() }
  );

  let user;
  if (purpose === "SIGNUP") {
    user = await Auth.findOneAndUpdate(
      { email },
      { email, isEmailVerified: true, emailVerifiedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    user = await Auth.findOne({ email });
    if (!user) {
      throw new NotFoundError("Account not found.");
    }
  }

  const profile = await Profile.findOne({ userId: user._id });
  const isOnboarded = Boolean(profile?.isOnboarded);
  const token = generateAuthToken(user);

  return {
    user,
    token,
    isOnboarded,
    nextStep: isOnboarded ? "/" : "/onboarding/role",
  };
};

export const authenticateWithGoogle = async (googleUser) => {
  if (!googleUser?.email) {
    throw new BadRequestError("Failed to retrieve email address from Google.");
  }

  const email = googleUser.email.toLowerCase().trim();

  let user = await Auth.findOne({
    $or: [{ googleId: googleUser.sub }, { email }],
  });

  if (!user) {
    user = await Auth.create({
      email,
      googleId: googleUser.sub,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      profileImageUrl: googleUser.picture || "/images/default.svg",
    });
  } else {
    if (!user.isActive) {
      throw new ForbiddenError("Your account is currently inactive.");
    }

    let shouldSave = false;
    if (!user.googleId) {
      user.googleId = googleUser.sub;
      shouldSave = true;
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      shouldSave = true;
    }
    if ((!user.profileImageUrl || user.profileImageUrl === "/images/default.svg") && googleUser.picture) {
      user.profileImageUrl = googleUser.picture;
      shouldSave = true;
    }

    if (shouldSave) {
      await user.save();
    }
  }

  let profile = await Profile.findOne({ userId: user._id });
  if (!profile) {
    profile = await Profile.create({
      userId: user._id,
      fullName: googleUser.name || "",
      avatarUrl: googleUser.picture || "/images/default.svg",
    });
  } else if (!profile.fullName && googleUser.name) {
    profile.fullName = googleUser.name;
    if (!profile.avatarUrl || profile.avatarUrl === "/images/default.svg") {
      profile.avatarUrl = googleUser.picture || "/images/default.svg";
    }
    await profile.save();
  }

  const token = generateAuthToken(user);
  const isOnboarded = Boolean(profile?.isOnboarded);

  return {
    user,
    token,
    isOnboarded,
    nextStep: isOnboarded ? "/" : "/onboarding/role",
  };
};

export const generateAuthToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};
