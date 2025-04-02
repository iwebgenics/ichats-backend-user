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







// ✅ Middleware Configuration
app.use(express.json({ limit: "1024mb" }));           // Allow up to 1GB JSON payload
app.use(express.urlencoded({ limit: "1024mb", extended: true }));

app.use(cookieParser());

// ✅ CORS Setup - Allow Frontend Access
// app.use(
//   cors({
//     origin: "https://user.ichats.in", // EXACT match, no trailing slash
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: ["https://user.ichats.in", "http://localhost:5173","http://10.0.2.2:5001"], // Array of allowed origins
    credentials: true, // Allow sending cookies and authentication headers
  })
); 

app.use(express.json());


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
