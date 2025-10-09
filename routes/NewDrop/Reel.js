import express from 'express';
import upload from '../../MiddleWare/Upload.js'; // multer setup
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
  getReelsByUserId
} from '../../controller/NewDrop/Reel.js';
import { protect } from '../../MiddleWare/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/reels/newReelDrop
 * @desc    Create a new reel
 * @access  Private
 */
router.get('/user/:userId', getReelsByUserId);
router.get("/all", getAllReels);
router.post(
  "/newReelDrop",
  protect,
  upload.fields([
    { name: "poster", maxCount: 1 },     // cover image
    { name: "reelFiles", maxCount: 10 }  // reel images/videos
  ]),
  createReelPost
);


router.get('/getNewReelDrop',protect, getAllReelPosts);

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
 * @route   POST /api/reels/comment/:reelId
 * @desc    Add a comment to a reel
 * @access  Public (or use protect if needed)
 */
router.post('/:reelId/like', protect,likeReel);

// router.post('/:reelId/comment', addCommentToReel);
router.post('/:reelId/comment', protect,addCommentToReel);
export default router;
