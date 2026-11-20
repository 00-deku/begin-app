import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  renderMyProfilePage,
  renderEditProfilePage,
  renderPublicProfilePage,
  getMyProfileApi,
  updateProfileApi,
  uploadAvatarApi,
  addPastWorkApi,
  deletePastWorkApi,
  updatePrivacyApi,
  getPublicProfileApi,
} from "../controllers/profile.controller.js";
import { requireAuth, requireOnboarded } from "../middlewares/auth.middleware.js";

const uploadsDir = path.resolve("./public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeExt = path.extname(file.originalname).toLowerCase();
    const fileName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

const router = Router();

// Page routes
router.get("/", requireAuth, requireOnboarded, renderMyProfilePage);
router.get("/me", requireAuth, requireOnboarded, renderMyProfilePage);
router.get("/edit", requireAuth, requireOnboarded, renderEditProfilePage);
router.get("/:id", requireAuth, requireOnboarded, renderPublicProfilePage);

// API routes for profile management
router.get("/api/me", requireAuth, getMyProfileApi);
router.put("/api/me", requireAuth, updateProfileApi);
router.post("/api/avatar", requireAuth, upload.single("avatar"), uploadAvatarApi);
router.post("/api/past-work", requireAuth, addPastWorkApi);
router.delete("/api/past-work/:workId", requireAuth, deletePastWorkApi);
router.put("/api/privacy", requireAuth, updatePrivacyApi);
router.get("/api/:id", requireAuth, getPublicProfileApi);

export default router;
