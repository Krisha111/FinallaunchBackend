// routes/Profile/profileRoutes.js
import express from "express";
import { getProfile,togglePrivacy } from "../../controllers/Profile/profilePrivacyController.js";
import { protect } from "../../MiddleWare/authMiddleware.js";

const router = express.Router();

// GET /api/profile/:id
router.get("/:id/privacy", protect, getProfile);
router.put("/:id/privacy", protect, togglePrivacy);
export default router;
