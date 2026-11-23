import Profile from "./models/profile.model.js";
import { calculateProfileCompletion } from "../../shared/helpers/profileCompletion.helper.js";
import { NotFoundError, BadRequestError } from "../../shared/errors/index.js";

/**
 * Profile service managing builder profile data, past work portfolios,
 * privacy controls, and badge awards.
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

  if (identifier && identifier.match(/^[0-9a-fA-F]{24}$/)) {
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
    throw new NotFoundError("Profile not found.");
  }

  const fields = [
    "fullName",
    "college",
    "year",
    "branch",
    "bio",
    "avatarUrl",
    "role",
    "weeklyHoursAvailable",
    "isOnboarded",
  ];

  fields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (typeof updateData[field] === "string") {
        profile[field] = updateData[field].trim();
      } else {
        profile[field] = updateData[field];
      }
    }
  });

  if (updateData.availabilityStatus) {
    if (VALID_AVAILABILITY.includes(updateData.availabilityStatus)) {
      profile.availabilityStatus = updateData.availabilityStatus;
    } else {
      throw new BadRequestError("Invalid availability status value.");
    }
  }

  if (updateData.skills !== undefined) {
    profile.skills = sanitizeStringList(updateData.skills);
  }

  if (updateData.interests !== undefined) {
    profile.interests = sanitizeStringList(updateData.interests);
  }

  if (updateData.lookingFor !== undefined) {
    profile.lookingFor = sanitizeStringList(updateData.lookingFor);
  }

  if (updateData.socialLinks) {
    profile.socialLinks = {
      linkedin: (updateData.socialLinks.linkedin || profile.socialLinks?.linkedin || "").trim(),
      github: (updateData.socialLinks.github || profile.socialLinks?.github || "").trim(),
      twitter: (updateData.socialLinks.twitter || profile.socialLinks?.twitter || "").trim(),
      portfolio: (updateData.socialLinks.portfolio || profile.socialLinks?.portfolio || "").trim(),
    };
  }

  if (updateData.founderDetails) {
    profile.founderDetails = {
      startupName: (updateData.founderDetails.startupName || profile.founderDetails?.startupName || "").trim(),
      stage: (updateData.founderDetails.stage || profile.founderDetails?.stage || "").trim(),
    };
  }

  if (updateData.privacy) {
    profile.privacy = {
      hideYear: updateData.privacy.hideYear !== undefined ? Boolean(updateData.privacy.hideYear) : profile.privacy?.hideYear,
      hideBranch: updateData.privacy.hideBranch !== undefined ? Boolean(updateData.privacy.hideBranch) : profile.privacy?.hideBranch,
      allowIntroRequests: updateData.privacy.allowIntroRequests !== undefined ? Boolean(updateData.privacy.allowIntroRequests) : profile.privacy?.allowIntroRequests,
    };
  }

  await profile.save();
  return profile;
}

export async function addPastWork(userId, { title, url, linkType, description }) {
  if (!title || !title.trim()) {
    throw new BadRequestError("Project title is required.");
  }
  if (!url || !url.trim()) {
    throw new BadRequestError("Project URL is required.");
  }

  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError("Profile not found.");
  }

  const selectedLinkType = linkType && VALID_LINK_TYPES.includes(linkType) ? linkType : "Portfolio";

  profile.pastWork.push({
    title: title.trim(),
    url: url.trim(),
    linkType: selectedLinkType,
    description: (description || "").trim(),
  });

  await profile.save();
  return profile;
}

export async function updateAvatar(userId, avatarUrl) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError("Profile not found.");
  }
  profile.avatarUrl = avatarUrl;
  await profile.save();
  return profile;
}

export async function deletePastWork(userId, pastWorkId) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError("Profile not found.");
  }

  profile.pastWork = profile.pastWork.filter(
    (item) => item._id.toString() !== pastWorkId.toString()
  );

  await profile.save();
  return profile;
}

export const removePastWork = deletePastWork;

export async function updatePrivacySettings(userId, privacyUpdates) {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError("Profile not found.");
  }

  profile.privacy = {
    hideYear: privacyUpdates.hideYear !== undefined ? Boolean(privacyUpdates.hideYear) : profile.privacy?.hideYear,
    hideBranch: privacyUpdates.hideBranch !== undefined ? Boolean(privacyUpdates.hideBranch) : profile.privacy?.hideBranch,
    allowIntroRequests: privacyUpdates.allowIntroRequests !== undefined ? Boolean(privacyUpdates.allowIntroRequests) : profile.privacy?.allowIntroRequests,
  };

  await profile.save();
  return profile.privacy;
}
