import Startup from "./models/startup.model.js";
import Profile from "../profiles/models/profile.model.js";
import Auth from "../auth/models/auth.model.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../../shared/errors/index.js";

/**
 * Service managing startup entity operations, stealth visibility enforcement,
 * team member invitations, milestone timelines, and ownership transfers.
 */

const VALID_STAGES = ["Idea", "Building MVP", "Launched", "Has users"];
const VALID_VISIBILITIES = ["PUBLIC", "STEALTH"];
const VALID_ROLE_TYPES = ["co-founder", "teammate", "short-term collaboration"];

function sanitizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createStartup(ownerId, data) {
  const { name, pitch, problem, solution, industryTags, stage, links, visibility } = data;

  if (!name || !name.trim()) {
    throw new BadRequestError("Startup name is required.");
  }

  const trimmedPitch = (pitch || "").trim();
  if (!trimmedPitch) {
    throw new BadRequestError("One-line pitch is required.");
  }
  if (trimmedPitch.length > 200) {
    throw new BadRequestError("Pitch cannot exceed 200 characters.");
  }

  const selectedStage = VALID_STAGES.includes(stage) ? stage : "Idea";
  const selectedVisibility = VALID_VISIBILITIES.includes(visibility) ? visibility : "PUBLIC";

  const startup = await Startup.create({
    name: name.trim(),
    pitch: trimmedPitch,
    problem: (problem || "").trim(),
    solution: (solution || "").trim(),
    industryTags: sanitizeTags(industryTags),
    stage: selectedStage,
    links: {
      website: String(links?.website || "").trim(),
      demo: String(links?.demo || "").trim(),
      pitchDeck: String(links?.pitchDeck || "").trim(),
      github: String(links?.github || "").trim(),
      other: String(links?.other || "").trim(),
    },
    ownerId,
    visibility: selectedVisibility,
    teamMembers: [
      {
        userId: ownerId,
        role: "Founder",
        joinedDate: new Date(),
      },
    ],
  });

  // Sync to founder's profile linkedStartups
  await Profile.findOneAndUpdate(
    { userId: ownerId },
    {
      $push: {
        linkedStartups: {
          name: startup.name,
          stage: startup.stage,
          role: "Founder",
          startupId: startup._id,
        },
      },
      $set: {
        "founderDetails.startupName": startup.name,
        "founderDetails.stage": startup.stage,
      },
    }
  );

  return startup;
}

export async function getStartupById(startupId, requesterUserId = null) {
  const startup = await Startup.findById(startupId)
    .populate("ownerId", "email")
    .populate("teamMembers.userId", "email");

  if (!startup || startup.isArchived) {
    return null;
  }

  const isOwner = requesterUserId && startup.ownerId?._id?.toString() === requesterUserId.toString();
  const isMember =
    isOwner ||
    Boolean(
      requesterUserId &&
        startup.teamMembers.some((m) => m.userId?._id?.toString() === requesterUserId.toString())
    );

  const startupObject = startup.toObject();
  startupObject.isOwner = Boolean(isOwner);
  startupObject.isMember = Boolean(isMember);

  // M3.4 Stealth mode: hide idea text from non-members while keeping roles and skills visible
  if (startupObject.visibility === "STEALTH" && !isMember) {
    startupObject.name = "Stealth Project";
    startupObject.pitch = "Project details are private while in stealth mode.";
    delete startupObject.problem;
    delete startupObject.solution;
    delete startupObject.links;
  }

  if (startupObject.milestones) {
    startupObject.milestones.sort((a, b) => new Date(b.date || b.completedDate) - new Date(a.date || a.completedDate));
  }

  return startupObject;
}

export async function listStartups(filter = {}, requesterUserId = null) {
  const query = { isArchived: false };

  if (filter.stage && VALID_STAGES.includes(filter.stage)) {
    query.stage = filter.stage;
  }

  if (filter.industry) {
    query.industryTags = { $in: [filter.industry] };
  }

  if (filter.ownerId) {
    query.ownerId = filter.ownerId;
  }

  const startups = await Startup.find(query)
    .populate("ownerId", "email")
    .sort({ createdAt: -1 });

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

export async function updateStartup(startupId, ownerId, updateData) {
  const startup = await Startup.findById(startupId);
  if (!startup || startup.isArchived) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== ownerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the startup owner can modify details.");
  }

  if (updateData.name !== undefined) {
    startup.name = String(updateData.name).trim();
  }

  if (updateData.pitch !== undefined) {
    const trimmedPitch = String(updateData.pitch).trim();
    if (trimmedPitch.length > 200) {
      throw new BadRequestError("Pitch cannot exceed 200 characters.");
    }
    startup.pitch = trimmedPitch;
  }

  if (updateData.problem !== undefined) {
    startup.problem = String(updateData.problem).trim();
  }

  if (updateData.solution !== undefined) {
    startup.solution = String(updateData.solution).trim();
  }

  if (updateData.industryTags !== undefined) {
    startup.industryTags = sanitizeTags(updateData.industryTags);
  }

  if (updateData.stage && VALID_STAGES.includes(updateData.stage)) {
    startup.stage = updateData.stage;
  }

  if (updateData.visibility && VALID_VISIBILITIES.includes(updateData.visibility)) {
    startup.visibility = updateData.visibility;
  }

  if (updateData.links) {
    startup.links = {
      website: String(updateData.links.website || startup.links?.website || "").trim(),
      demo: String(updateData.links.demo || startup.links?.demo || "").trim(),
      pitchDeck: String(updateData.links.pitchDeck || startup.links?.pitchDeck || "").trim(),
      github: String(updateData.links.github || startup.links?.github || "").trim(),
      other: String(updateData.links.other || startup.links?.other || "").trim(),
    };
  }

  await startup.save();
  return startup;
}

export async function inviteTeamMember(startupId, ownerId, { email, role }) {
  const startup = await Startup.findById(startupId);
  if (!startup || startup.isArchived) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== ownerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the startup owner can invite members.");
  }

  if (!email || !email.trim()) {
    throw new BadRequestError("Recipient email is required.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const alreadyInvited = startup.invitations.some(
    (inv) => inv.email === normalizedEmail && inv.status === "PENDING"
  );
  if (alreadyInvited) {
    throw new BadRequestError("An invitation has already been sent to this email.");
  }

  startup.invitations.push({
    email: normalizedEmail,
    role: (role || "Team Member").trim(),
    status: "PENDING",
    invitedAt: new Date(),
  });

  const targetUser = await Auth.findOne({ email: normalizedEmail });
  if (targetUser) {
    const isAlreadyMember = startup.teamMembers.some(
      (m) => m.userId.toString() === targetUser._id.toString()
    );
    if (!isAlreadyMember) {
      startup.teamMembers.push({
        userId: targetUser._id,
        role: (role || "Team Member").trim(),
        joinedDate: new Date(),
      });
      const lastInv = startup.invitations[startup.invitations.length - 1];
      if (lastInv) lastInv.status = "ACCEPTED";

      await Profile.findOneAndUpdate(
        { userId: targetUser._id },
        {
          $push: {
            linkedStartups: {
              name: startup.name,
              stage: startup.stage,
              role: role || "Team Member",
              startupId: startup._id,
            },
          },
        }
      );
    }
  }

  await startup.save();
  return startup;
}

export async function removeTeamMember(startupId, ownerId, targetUserId) {
  const startup = await Startup.findById(startupId);
  if (!startup || startup.isArchived) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== ownerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the startup owner can remove members.");
  }

  if (targetUserId.toString() === ownerId.toString()) {
    throw new BadRequestError("The founder cannot be removed from their own startup.");
  }

  startup.teamMembers = startup.teamMembers.filter(
    (m) => m.userId.toString() !== targetUserId.toString()
  );

  await Profile.findOneAndUpdate(
    { userId: targetUserId },
    { $pull: { linkedStartups: { startupId: startup._id } } }
  );

  await startup.save();
  return startup;
}

export async function addOpenRole(startupId, ownerId, roleData) {
  const startup = await Startup.findById(startupId);
  if (!startup || startup.isArchived) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== ownerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the startup owner can post open roles.");
  }

  const { title, skillsNeeded, commitmentHours, roleType, equityOrCreditNote } = roleData;
  if (!title || !title.trim()) {
    throw new BadRequestError("Role title is required.");
  }

  startup.openRoles.push({
    title: title.trim(),
    skillsNeeded: sanitizeTags(skillsNeeded),
    commitmentHours: Number(commitmentHours) || 10,
    roleType: VALID_ROLE_TYPES.includes(roleType) ? roleType : "teammate",
    equityOrCreditNote: (equityOrCreditNote || "").trim(),
    status: "OPEN",
    createdAt: new Date(),
  });

  await startup.save();
  return startup;
}

export async function removeOpenRole(startupId, ownerId, roleId) {
  const startup = await Startup.findById(startupId);
  if (!startup || startup.isArchived) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== ownerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the startup owner can manage open roles.");
  }

  startup.openRoles = startup.openRoles.filter(
    (r) => r._id.toString() !== roleId.toString()
  );

  await startup.save();
  return startup;
}

export async function addMilestone(startupId, ownerId, milestoneData) {
  const startup = await Startup.findById(startupId);
  if (!startup || startup.isArchived) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== ownerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the startup owner can add milestones.");
  }

  const { title, milestoneType, description, date } = milestoneData;
  if (!title || !title.trim()) {
    throw new BadRequestError("Milestone title is required.");
  }

  startup.milestones.push({
    title: title.trim(),
    milestoneType: milestoneType || "Custom update",
    description: (description || "").trim(),
    completedDate: date ? new Date(date) : new Date(),
  });

  await startup.save();
  return startup;
}

export async function transferOwnership(startupId, currentOwnerId, newOwnerId) {
  const startup = await Startup.findById(startupId);
  if (!startup || startup.isArchived) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== currentOwnerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the current owner can transfer ownership.");
  }

  const isMember = startup.teamMembers.some(
    (m) => m.userId.toString() === newOwnerId.toString()
  );
  if (!isMember) {
    throw new BadRequestError("Ownership can only be transferred to an active team member.");
  }

  startup.ownerId = newOwnerId;
  await startup.save();
  return startup;
}

export async function archiveStartup(startupId, ownerId) {
  const startup = await Startup.findById(startupId);
  if (!startup) {
    throw new NotFoundError("Startup not found.");
  }

  if (startup.ownerId.toString() !== ownerId.toString()) {
    throw new ForbiddenError("Unauthorized: only the owner can archive the startup.");
  }

  startup.isArchived = true;
  startup.archivedAt = new Date();
  await startup.save();
  return startup;
}
