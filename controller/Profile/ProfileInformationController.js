// src/controllers/ProfileController.js
import User from "../../model/User.js";
import mongoose from "mongoose";
import axios from "axios";
import FormData from "form-data";
import multer from "multer";
import path from "path";
import fs from "fs";

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
      imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    } 
    // 2️⃣ If frontend sends profileImage URL/base64
    else if (req.body.profileImage && req.body.userId) {
      userId = req.body.userId;
      imageUrl = req.body.profileImage;
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
    if (userObj.profileImage && userObj.profileImage.startsWith("/uploads")) {
      userObj.profileImage = `${req.protocol}://${req.get("host")}${userObj.profileImage}`;
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
      .populate("reels"); // optional

    if (!user) return res.status(404).json({ error: "User not found" });

    const userObject = user.toObject();
    userObject.reelsCount = user.reels ? user.reels.length : 0;

    if (userObject.profileImage && userObject.profileImage.startsWith("/uploads")) {
      userObject.profileImage = `${req.protocol}://${req.get("host")}${userObject.profileImage}`;
    }

    res.json(userObject);

  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -------------------- Update Profile --------------------
// -------------------- Update Profile --------------------
export const updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    const { name, bio } = body;

    let imageUrl = body.profileImage;

    // ✅ If image uploaded via Multer (file:// or blob:)
    if (req.file) {
      imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    } 
    // ✅ If frontend sent JSON with existing url
    else if (imageUrl?.startsWith("/uploads")) {
      imageUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;
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

// Convert to plain object
const userObject = updatedUser.toObject();

// Always ensure profileImage is full URL
if (userObject.profileImage && userObject.profileImage.startsWith("/uploads")) {
  userObject.profileImage = `${req.protocol}://${req.get("host")}${userObject.profileImage}`;
}



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

    const usersWithFullUrls = users.map((u) => {
      const obj = u.toObject();
      if (obj.profileImage && obj.profileImage.startsWith("/uploads")) {
        obj.profileImage = `${req.protocol}://${req.get("host")}${obj.profileImage}`;
      }
      return obj;
    });

    res.json(usersWithFullUrls);
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ error: err.message });
  }
};
