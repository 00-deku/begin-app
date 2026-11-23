import multer from "multer";
import path from "path";
import fs from "fs";
import config from "../../config/env.js";

/**
 * Storage infrastructure service configuring Multer disk storage,
 * dynamic upload directory resolution, and mime-type filters.
 */

const uploadsDir = path.resolve("./public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const createDiskUpload = ({
  destination = uploadsDir,
  prefix = "file",
  maxSizeBytes = config.uploads.maxFileSizeBytes,
  allowedMimePrefix = "image/",
} = {}) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destination);
    },
    filename: function (req, file, cb) {
      const safeExt = path.extname(file.originalname).toLowerCase();
      const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`;
      cb(null, fileName);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, cb) => {
      if (!allowedMimePrefix || file.mimetype.startsWith(allowedMimePrefix)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${allowedMimePrefix} files are allowed.`));
      }
    },
  });
};

export const avatarUpload = createDiskUpload({
  prefix: "avatar",
  maxSizeBytes: config.uploads.maxFileSizeBytes,
  allowedMimePrefix: "image/",
});

export const postCoverUpload = createDiskUpload({
  prefix: "post",
  maxSizeBytes: config.uploads.maxFileSizeBytes,
  allowedMimePrefix: "image/",
});
