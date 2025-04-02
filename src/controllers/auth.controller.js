import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

/**
 * Sign up a new user.
 */
export const signup = async (req, res) => {
  const { fullName, email, password, role } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role: role || "user", // default "user" if role not provided
    });

    await newUser.save();

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
      role: newUser.role,
    });
  } catch (error) {
    console.log("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Log in a user (non-admin).
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Prevent admin from logging in here
    if (user.role === "admin") {
      return res.status(403).json({ message: "Access denied for admin users" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate token (optional)
    generateToken(user._id, res);

    // Return basic user info
    res.status(200).json({
      _id: user._id,
      email: user.email,
      fullName: user.fullName,        // (optional) if you want to return name too
      profilePic: user.profilePic,    // (optional) if you want to return pic too
      role: user.role,                // (optional)
    });
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Log out the user, remove user messages, and delete message files.
 */
export const logout = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const userId = req.user._id;

    // Find all messages to be deleted for this user
    const messagesToDelete = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    // Define the absolute path to your uploads directory
    const uploadsDir = "/var/www/html/ichats-uploads/";
    console.log("Logout started for user:", req.user._id);

    // Delete associated message images/files
    for (const msg of messagesToDelete) {
      console.log("Processing message ID:", msg._id, "image:", msg.image, "file:", msg.file);

      // Delete image if present
      if (msg.image) {
        try {
          const filename = msg.image.split("/").pop();
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted image file:", filePath);
          }
        } catch (err) {
          console.error("Failed to delete image file:", err);
        }
      }

      // Delete file attachment if present
      if (msg.file?.url) {
        try {
          const filename = msg.file.url.split("/").pop();
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted attachment file:", filePath);
          }
        } catch (err) {
          console.error("Failed to delete file attachment:", err);
        }
      }
    }

    // Remove all user messages from DB
    await Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    // Clear JWT cookie
    res.cookie("jwt", "", { httpOnly: true, secure: true, expires: new Date(0) });

    res.status(200).json({ message: "Logged out successfully and messages/files deleted" });
  } catch (error) {
    console.log("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update the user's profile, especially the profilePic.
 */
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // Path to your profile-pics folder
    const uploadsDir = "/var/www/html/ichats-uploads/profile-pics/";

    // Ensure the directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Remove "data:image/png;base64," prefix if present
    let base64Data = profilePic;
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches) {
      base64Data = matches[2];
    }

    // Generate a unique filename (e.g. 1742808640373-profile.png)
    const fileName = `${Date.now()}-profile.png`;
    const filePath = path.join(uploadsDir, fileName);

    // Write the decoded file to disk
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    // Construct the public URL
    const publicUrl = `https://user.ichats.in/ichats-uploads/profile-pics/${fileName}`;

    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: publicUrl },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error in updateProfile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Check if user is authenticated (based on your authMiddleware).
 */
export const checkAuth = (req, res) => {
  try {
    // If req.user was set by your authMiddleware, just return it
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get all "normal" users (role: 'user'), excluding their password.
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
