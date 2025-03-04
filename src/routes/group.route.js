import express from "express";
import { addGroup,deleteGroup, updateGroupMembers, getAllGroups } from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create a new group
router.post("/", addGroup);
router.get("/", getAllGroups);


// Update group members (if needed)
router.put("/", updateGroupMembers);
router.delete("/:groupId", deleteGroup);


export default router;
