// src/routes/Profile/ProfileInformation.js

import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

import {
  getProfile,
  updateProfile,
  deleteProfile,
  getAllUsers,
  getProfileById,
  updateProfileImageById,
  removeBackground,
  getChosenList,
  getBondsList,
} from "../../controller/Profile/ProfileInformationController.js";

const router = express.Router();

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
const upload = multer({ storage });

// -------------------- Routes --------------------
// ✅ NEW routes
router.get("/:userId/chosen", getChosenList);
router.get("/:userId/bonds", getBondsList);
// Remove background
router.post("/remove-background", upload.single("image"), removeBackground);

// Get all users
router.get("/", getAllUsers);

// ⚠️ Order matters → byId BEFORE username
router.get("/byId/:id", getProfileById);

// Get profile by username
router.get("/:username", getProfile);

// Update profile (can include image via multipart/form-data)
router.put("/:username", upload.single("profileImage"), updateProfile);

// Delete profile
router.delete("/:username", deleteProfile);

// Update profile image directly (optional legacy route)
router.put("/image", upload.single("image"), updateProfileImageById);

export default router;
