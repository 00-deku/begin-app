import Auth from "../models/auth.model.js";
import Profile from "../models/profile.model.js";
import EmailOTP from "../models/opt.model.js";
import sendVerificationOTP from "../services/otp.service.js";
import { verifyOTP } from "../utils/otp.js";
import { getGoogleAuthUrl, getGoogleUserFromCode } from "../services/googleAuth.service.js";
import jwt from "jsonwebtoken";

// GET /auth/signup
export function handleGetUserSignIn(req, res) {
  return res.render("signup", { user: res.locals.user });
}

// GET /auth/login
export function handleGetLogin(req, res) {
  return res.render("login", { user: res.locals.user });
}

// POST /api/auth/send-otp
export const requestOTP = async (req, res) => {
  try {
    let { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: "Email and purpose are required." });
    }

    email = email.toLowerCase().trim();
    purpose = purpose.toUpperCase();

    if (!["SIGNUP", "LOGIN"].includes(purpose)) {
      return res.status(400).json({ success: false, message: "Invalid purpose." });
    }

    const user = await Auth.findOne({ email });

    if (purpose === "SIGNUP" && user?.isEmailVerified) {
      return res.status(409).json({ success: false, message: "Account already exists. Please login." });
    }

    if (purpose === "LOGIN" && !user) {
      return res.status(404).json({ success: false, message: "Account not found. Please signup." });
    }

    if (user && !user.isActive) {
      return res.status(403).json({ success: false, message: "Account is inactive." });
    }

    const result = await sendVerificationOTP(email, purpose);

    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/auth/verify-otp
export const verifyOTPAndLogin = async (req, res) => {
  try {
    let { email, otp, purpose } = req.body;

    if (!email || !otp || !purpose) {
      return res.status(400).json({ success: false, message: "Email, OTP and purpose are required." });
    }

    email = email.toLowerCase().trim();
    purpose = purpose.toUpperCase();

    // Find valid, unused, unexpired OTP record
    const otpRecord = await EmailOTP.findOne({
      email,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "OTP expired or not found. Please request a new one." });
    }

    // Brute force protection: max 5 attempts
    if (otpRecord.attempts >= 5) {
      await EmailOTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    const isValid = verifyOTP(otp, otpRecord.otpHash);

    if (!isValid) {
      await EmailOTP.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // Mark OTP as used
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
        return res.status(404).json({ success: false, message: "Account not found." });
      }
    }

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "supersecretjwtkeyforbeginapp2026",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Set token as httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const profile = await Profile.findOne({ userId: user._id });
    const isOnboarded = profile?.isOnboarded || false;

    return res.status(200).json({
      success: true,
      message: "Verified successfully!",
      isOnboarded,
      nextStep: isOnboarded ? "/" : "/onboarding/role",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie("token");
  return res.redirect("/");
};

// ─── GET /auth/google ─────────────────────────────────────────────────────────
export const handleGoogleLogin = (req, res) => {
  try {
    const authUrl = getGoogleAuthUrl();
    return res.redirect(authUrl);
  } catch (error) {
    return res.redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }
};

// ─── GET /auth/google/callback ───────────────────────────────────────────────
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`/auth/login?error=${encodeURIComponent("Google sign-in was cancelled or denied.")}`);
    }

    if (!code) {
      return res.redirect(`/auth/login?error=${encodeURIComponent("Authorization code missing from Google callback.")}`);
    }

    // Exchange code for Google tokens and retrieve user profile
    const { user: googleUser } = await getGoogleUserFromCode(code);

    if (!googleUser?.email) {
      return res.redirect(`/auth/login?error=${encodeURIComponent("Failed to retrieve email address from Google.")}`);
    }

    const email = googleUser.email.toLowerCase().trim();

    // Find existing user by googleId or email
    let user = await Auth.findOne({
      $or: [{ googleId: googleUser.sub }, { email }],
    });

    if (!user) {
      // Create new user account via Google
      user = await Auth.create({
        email,
        googleId: googleUser.sub,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        profileImageUrl: googleUser.picture || "/images/default.svg",
      });
    } else {
      if (!user.isActive) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Your account is currently inactive.")}`);
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

    // Ensure Profile document exists for user
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

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Set token as httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Check if user has completed onboarding
    const isOnboarded = profile?.isOnboarded || false;
    return res.redirect(isOnboarded ? "/" : "/onboarding/role");

  } catch (error) {
    return res.redirect(`/auth/login?error=${encodeURIComponent(error.message || "Failed to authenticate with Google.")}`);
  }
};
