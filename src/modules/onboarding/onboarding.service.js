import Profile from "../profiles/models/profile.model.js";
import { NotFoundError } from "../../shared/errors/index.js";

/**
 * Onboarding service handling student role selection and initial builder profile setup.
 */

export const getOnboardingState = async (userId) => {
  const profile = await Profile.findOne({ userId });
  return {
    profile,
    isOnboarded: Boolean(profile?.isOnboarded),
    role: profile?.role || null,
  };
};

export const saveRole = async (userId, role) => {
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { userId, role },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    profile,
    nextStep: "/onboarding/profile",
  };
};

export const completeProfileSetup = async (userId, data) => {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError("Profile not found.");
  }

  profile.fullName = data.fullName;
  profile.college = data.college;
  profile.bio = data.bio;
  profile.isOnboarded = true;

  if (data.year) profile.year = data.year;
  if (data.branch) profile.branch = data.branch;

  if (data.startupName) {
    if (!profile.founderDetails) profile.founderDetails = {};
    profile.founderDetails.startupName = data.startupName;
  }
  if (data.stage) {
    if (!profile.founderDetails) profile.founderDetails = {};
    profile.founderDetails.stage = data.stage;
  }

  if (data.skills) {
    const parsedSkills = Array.isArray(data.skills)
      ? data.skills
      : String(data.skills)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    profile.skills = parsedSkills;
    if (!profile.joinerDetails) profile.joinerDetails = {};
    profile.joinerDetails.skills = parsedSkills;
  }

  if (data.interests) {
    profile.interests = Array.isArray(data.interests)
      ? data.interests
      : String(data.interests)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  }

  if (data.lookingFor) {
    profile.lookingFor = Array.isArray(data.lookingFor)
      ? data.lookingFor
      : String(data.lookingFor)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  }

  await profile.save();

  return {
    profile,
    nextStep: "/",
  };
};
