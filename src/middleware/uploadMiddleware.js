// src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";

// A helper function to sanitize file names:
const sanitizeFileName = (filename) => {
  // Replace spaces with underscores and remove any non-alphanumeric character except dot, dash, and underscore
  return filename.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/var/www/html/ichats-uploads/"); // absolute path to your uploads folder
  },
  filename: (req, file, cb) => {
    const sanitizedOriginalName = sanitizeFileName(file.originalname);
    const uniqueName = Date.now() + "-" + sanitizedOriginalName;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });
