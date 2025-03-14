import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js"; // Add this
import bcrypt from "bcryptjs";
// import cloudinary from "../lib/cloudinary.js";
import fs from "fs";
import path from "path";



export const signup = async (req, res) => {
  const { fullName, email, password, role } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role: role || "user", // Default to "user" if role is not provided
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
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// export const login = async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const isPasswordCorrect = await bcrypt.compare(password, user.password);
//     if (!isPasswordCorrect) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     // If role is empty, default to "admin"
//     let userRole = user.role;
//     if (!userRole || userRole.trim() === "") {
//       userRole = "admin";
//     }

//     // Generate token (assumes generateToken sets a cookie or similar)
//     generateToken(user._id, res);

//     // Return all relevant user info including role
//     res.status(200).json({
//       _id: user._id,
//       fullName: user.fullName,
//       email: user.email,
//       profilePic: user.profilePic,
//       role: userRole,
//     });
//   } catch (error) {
//     console.log("Error in login controller", error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };


export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Prevent admin from logging in
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
    });
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const logout = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const userId = req.user._id;

    // Find all messages to be deleted for this user
    const messagesToDelete = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    });

    // Define the absolute uploads directory
    const uploadsDir = "/var/www/html/ichats-uploads/";
    console.log("Logout started for user:", req.user._id);

    messagesToDelete.forEach((msg) => {
      console.log("Processing message ID:", msg._id, "image:", msg.image, "file:", msg.file);
      
      if (msg.image) {
        try {
          const filename = msg.image.split("/").pop();
          const filePath = path.join(uploadsDir, filename);
          fs.unlinkSync(filePath);
          console.log("Deleted image file:", filePath);
        } catch (err) {
          console.error("Failed to delete image file:", err);
        }
      }
      if (msg.file && msg.file.url) {
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
    });

    await Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }]
    });

    // Clear the JWT cookie
    res.cookie("jwt", "", { httpOnly: true, secure: true, expires: new Date(0) });

    res.status(200).json({ message: "Logged out successfully and messages/files deleted" });
  } catch (error) {
    console.log("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // Define the directory for profile pictures
    const uploadsDir = "/var/www/html/ichats-uploads/profile-pics/";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Remove any data URL prefix if present
    let base64Data = profilePic;
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (matches) {
      base64Data = matches[2];
    }

    // Generate a unique filename (you can adjust extension based on MIME type if needed)
    const fileName = `${Date.now()}-profile.png`;
    const filePath = path.join(uploadsDir, fileName);

    // Write the file to disk
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    // Construct the public URL for the profile picture
    const publicUrl = `https://chat.ichats.in/ichats-uploads/profile-pics/${fileName}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: publicUrl },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Fetch only users with role "user" and exclude the password field
    const users = await User.find({ role: "user" }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};