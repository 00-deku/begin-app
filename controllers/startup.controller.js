import {
  createStartup,
  getStartupById,
  listStartups,
  updateStartup,
  inviteTeamMember,
  removeTeamMember,
  addOpenRole,
  removeOpenRole,
  addMilestone,
  transferOwnership,
  archiveStartup,
} from "../services/startup.service.js";

/**
 * Controller handling startup page rendering, REST endpoints,
 * stealth privacy mode, team member management, and milestone updates.
 */

export async function renderStartupListPage(req, res) {
  try {
    const startups = await listStartups(req.query, req.user?.userId);
    return res.render("startup/list", {
      user: res.locals.user,
      startups,
    });
  } catch (error) {
    return res.status(500).render("error", {
      message: error.message || "Failed to load startups.",
    });
  }
}

export async function renderCreateStartupPage(req, res) {
  return res.render("startup/create", {
    user: res.locals.user,
  });
}

export async function renderStartupDetailPage(req, res) {
  try {
    const startup = await getStartupById(req.params.id, req.user?.userId);
    if (!startup) {
      return res.status(404).render("error", {
        message: "Startup page not found or has been archived.",
      });
    }

    return res.render("startup/view", {
      user: res.locals.user,
      startup,
      isOwner: startup.isOwner,
      isMember: startup.isMember,
    });
  } catch (error) {
    return res.status(500).render("error", {
      message: error.message || "Failed to load startup details.",
    });
  }
}

export async function renderEditStartupPage(req, res) {
  try {
    const startup = await getStartupById(req.params.id, req.user?.userId);
    if (!startup || !startup.isOwner) {
      return res.status(403).render("error", {
        message: "Unauthorized: only the startup owner can edit this page.",
      });
    }

    return res.render("startup/edit", {
      user: res.locals.user,
      startup,
    });
  } catch (error) {
    return res.status(500).render("error", {
      message: error.message || "Failed to load startup editor.",
    });
  }
}

export async function createStartupApi(req, res) {
  try {
    const startup = await createStartup(req.user.userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Startup page created successfully.",
      startup,
      redirectUrl: `/startup/${startup._id}`,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function getStartupApi(req, res) {
  try {
    const startup = await getStartupById(req.params.id, req.user?.userId);
    if (!startup) {
      return res.status(404).json({ success: false, message: "Startup not found." });
    }
    return res.status(200).json({ success: true, startup });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function listStartupsApi(req, res) {
  try {
    const startups = await listStartups(req.query, req.user?.userId);
    return res.status(200).json({ success: true, startups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateStartupApi(req, res) {
  try {
    const updated = await updateStartup(req.params.id, req.user.userId, req.body);
    return res.status(200).json({
      success: true,
      message: "Startup updated successfully.",
      startup: updated,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function inviteMemberApi(req, res) {
  try {
    const { email, role } = req.body;
    const startup = await inviteTeamMember(req.params.id, req.user.userId, { email, role });
    return res.status(200).json({
      success: true,
      message: "Team member invitation sent.",
      startup,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function removeMemberApi(req, res) {
  try {
    const startup = await removeTeamMember(
      req.params.id,
      req.user.userId,
      req.params.memberUserId
    );
    return res.status(200).json({
      success: true,
      message: "Team member removed.",
      startup,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function addOpenRoleApi(req, res) {
  try {
    const startup = await addOpenRole(req.params.id, req.user.userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Open role added successfully.",
      openRoles: startup.openRoles,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function deleteOpenRoleApi(req, res) {
  try {
    const startup = await removeOpenRole(req.params.id, req.user.userId, req.params.roleId);
    return res.status(200).json({
      success: true,
      message: "Open role removed.",
      openRoles: startup.openRoles,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function addMilestoneApi(req, res) {
  try {
    const startup = await addMilestone(req.params.id, req.user.userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Milestone added successfully.",
      milestones: startup.milestones,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function transferOwnershipApi(req, res) {
  try {
    const { newOwnerId } = req.body;
    const startup = await transferOwnership(req.params.id, req.user.userId, newOwnerId);
    return res.status(200).json({
      success: true,
      message: "Ownership transferred successfully.",
      startup,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function archiveStartupApi(req, res) {
  try {
    const startup = await archiveStartup(req.params.id, req.user.userId);
    return res.status(200).json({
      success: true,
      message: "Startup archived successfully.",
      startup,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}
