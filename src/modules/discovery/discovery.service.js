// TODO: replace with profileRepository once src/modules/profiles/profile.repository.js is created
import Profile from "../profiles/models/profile.model.js";
// TODO: replace with startupRepository once src/modules/startups/startup.repository.js is created
import Startup from "../startups/models/startup.model.js";
import followRepository from "./follow.repository.js";
import shortlistRepository from "./shortlist.repository.js";
import "../auth/models/auth.model.js";
import { escapeRegex } from "../../shared/utils/string.utils.js";
import { BadRequestError } from "../../shared/errors/index.js";

/**
 * Service managing member and startup discovery, keyword search across
 * names and skills, multi-criteria filtering, suggested matches,
 * social follow tracking, and private shortlisting.
 */

// M4.1: Member Directory with Multi-Criteria Filters
export async function searchMembers(query = "", filters = {}, requesterUserId = null) {
  const mongoQuery = { isOnboarded: true };

  // M4.3: Keyword search across member names, skills, and bio
  if (query && query.trim()) {
    const regex = new RegExp(escapeRegex(query.trim()), "i");
    mongoQuery.$or = [
      { fullName: regex },
      { skills: regex },
      { bio: regex },
      { lookingFor: regex },
    ];
  }

  // M4.1 Filter: Skill
  if (filters.skill && filters.skill.trim()) {
    mongoQuery.skills = { $regex: new RegExp(`^${escapeRegex(filters.skill.trim())}$`, "i") };
  }

  // M4.1 Filter: Academic Year
  if (filters.year && filters.year.trim()) {
    mongoQuery.year = filters.year.trim();
  }

  // M4.1 Filter: Branch / Major
  if (filters.branch && filters.branch.trim()) {
    mongoQuery.branch = { $regex: new RegExp(escapeRegex(filters.branch.trim()), "i") };
  }

  // M4.1 Filter: Availability status
  if (filters.availability && filters.availability.trim()) {
    mongoQuery.availabilityStatus = filters.availability.trim();
  }

  // M4.1 Filter: Looking-for tag
  if (filters.lookingFor && filters.lookingFor.trim()) {
    mongoQuery.lookingFor = { $regex: new RegExp(`^${escapeRegex(filters.lookingFor.trim())}$`, "i") };
  }

  const members = await Profile.find(mongoQuery)
    .populate("userId", "email role")
    .sort({ isBuilder: -1, profileCompletionPercentage: -1, createdAt: -1 });

  // Enforce privacy controls (M2.6) for non-owners
  return members.map((member) => {
    const isOwner = requesterUserId && member.userId?._id?.toString() === requesterUserId.toString();
    const obj = member.toObject();

    if (!isOwner) {
      if (obj.privacy?.hideYear) delete obj.year;
      if (obj.privacy?.hideBranch) delete obj.branch;
    }

    obj.canSendIntro = Boolean(obj.privacy?.allowIntroRequests !== false);
    obj.isOwner = Boolean(isOwner);
    return obj;
  });
}

// M4.2: Startup Directory with Multi-Criteria Filters
export async function searchStartups(query = "", filters = {}, requesterUserId = null) {
  const mongoQuery = { isArchived: false };

  // M4.3: Keyword search across startup names, pitch, and industry tags
  if (query && query.trim()) {
    const regex = new RegExp(escapeRegex(query.trim()), "i");
    mongoQuery.$or = [
      { name: regex },
      { pitch: regex },
      { industryTags: regex },
      { problem: regex },
      { "openRoles.title": regex },
      { "openRoles.skillsNeeded": regex },
    ];
  }

  // M4.2 Filter: Industry
  if (filters.industry && filters.industry.trim()) {
    mongoQuery.industryTags = { $regex: new RegExp(`^${escapeRegex(filters.industry.trim())}$`, "i") };
  }

  // M4.2 Filter: Stage
  if (filters.stage && filters.stage.trim()) {
    mongoQuery.stage = filters.stage.trim();
  }

  // M4.2 Filter: Has open roles
  if (filters.hasOpenRoles === "true" || filters.hasOpenRoles === true) {
    mongoQuery.openRoles = { $elemMatch: { status: "OPEN" } };
  }

  const startups = await Startup.find(mongoQuery)
    .populate("ownerId", "email")
    .sort({ createdAt: -1 });

  // Enforce stealth visibility (M3.4)
  return startups.map((startup) => {
    const isOwner = requesterUserId && startup.ownerId?._id?.toString() === requesterUserId.toString();
    const isMember =
      isOwner ||
      Boolean(
        requesterUserId &&
          startup.teamMembers.some((m) => m.userId?.toString() === requesterUserId.toString())
      );

    const obj = startup.toObject();
    obj.isOwner = Boolean(isOwner);
    obj.isMember = Boolean(isMember);

    if (obj.visibility === "STEALTH" && !isMember) {
      obj.name = "Stealth Project";
      obj.pitch = "Project details are private while in stealth mode.";
      delete obj.problem;
      delete obj.solution;
      delete obj.links;
    }

    return obj;
  });
}

// M4.3: Unified Keyword Search
export async function globalSearch(keyword, requesterUserId = null) {
  const trimmed = (keyword || "").trim();
  if (!trimmed) {
    return { members: [], startups: [] };
  }

  const [members, startups] = await Promise.all([
    searchMembers(trimmed, {}, requesterUserId),
    searchStartups(trimmed, {}, requesterUserId),
  ]);

  return { members, startups };
}

// M4.4: Suggested Matches (Rule-based complementary skills and shared interests)
export async function getSuggestedMatches(userId) {
  if (!userId) {
    return { recommendedMembers: [], recommendedStartups: [] };
  }

  const userProfile = await Profile.findOne({ userId });
  if (!userProfile) {
    return { recommendedMembers: [], recommendedStartups: [] };
  }

  const userSkills = (userProfile.skills || []).map((s) => s.toLowerCase());
  const userInterests = (userProfile.interests || []).map((i) => i.toLowerCase());
  const userLookingFor = (userProfile.lookingFor || []).map((l) => l.toLowerCase());

  const COMPLEMENTARY_MAP = {
    technical: ["ui/ux design", "product management", "marketing", "growth", "business development", "finance"],
    design: ["frontend development", "react", "full stack", "node.js", "python", "mobile development"],
    business: ["full stack development", "react", "node.js", "python", "ui/ux design", "machine learning"],
  };

  const isTechnical = userSkills.some((s) =>
    ["react", "node.js", "python", "javascript", "backend", "full stack", "frontend"].some((tech) => s.includes(tech))
  );
  const isDesigner = userSkills.some((s) => ["design", "ui", "ux", "figma"].some((d) => s.includes(d)));

  let targetSkills = [];
  if (isTechnical) {
    targetSkills = [...COMPLEMENTARY_MAP.technical];
  } else if (isDesigner) {
    targetSkills = [...COMPLEMENTARY_MAP.design];
  } else {
    targetSkills = [...COMPLEMENTARY_MAP.business];
  }

  // 1. Recommended Members: query all other onboarded members
  const candidateMembers = await Profile.find({
    userId: { $ne: userId },
    isOnboarded: true,
  }).populate("userId", "email role");

  const scoredMembers = candidateMembers.map((candidate) => {
    let score = 0;
    const reasons = [];

    const candSkills = (candidate.skills || []).map((s) => s.toLowerCase());
    const candInterests = (candidate.interests || []).map((i) => i.toLowerCase());

    const matchingCompSkills = candSkills.filter((s) =>
      targetSkills.some((target) => s.includes(target) || target.includes(s))
    );
    if (matchingCompSkills.length > 0) {
      score += matchingCompSkills.length * 3;
      reasons.push(`Complementary skill: ${candidate.skills.find((s) => matchingCompSkills.includes(s.toLowerCase()))}`);
    }

    if (userLookingFor.length > 0) {
      const lookingMatches = candSkills.filter((s) =>
        userLookingFor.some((looking) => s.includes(looking) || looking.includes(s))
      );
      if (lookingMatches.length > 0) {
        score += lookingMatches.length * 4;
        reasons.push(`Matches what you are looking for: ${lookingMatches.join(", ")}`);
      }
    }

    const sharedInterests = candInterests.filter((i) => userInterests.includes(i));
    if (sharedInterests.length > 0) {
      score += sharedInterests.length * 2;
      reasons.push(`Shared interest: ${sharedInterests[0]}`);
    }

    if (candidate.isBuilder) score += 2;
    if (candidate.availabilityStatus === "Open to join" || candidate.availabilityStatus === "Looking for co-founder") {
      score += 2;
    }

    const obj = candidate.toObject();
    if (obj.privacy?.hideYear) delete obj.year;
    if (obj.privacy?.hideBranch) delete obj.branch;

    obj.score = score;
    obj.matchReason = reasons[0] || "Active builder on campus";
    return obj;
  });

  scoredMembers.sort((a, b) => b.score - a.score || b.profileCompletionPercentage - a.profileCompletionPercentage);
  const recommendedMembers = scoredMembers.slice(0, 5);

  // 2. Recommended Startups: match startups with open roles fitting user's skills
  const candidateStartups = await Startup.find({
    ownerId: { $ne: userId },
    "teamMembers.userId": { $ne: userId },
    isArchived: false,
  }).populate("ownerId", "email");

  const scoredStartups = candidateStartups.map((startup) => {
    let score = 0;
    const reasons = [];

    const openRoles = (startup.openRoles || []).filter((r) => r.status === "OPEN");
    for (const role of openRoles) {
      const neededSkills = (role.skillsNeeded || []).map((s) => s.toLowerCase());
      const hasSkill = neededSkills.some((needed) =>
        userSkills.some((userSkill) => needed.includes(userSkill) || userSkill.includes(needed))
      );
      if (hasSkill) {
        score += 5;
        reasons.push(`Open role matches your skill: ${role.title}`);
        break;
      }
    }

    const industryTags = (startup.industryTags || []).map((t) => t.toLowerCase());
    const sharedIndustry = industryTags.filter((t) => userInterests.includes(t));
    if (sharedIndustry.length > 0) {
      score += 3;
      reasons.push(`Industry matches your interest: ${sharedIndustry[0]}`);
    }

    if (openRoles.length > 0) score += 2;

    const obj = startup.toObject();
    if (obj.visibility === "STEALTH") {
      obj.name = "Stealth Project";
      obj.pitch = "Project details are private while in stealth mode.";
      delete obj.problem;
      delete obj.solution;
      delete obj.links;
    }

    obj.score = score;
    obj.matchReason = reasons[0] || (openRoles.length > 0 ? "Actively recruiting team members" : "Active campus venture");
    return obj;
  });

  scoredStartups.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
  const recommendedStartups = scoredStartups.slice(0, 5);

  return { recommendedMembers, recommendedStartups };
}

// M4.5: Follow a Member or Startup
export async function toggleFollow(followerUserId, targetType, targetId) {
  if (!followerUserId || !targetType || !targetId) {
    throw new BadRequestError("followerUserId, targetType, and targetId are required.");
  }

  const existing = await followRepository.findOne({
    followerId: followerUserId,
    targetType,
    targetId,
  });

  if (existing) {
    await followRepository.deleteOne({ _id: existing._id });
    return { isFollowing: false };
  }

  await followRepository.create({
    followerId: followerUserId,
    targetType,
    targetId,
  });

  return { isFollowing: true };
}

export async function isFollowing(followerUserId, targetType, targetId) {
  if (!followerUserId) return false;
  const total = await followRepository.count({
    followerId: followerUserId,
    targetType,
    targetId,
  });
  return total > 0;
}

export async function getFollowingIds(followerUserId) {
  if (!followerUserId) return { memberIds: [], startupIds: [] };
  const follows = await followRepository.findMany(
    { followerId: followerUserId },
    { select: "targetType targetId" }
  );
  const memberIds = follows.filter((f) => f.targetType === "USER").map((f) => f.targetId.toString());
  const startupIds = follows.filter((f) => f.targetType === "STARTUP").map((f) => f.targetId.toString());
  return { memberIds, startupIds };
}

// M4.6: Private Shortlist
export async function toggleShortlist(userId, itemType, itemId, note = "") {
  if (!userId || !itemType || !itemId) {
    throw new BadRequestError("userId, itemType, and itemId are required.");
  }

  const existing = await shortlistRepository.findOne({
    userId,
    itemType,
    itemId,
  });

  if (existing) {
    await shortlistRepository.deleteOne({ _id: existing._id });
    return { isShortlisted: false };
  }

  await shortlistRepository.create({
    userId,
    itemType,
    itemId,
    note: (note || "").slice(0, 300),
  });

  return { isShortlisted: true };
}

export async function getShortlistIds(userId) {
  if (!userId) return { memberIds: [], startupIds: [] };
  const shortlists = await shortlistRepository.findMany(
    { userId },
    { select: "itemType itemId" }
  );
  const memberIds = shortlists.filter((s) => s.itemType === "USER").map((s) => s.itemId.toString());
  const startupIds = shortlists.filter((s) => s.itemType === "STARTUP").map((s) => s.itemId.toString());
  return { memberIds, startupIds };
}

export async function getShortlist(userId) {
  if (!userId) return { members: [], startups: [] };

  const entries = await shortlistRepository.findMany({ userId }, { sort: { createdAt: -1 } });
  const userEntryMap = new Map();
  const startupEntryMap = new Map();

  entries.forEach((e) => {
    if (e.itemType === "USER") userEntryMap.set(e.itemId.toString(), e);
    if (e.itemType === "STARTUP") startupEntryMap.set(e.itemId.toString(), e);
  });

  const memberIds = Array.from(userEntryMap.keys());
  const startupIds = Array.from(startupEntryMap.keys());

  const [rawMembers, rawStartups] = await Promise.all([
    Profile.find({ _id: { $in: memberIds } }).populate("userId", "email role"),
    Startup.find({ _id: { $in: startupIds }, isArchived: false }).populate("ownerId", "email"),
  ]);

  const members = rawMembers.map((member) => {
    const isOwner = member.userId?._id?.toString() === userId.toString();
    const obj = member.toObject();
    if (!isOwner) {
      if (obj.privacy?.hideYear) delete obj.year;
      if (obj.privacy?.hideBranch) delete obj.branch;
    }
    const entry = userEntryMap.get(member._id.toString());
    obj.shortlistNote = entry?.note || "";
    obj.shortlistedAt = entry?.createdAt;
    return obj;
  });

  const startups = rawStartups.map((startup) => {
    const isOwner = startup.ownerId?._id?.toString() === userId.toString();
    const isMember =
      isOwner ||
      Boolean(startup.teamMembers?.some((m) => m.userId?.toString() === userId.toString()));

    const obj = startup.toObject();
    if (obj.visibility === "STEALTH" && !isMember) {
      obj.name = "Stealth Project";
      obj.pitch = "Project details are private while in stealth mode.";
      delete obj.problem;
      delete obj.solution;
      delete obj.links;
    }
    const entry = startupEntryMap.get(startup._id.toString());
    obj.shortlistNote = entry?.note || "";
    obj.shortlistedAt = entry?.createdAt;
    return obj;
  });

  return { members, startups };
}
