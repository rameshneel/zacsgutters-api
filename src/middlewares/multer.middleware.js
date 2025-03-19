// src/middleware/multer.middleware.js
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Determine directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed image file types
const allowedImageTypes = [".jpg", ".jpeg", ".png"];

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "..", "public"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const originalExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedImageTypes.includes(originalExtension)) {
      return cb(new Error("Invalid image file type"), false);
    }
    const randomFilename = uniqueSuffix + originalExtension;
    cb(null, randomFilename);
  },
});

// Set file size limit (e.g., 5MB per file)
const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

// Filter image file types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedImageTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Export multer middleware for multiple image uploads
export const uploadMultiplePhotos = multer({
  storage,
  limits,
  fileFilter,
}).array("photos", 10); // Maximum of 10 images
