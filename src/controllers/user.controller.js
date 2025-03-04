import User from "../models/user.model.js";

export const getAllUsersByRole = async (req, res) => {
    try {
      // Force filter: return only users with role "user"
      const users = await User.find({ role: "user" }).select("-password");
      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };