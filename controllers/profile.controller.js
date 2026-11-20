import {
  getProfileByUserId,
  getPublicProfileById,
  updateProfile,
  addPastWork,
  removePastWork,
  updatePrivacySettings,
  updateAvatar,
} from "../services/profile.service.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

/**
 * Controller managing builder profile presentation and API endpoints.
 * Handles profile viewing, inline editing, badge verification, and privacy settings.
 */

export async function renderMyProfilePage(req, res) {
  try {
    const profile = await getProfileByUserId(req.user.userId);
    const completionData = calculateProfileCompletion(profile);

    return res.render("profile/view", {
      user: res.locals.user,
      profile,
      isOwner: true,
      completionData,
    });
  } catch (error) {
    return res.status(500).render("error", {
      message: error.message || "Failed to load profile.",
    });
  }
}

export async function renderEditProfilePage(req, res) {
  try {
    const profile = await getProfileByUserId(req.user.userId);
    const completionData = calculateProfileCompletion(profile);

    return res.render("profile/edit", {
      user: res.locals.user,
      profile,
      completionData,
    });
  } catch (error) {
    return res.status(500).render("error", {
      message: error.message || "Failed to load profile editor.",
    });
  }
}

export async function renderPublicProfilePage(req, res) {
  try {
    const profile = await getPublicProfileById(req.params.id, req.user?.userId);
    if (!profile) {
      return res.status(404).render("error", {
        message: "Profile not found.",
      });
    }

    const completionData = calculateProfileCompletion(profile);

    return res.render("profile/view", {
      user: res.locals.user,
      profile,
      isOwner: profile.isOwner,
      completionData,
    });
  } catch (error) {
    return res.status(500).render("error", {
      message: error.message || "Failed to load builder profile.",
    });
  }
}

export async function getMyProfileApi(req, res) {
  try {
    const profile = await getProfileByUserId(req.user.userId);
    const completionData = calculateProfileCompletion(profile);

    return res.status(200).json({
      success: true,
      profile,
      completionData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateProfileApi(req, res) {
  try {
    const updated = await updateProfile(req.user.userId, req.body);
    const completionData = calculateProfileCompletion(updated);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile: updated,
      completionData,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function uploadAvatarApi(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided.",
      });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const profile = await updateAvatar(req.user.userId, avatarUrl);

    return res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully.",
      avatarUrl,
      profile,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function addPastWorkApi(req, res) {
  try {
    const { title, url, linkType, description } = req.body;
    const profile = await addPastWork(req.user.userId, {
      title,
      url,
      linkType,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Past work added successfully.",
      pastWork: profile.pastWork,
      profile,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function deletePastWorkApi(req, res) {
  try {
    const profile = await removePastWork(req.user.userId, req.params.workId);

    return res.status(200).json({
      success: true,
      message: "Past work removed successfully.",
      pastWork: profile.pastWork,
      profile,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function updatePrivacyApi(req, res) {
  try {
    const profile = await updatePrivacySettings(req.user.userId, req.body);

    return res.status(200).json({
      success: true,
      message: "Privacy settings updated successfully.",
      privacy: profile.privacy,
      profile,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function getPublicProfileApi(req, res) {
  try {
    const profile = await getPublicProfileById(req.params.id, req.user?.userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
