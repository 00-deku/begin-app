import jwt from "jsonwebtoken";
import Profile from "../models/profile.model.js";

export const attachUser = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    res.locals.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Attach profile data if it exists
    const profile = await Profile.findOne({ userId: decoded.userId });
    res.locals.user = {
      ...decoded,
      profile: profile || null,
      isOnboarded: profile?.isOnboarded || false,
    };
  } catch {
    res.locals.user = null;
  }

  next();
};

// Hard guard — user must be authenticated
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect("/auth/login");
  }
  next();
};

// Onboarding guard — redirect un-onboarded users to setup screens
export const requireOnboarded = (req, res, next) => {
  if (req.user && res.locals.user && !res.locals.user.isOnboarded) {
    return res.redirect("/onboarding/role");
  }
  next();
};