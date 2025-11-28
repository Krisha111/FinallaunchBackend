// ================================
// 📁 backend/routes/NewDrop/Reel.js
// ================================

import express from 'express';
import multer from 'multer';
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
  deleteReel,
  deleteReelComment  
} from '../../controller/NewDrop/Reel.js';
import { protect } from '../../MiddleWare/authMiddleware.js';

const router = express.Router();

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Storage for reels (videos/images)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = file.fieldname === 'poster' ? 'reel_posters' : 'reel_videos';
    return {
      folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov'],
      transformation:
        file.fieldname === 'poster'
          ? [{ width: 1080, height: 1920, crop: 'limit' }]
          : [],
    };
  },
});

// ✅ Storage for audio comments - FIXED VERSION
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'comment_audio',
    resource_type: 'video', // ✅ Changed from 'auto' to 'video' (handles audio)
    allowed_formats: ['mp3', 'm4a', 'wav', 'ogg', 'mp4', 'aac'], // ✅ Added mp4 and aac
  },
});

const upload = multer({ storage });
const audioUpload = multer({ storage: audioStorage });

// ================================
// Routes
// ================================

router.get('/user/:userId', getReelsByUserId);
router.get('/all', getAllReels);
router.delete('/:reelId', protect, deleteReel);

router.post(
  '/newReelDrop',
  protect,
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'reelFiles', maxCount: 10 },
  ]),
  createReelPost
);

router.get('/getNewReelDrop', protect, getAllReelPosts);
router.get('/mine', protect, getMyReelPosts);
router.post('/save/:reelId', protect, saveReel);
router.get('/saved', protect, getSavedReels);
router.post('/:reelId/like', protect, likeReel);
router.post('/comments/:reelId', protect, addCommentToReel);
router.delete('/comments/:reelId/:commentId', protect, deleteReelComment);

// ✅ ADD THIS AUDIO UPLOAD ROUTE
router.post('/upload/audio', protect, audioUpload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }
  res.json({ url: req.file.path });
});

export default router;