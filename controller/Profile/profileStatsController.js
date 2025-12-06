// src/controllers/ProfileStatsController.js
import Reel from '../../model/NewDrop/Reel.js';
import jwt from 'jsonwebtoken';
import User from '../../model/User.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// ===========================
// Authentication Middleware
// ===========================
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyErr) {
      console.error('❌ JWT verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Authentication error:', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// ===========================
// Get Profile Stats Controller
// ===========================
export const getProfileStats = async (req, res) => {
  try {
    const targetUserId = req.params?.id;

    if (!targetUserId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(String(targetUserId))) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // Count all content types
    const [regularReelCount, postCount, momentCount, thoughtCount] = await Promise.all([
      Reel.countDocuments({ user: targetUserId, type: "regular" }),
      Post.countDocuments({ user: targetUserId, type: "regular" }),
      Moment.countDocuments({ user: targetUserId, type: "regular" }),
      Thought.countDocuments({ user: targetUserId, type: "regular" })
    ]);

    return res.status(200).json({
      regularReelCount,
      postCount,
      momentCount,
      thoughtCount,
      userId: targetUserId,
    });
  } catch (error) {
    console.error("❌ Error fetching profile stats:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};

