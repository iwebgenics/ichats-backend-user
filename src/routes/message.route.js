// src/routes/message.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Get sidebar users and messages remain the same
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

// Use Multer middleware to accept one file in the "file" field
router.post("/send/:id", protectRoute, upload.single("file"), sendMessage);

export default router;
