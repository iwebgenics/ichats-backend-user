// src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";

// Configure storage: files will be stored in /var/www/html/ichats-uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/var/www/html/ichats-uploads/"); // absolute path to your uploads folder
  },
  filename: (req, file, cb) => {
    // Generate a unique file name: timestamp-originalname
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });
