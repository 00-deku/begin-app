import Profile from "../models/profile.model.js";
import Auth from "../models/auth.model.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

/**
 * Service handling profile retrieval, updating, privacy enforcement,
 * and builder badge evaluation.
 */

const VALID_AVAILABILITY = [
  "Open to join",
  "Looking for co-founder",
  "Just exploring",
];

const VALID_LINK_TYPES = [
  "GitHub",
  "Behance",
  "Portfolio",
  "Figma",
  "Live Demo",
  "Other",
];

function sanitizeStringList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(input)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getProfileByUserId(userId) {
  let profile = await Profile.findOne({ userId }).populate("userId", "email role");
  if (!profile) {
    profile = await Profile.create({ userId });
  }

  // Ensure calculations reflect the current state
  const { completionPercentage, isBuilder } = calculateProfileCompletion(profile);
  let changed = false;

  if (profile.profileCompletionPercentage !== completionPercentage) {
    profile.profileCompletionPercentage = completionPercentage;
    changed = true;
  }
  if (profile.isBuilder !== isBuilder) {
    profile.isBuilder = isBuilder;
    profile.builderBadgeAwardedAt = isBuilder ? profile.builderBadgeAwardedAt || new Date() : null;
    changed = true;
  }

  if (changed) {
    await profile.save();
  }

  return profile;
}

export async function getPublicProfileById(identifier, requesterUserId = null) {
  let profile = null;

  // Search by profile ID or by userId
  if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
    profile = await Profile.findById(identifier).populate("userId", "email role");
    if (!profile) {
      profile = await Profile.findOne({ userId: identifier }).populate("userId", "email role");
    }
  }

  if (!profile) {
    return null;
  }

  const isOwner = requesterUserId && profile.userId?._id?.toString() === requesterUserId.toString();
  const profileObject = profile.toObject();

  // Enforce privacy settings for other members
  if (!isOwner) {
    if (profileObject.privacy?.hideYear) {
      delete profileObject.year;
    }
    if (profileObject.privacy?.hideBranch) {
      delete profileObject.branch;
    }
  }

  profileObject.canSendIntro = Boolean(profileObject.privacy?.allowIntroRequests);
  profileObject.isOwner = Boolean(isOwner);

  return profileObject;
}

export async function updateProfile(userId, updateData) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new Error("Profile not found.");
  }

  if (updateData.fullName !== undefined) {
    profile.fullName = String(updateData.fullName).trim();
  }

  if (updateData.college !== undefined) {
    profile.college = String(updateData.college).trim();
  }

  if (updateData.year !== undefined) {
    profile.year = String(updateData.year).trim();
  }

  if (updateData.branch !== undefined) {
    profile.branch = String(updateData.branch).trim();
  }

  if (updateData.bio !== undefined) {
    const trimmedBio = String(updateData.bio).trim();
    if (trimmedBio.length > 280) {
      throw new Error("Bio must not exceed 280 characters.");
    }
    profile.bio = trimmedBio;
  }

  if (updateData.role && ["FOUNDER", "JOINER", "BOTH"].includes(updateData.role)) {
    profile.role = updateData.role;
  }

  if (updateData.skills !== undefined) {
    const parsedSkills = sanitizeStringList(updateData.skills);
    profile.skills = parsedSkills;
    if (!profile.joinerDetails) profile.joinerDetails = {};
    profile.joinerDetails.skills = parsedSkills;
  }

  if (updateData.interests !== undefined) {
    profile.interests = sanitizeStringList(updateData.interests);
  }

  if (updateData.lookingFor !== undefined) {
    profile.lookingFor = sanitizeStringList(updateData.lookingFor);
  }

  if (updateData.availabilityStatus !== undefined) {
    if (!VALID_AVAILABILITY.includes(updateData.availabilityStatus)) {
      throw new Error("Invalid availability status value.");
    }
    profile.availabilityStatus = updateData.availabilityStatus;
  }

  if (updateData.weeklyHoursAvailable !== undefined) {
    const hours = Number(updateData.weeklyHoursAvailable);
    if (isNaN(hours) || hours < 0 || hours > 168) {
      throw new Error("Weekly hours must be between 0 and 168.");
    }
    profile.weeklyHoursAvailable = hours;
  }

  if (updateData.socialLinks) {
    profile.socialLinks = {
      linkedin: String(updateData.socialLinks.linkedin || profile.socialLinks?.linkedin || "").trim(),
      github: String(updateData.socialLinks.github || profile.socialLinks?.github || "").trim(),
      twitter: String(updateData.socialLinks.twitter || profile.socialLinks?.twitter || "").trim(),
      portfolio: String(updateData.socialLinks.portfolio || profile.socialLinks?.portfolio || "").trim(),
    };
  }

  if (updateData.privacy) {
    profile.privacy = {
      hideYear: Boolean(updateData.privacy.hideYear),
      hideBranch: Boolean(updateData.privacy.hideBranch),
      allowIntroRequests: updateData.privacy.allowIntroRequests !== undefined
        ? Boolean(updateData.privacy.allowIntroRequests)
        : profile.privacy?.allowIntroRequests ?? true,
    };
  }

  if (updateData.founderDetails) {
    if (!profile.founderDetails) profile.founderDetails = {};
    if (updateData.founderDetails.startupName !== undefined) {
      profile.founderDetails.startupName = String(updateData.founderDetails.startupName).trim();
    }
    if (updateData.founderDetails.stage !== undefined) {
      profile.founderDetails.stage = String(updateData.founderDetails.stage).trim();
    }
  }

  // Recalculate completion and badge status
  const { completionPercentage, isBuilder } = calculateProfileCompletion(profile);
  profile.profileCompletionPercentage = completionPercentage;
  profile.isBuilder = isBuilder;
  if (isBuilder && !profile.builderBadgeAwardedAt) {
    profile.builderBadgeAwardedAt = new Date();
  } else if (!isBuilder) {
    profile.builderBadgeAwardedAt = null;
  }

  await profile.save();
  return profile;
}

export async function addPastWork(userId, workItem) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new Error("Profile not found.");
  }

  const { title, url, linkType, description } = workItem;
  if (!title || !title.trim()) {
    throw new Error("Work title is required.");
  }
  if (!url || !url.trim()) {
    throw new Error("Work URL is required.");
  }
  if (linkType && !VALID_LINK_TYPES.includes(linkType)) {
    throw new Error("Invalid link type.");
  }

  profile.pastWork.push({
    title: title.trim(),
    url: url.trim(),
    linkType: linkType || "Portfolio",
    description: (description || "").trim().slice(0, 280),
  });

  const { completionPercentage, isBuilder } = calculateProfileCompletion(profile);
  profile.profileCompletionPercentage = completionPercentage;
  profile.isBuilder = isBuilder;
  if (isBuilder && !profile.builderBadgeAwardedAt) {
    profile.builderBadgeAwardedAt = new Date();
  }

  await profile.save();
  return profile;
}

export async function removePastWork(userId, workItemId) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new Error("Profile not found.");
  }

  profile.pastWork = profile.pastWork.filter(
    (item) => item._id.toString() !== workItemId.toString()
  );

  const { completionPercentage, isBuilder } = calculateProfileCompletion(profile);
  profile.profileCompletionPercentage = completionPercentage;
  profile.isBuilder = isBuilder;
  if (!isBuilder) {
    profile.builderBadgeAwardedAt = null;
  }

  await profile.save();
  return profile;
}

export async function updatePrivacySettings(userId, privacySettings) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new Error("Profile not found.");
  }

  profile.privacy = {
    hideYear: Boolean(privacySettings.hideYear),
    hideBranch: Boolean(privacySettings.hideBranch),
    allowIntroRequests: Boolean(privacySettings.allowIntroRequests),
  };

  await profile.save();
  return profile;
}

export async function updateAvatar(userId, avatarUrl) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new Error("Profile not found.");
  }

  profile.avatarUrl = avatarUrl;
  await profile.save();

  // Also update Auth model for consistency
  await Auth.findByIdAndUpdate(userId, { profileImageUrl: avatarUrl });

  return profile;
}
