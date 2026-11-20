import Profile from "../models/profile.model.js";

// GET /onboarding/role - Render Role Selection screen
export const getRolePage = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.userId });

    // If already fully onboarded, redirect home
    if (profile?.isOnboarded) {
      return res.redirect("/");
    }

    return res.render("onboarding/role", {
      user: req.user,
      currentRole: profile?.role || null,
    });
  } catch (error) {
    return res.redirect("/");
  }
};

// POST /api/onboarding/role - Save selected role (FOUNDER, JOINER, BOTH)
export const saveRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["FOUNDER", "JOINER", "BOTH"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role selected." });
    }

    // Upsert profile with selected role
    await Profile.findOneAndUpdate(
      { userId: req.user.userId },
      { userId: req.user.userId, role },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Role saved successfully.",
      nextStep: "/onboarding/profile",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /onboarding/profile - Render Profile Setup screen
export const getProfilePage = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.userId });

    if (!profile || !profile.role) {
      return res.redirect("/onboarding/role");
    }

    if (profile.isOnboarded) {
      return res.redirect("/");
    }

    return res.render("onboarding/profile", {
      user: req.user,
      role: profile.role,
    });
  } catch (error) {
    return res.redirect("/onboarding/role");
  }
};

// POST /api/onboarding/profile - Save Profile Details and Complete Onboarding
export const saveProfile = async (req, res) => {
  try {
    const { fullName, college, bio, startupName, stage, skills, year, branch, interests, lookingFor } = req.body;

    if (!fullName || !college) {
      return res.status(400).json({
        success: false,
        message: "Full Name and College are required.",
      });
    }

    const profile = await Profile.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    profile.fullName = fullName.trim();
    profile.college = college.trim();
    profile.bio = (bio || "").trim().slice(0, 280);
    profile.isOnboarded = true;

    if (year) profile.year = String(year).trim();
    if (branch) profile.branch = String(branch).trim();

    if (startupName) {
      if (!profile.founderDetails) profile.founderDetails = {};
      profile.founderDetails.startupName = startupName.trim();
    }
    if (stage) {
      if (!profile.founderDetails) profile.founderDetails = {};
      profile.founderDetails.stage = stage.trim();
    }
    if (skills) {
      const parsedSkills = Array.isArray(skills)
        ? skills
        : skills.split(",").map((s) => s.trim()).filter(Boolean);
      profile.skills = parsedSkills;
      if (!profile.joinerDetails) profile.joinerDetails = {};
      profile.joinerDetails.skills = parsedSkills;
    }
    if (interests) {
      profile.interests = Array.isArray(interests)
        ? interests
        : interests.split(",").map((i) => i.trim()).filter(Boolean);
    }
    if (lookingFor) {
      profile.lookingFor = Array.isArray(lookingFor)
        ? lookingFor
        : lookingFor.split(",").map((l) => l.trim()).filter(Boolean);
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Profile completed! Welcome to Begin.",
      nextStep: "/",
      profile,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};