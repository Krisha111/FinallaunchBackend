// ================================
// 📁 backend/routes/NewDrop/Reel.js (FINAL FIXED VERSION)
// ================================

import express from 'express';
import multer from 'multer'; // ✅ multer import
import {
  createReelPost,
  getAllReelPosts,
  getMyReelPosts,
  saveReel,
  getSavedReels,
  addCommentToReel,
  likeReel,
  getAllReels,
  commentOnReel,
  getReelsByUserId,
} from '../../controller/NewDrop/Reel.js';
import { protect } from '../../MiddleWare/authMiddleware.js';

const router = express.Router();

// ================================
// ✅ Multer setup: Temporary folder for uploads
// ================================
// const upload = multer({ dest: 'uploads/' }); // store files temporarily
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// storage setup
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = file.fieldname === 'poster' ? 'reel_posters' : 'reel_videos';
    return {
      folder,
      resource_type: 'auto', // auto-detect video/image
      allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov'],
      transformation:
        file.fieldname === 'poster'
          ? [{ width: 1080, height: 1920, crop: 'limit' }]
          : [],
    };
  },
});

const upload = multer({ storage }); // ✅ now uploads go to Cloudinary

// ================================
// Routes
// ================================

/**
 * @route   GET /api/reels/user/:userId
 * @desc    Get reels by specific user
 * @access  Public
 */
router.get('/user/:userId', getReelsByUserId);

/**
 * @route   GET /api/reels/all
 * @desc    Get all reels (public)
 * @access  Public
 */
router.get('/all', getAllReels);

/**
 * @route   POST /api/reels/newReelDrop
 * @desc    Create a new reel with both video/image and poster
 * @access  Private
 */
router.post(
  '/newReelDrop',
  protect,
  upload.fields([
    { name: 'poster', maxCount: 1 }, // cover image
    { name: 'reelFiles', maxCount: 10 }, // multiple video/image files
  ]),
  createReelPost // ✅ now req.body and req.files are populated
);

/**
 * @route   GET /api/reels/getNewReelDrop
 * @desc    Get all reels (authenticated)
 * @access  Private
 */
router.get('/getNewReelDrop', protect, getAllReelPosts);

/**
 * @route   GET /api/reels/mine
 * @desc    Get reels created by logged-in user
 * @access  Private
 */
router.get('/mine', protect, getMyReelPosts);

/**
 * @route   POST /api/reels/save/:reelId
 * @desc    Save a reel to user's saved list
 * @access  Private
 */
router.post('/save/:reelId', protect, saveReel);

/**
 * @route   GET /api/reels/saved
 * @desc    Get all saved reels for the logged-in user
 * @access  Private
 */
router.get('/saved', protect, getSavedReels);

/**
 * @route   POST /api/reels/:reelId/like
 * @desc    Like a reel
 * @access  Private
 */
router.post('/:reelId/like', protect, likeReel);

/**
 * @route   POST /api/reels/:reelId/comment
 * @desc    Add a comment to a reel
 * @access  Private
 */
router.post('/:reelId/comment', protect, addCommentToReel);

export default router;
