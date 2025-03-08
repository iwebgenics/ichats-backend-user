import fs from "fs";
import path from "path";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import Group from "../models/group.model.js";
// Remove cloudinary import if not used anymore
// import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Find all groups that the logged-in user is a member of
    const groups = await Group.find({ members: loggedInUserId }).populate("members", "-password");

    // Extract all unique members from these groups, excluding the logged-in user
    const uniqueMemberIds = new Set();
    groups.forEach(group => {
      group.members.forEach(member => {
        if (member._id.toString() !== loggedInUserId.toString()) {
          uniqueMemberIds.add(member._id.toString());
        }
      });
    });

    // Fetch users who are part of the extracted member list
    const users = await User.find({ _id: { $in: Array.from(uniqueMemberIds) } }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const sendMessage = async (req, res) => {
  try {
    const { text, file } = req.body;
    const senderId = req.user._id;
    const { id: receiverId } = req.params;

    let fileUrl = null;
    let isImage = false;
    let fileName = null;
    let fileType = null;

    if (file && file.data) {
      isImage = file.type.startsWith("image/");

      // Use an absolute path for uploads directory
      const uploadsDir = "/var/www/html/ichats-uploads/";

      // Ensure uploads directory exists (optional if you already created it manually)
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Remove any data URL prefix if present (e.g., "data:image/png;base64,")
      let base64Data = file.data;
      const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches) {
        base64Data = matches[2];
      }

      // Generate a unique filename
      fileName = `${Date.now()}-${file.name}`;
      fileType = file.type;

      // Write the file to the uploads directory
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      // Construct the public URL for the file
      fileUrl = `https://chat.ichats.in/ichats-uploads/${fileName}`;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: isImage ? fileUrl : null,
      file: !isImage && fileUrl
        ? { 
            url: fileUrl, 
            type: fileType,  
            name: fileName 
          }
        : null,
    });

    await newMessage.save();

    // Notify the receiver via sockets
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      io.to(receiverSocketId).emit("notifyUser", {
        message: "You have a new message!",
        senderId,
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};