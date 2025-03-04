import express from "express";
import { getAllUsersByRole } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// This route is protected; only authenticated users can access it.
// It will return users filtered by role if the "role" query parameter is provided.
// For example, GET /api/users?role=user returns only users with role "user".
router.get("/", getAllUsersByRole);

export default router;
