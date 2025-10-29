// src/controllers/ProfileController.js - COMPLETE FILE WITH HTTPS SOLUTION
import User from "../../model/User.js";
import mongoose from "mongoose";
import axios from "axios";
import FormData from "form-data";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

// ✅ USE BASE_URL WITH HTTPS
const BASE_URL = process.env.BASE_URL || "https://finallaunchbackend.onrender.com";

// ✅ Force HTTPS in production - THIS FIXES THE ROOT CAUSE
const getSecureUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  
  // If it's a relative path, prepend BASE_URL
  let url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  
  // Force HTTPS
  url = url.replace(/^http:/, 'https:');
  
  console.log(`🔒 Converted URL: ${pathOrUrl} -> ${url}`);
  return url;
};

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
export const upload = multer({ storage });

// -------------------- Remove Background --------------------
export const removeBackground = async (req, res) => {
  try {
    const file = req.file; // comes from multer middleware
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const formData = new FormData();
    formData.append("image_file", fs.createReadStream(file.path));
    formData.append("size", "auto");

    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      formData,
      {
        headers: {
          "X-Api-Key": process.env.REMOVE_BG_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    res.set("Content-Type", "image/png");
    res.send(response.data);
  } catch (err) {
    console.error("RemoveBG API error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to remove background" });
  }
};

// -------------------- Update Profile Image --------------------
export const updateProfileImageById = async (req, res) => {
  try {
    let userId;
    let imageUrl;

    // 1️⃣ If image uploaded via Multer
    if (req.file) {
      userId = req.params.id || req.body.userId;
      imageUrl = getSecureUrl(`/uploads/${req.file.filename}`);
      console.log("🖼️ Profile Image URL (from file):", imageUrl);
    } 
    // 2️⃣ If frontend sends profileImage URL/base64
    else if (req.body.profileImage && req.body.userId) {
      userId = req.body.userId;
      imageUrl = getSecureUrl(req.body.profileImage);
      console.log("🖼️ Profile Image URL (from body):", imageUrl);
    } else {
      return res.status(400).json({ error: "Missing userId or profileImage" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    console.log("✅ Profile image updated for user:", userId);
    console.log("✅ Saved to DB:", imageUrl);
    
    res.json({ ...user.toObject(), profileImage: imageUrl });
  } catch (err) {
    console.error("Error updating profile image:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -------------------- Get Profile --------------------
export const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const userObj = user.toObject();
    
    // ✅ Force HTTPS on output
    if (userObj.profileImage) {
      userObj.profileImage = getSecureUrl(userObj.profileImage);
    }

    res.json(userObj);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Get Profile by ID --------------------
export const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(id)
      .select("-password -__v")
      .populate("reels");
      
    if (!user) return res.status(404).json({ error: "User not found" });

    const userObject = user.toObject();
    userObject.reelsCount = user.reels ? user.reels.length : 0;

    // ✅ Force HTTPS on output
    if (userObject.profileImage) {
      userObject.profileImage = getSecureUrl(userObject.profileImage);
    }

    console.log("🔍 Fetched profile:", userObject.username);
    console.log("🖼️ Profile Image URL:", userObject.profileImage);
console.log("🖼️ Profile Image URL being sent to frontenddddddd:", userObject.profileImage);

    res.json(userObject);

  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -------------------- Update Profile --------------------
export const updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    const { name, bio } = body;

    let imageUrl = body.profileImage;

    // ✅ Handle file upload
    if (req.file) {
      imageUrl = getSecureUrl(`/uploads/${req.file.filename}`);
      console.log("🖼️ New profile image uploaded:", imageUrl);
    } 
    // ✅ Convert any existing URL to HTTPS
    else if (imageUrl) {
      imageUrl = getSecureUrl(imageUrl);
      console.log("🔄 Converted existing URL:", imageUrl);
    }

    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(imageUrl !== undefined && { profileImage: imageUrl }),
      },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    const userObject = updatedUser.toObject();

    // ✅ Force HTTPS on output (safety check)
    if (userObject.profileImage) {
      userObject.profileImage = getSecureUrl(userObject.profileImage);
    }

    console.log("✅ Profile updated for:", req.params.username);
    console.log("🖼️ Final profile image URL:", userObject.profileImage);
    console.log("💾 Saved to DB:", imageUrl);

    res.json(userObject);

  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Delete Profile --------------------
export const deleteProfile = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ username: req.params.username });
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting profile:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Get All Users --------------------
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-__v");

    // ✅ Force HTTPS on all user profile images
    const usersWithFullUrls = users.map((u) => {
      const obj = u.toObject();
      if (obj.profileImage) {
        obj.profileImage = getSecureUrl(obj.profileImage);
      }
      return obj;
    });

    res.json(usersWithFullUrls);
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ error: err.message });
  }
};