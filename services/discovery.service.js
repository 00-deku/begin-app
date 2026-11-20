import Profile from "../models/profile.model.js";
import Startup from "../models/startup.model.js";
import "../models/auth.model.js";

/**
 * Service managing member and startup discovery, keyword search across
 * names and skills, and multi-criteria directory filtering.
 */

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

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
