import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import Group from "../models/group.model.js";
import cloudinary from "../lib/cloudinary.js";
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
    
      const uploadOptions = isImage
        ? {
            // For images, Cloudinary defaults to resource_type "image"
            public_id: file.name.replace(/\.[^/.]+$/, "") // remove extension; Cloudinary appends it automatically
          }
        : {
            resource_type: "raw", // For non-image files
            public_id: file.name.replace(/\.[^/.]+$/, "") // remove extension; Cloudinary appends it automatically
          };
    
      const uploadResponse = await cloudinary.uploader.upload(file.data, uploadOptions);
      fileUrl = uploadResponse.secure_url;
      fileType = file.type;
      fileName = file.name;
    }
    
    

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: isImage ? fileUrl : null,
      file: !isImage && fileUrl
        ? { 
            url: fileUrl, 
            type: fileType,  // You might consider renaming this key if you run into schema issues.
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
