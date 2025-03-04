import dotenv from "dotenv";
dotenv.config(); // ✅ Load .env variables first

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import groupRoutes from "./routes/group.route.js";
import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js"; // ✅ Importing app and server from socket.js

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();




// Allow requests from all origins (or specify your Electron app's origin)
app.use(cors({
  origin: '*', // Allow all origins (for testing)
  credentials: true,
}));


// ✅ Middleware Configuration
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));
app.use(cookieParser());

// ✅ CORS Setup - Allow Frontend Access
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);

// ✅ Serve Frontend in Production Mode
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// ✅ Default Route for Checking Server Status
app.get("/", (req, res) => {
  res.send("🚀 Server is running! API is live.");
});

// ✅ Start the Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT}`);
  connectDB(); // ✅ Ensure Database Connection
});
