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

// POST /api/onboarding/profile - Save Profile Details & Complete Onboarding
export const saveProfile = async (req, res) => {
  try {
    const { fullName, college, bio, startupName, stage, skills } = req.body;

    if (!fullName || !college) {
      return res.status(400).json({
        success: false,
        message: "Full Name and College are required.",
      });
    }

    const updateData = {
      fullName: fullName.trim(),
      college: college.trim(),
      bio: (bio || "").trim(),
      isOnboarded: true, // Mark onboarding complete!
    };

    if (startupName) {
      updateData["founderDetails.startupName"] = startupName.trim();
    }
    if (stage) {
      updateData["founderDetails.stage"] = stage.trim();
    }
    if (skills) {
      updateData["joinerDetails.skills"] = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateData },
      { new: true }
    );

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