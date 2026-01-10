// ================================
// 📁 backend/routes/NewDrop/Moment.js
// ================================

import express from 'express';
import multer from 'multer';
import {
  createMomentPost,
  getAllMoments,
  getMyMomentPosts,
  saveMoment,
  getSavedMoments,
  addCommentToMoment,
  likeMoment,
  getAllMomentPosts,
  commentOnMoment,
  getMomentsByUserId,
  deleteMoment,
  deleteMomentComment,  
  viewMoment,
  getMomentViewers,
  getUserMomentStreak
} from '../../controller/NewDrop/Moment.js';
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

// ✅ ADD IMAGE UPLOAD ROUTE
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'comment_images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  },
});

const imageUpload = multer({ storage: imageStorage });

// ✅ Storage for moments (videos/images)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = file.fieldname === 'momentPhotos' || file.fieldname === 'momentVideos' 
      ? 'moment_files' 
      : 'moment_posters';
    return {
      folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov', 'webp'],
    };
  },
});

// ✅ Storage for audio comments - FIXED VERSION
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'comment_audio',
    resource_type: 'video',
    allowed_formats: ['mp3', 'm4a', 'wav', 'ogg', 'mp4', 'aac'],
  },
});

const upload = multer({ storage });
const audioUpload = multer({ storage: audioStorage });

// ================================
// Routes
// ================================

router.get('/user/:userId', getMomentsByUserId);
router.get('/all', getAllMoments);
router.delete('/:momentId', protect, deleteMoment);
// ✅ ADD these routes after your existing routes
router.post('/:momentId/view', protect, viewMoment);
router.get('/:momentId/viewers', protect, getMomentViewers);
router.get('/streak/:userId', getUserMomentStreak);
router.post(
  '/newMomentDrop',
  protect,
  upload.fields([
    { name: 'momentPhotos', maxCount: 10 },
    { name: 'momentVideos', maxCount: 10 },
  ]),
  createMomentPost 
);

router.get('/getNewMomentDrop', protect, getAllMomentPosts);
router.get('/mine', protect, getMyMomentPosts);
router.post('/save/:momentId', protect, saveMoment);
router.get('/saved', protect, getSavedMoments);
router.post('/:momentId/like', protect, likeMoment);
router.post('/comments/:momentId', protect, addCommentToMoment);
router.delete('/comments/:momentId/:commentId', protect, deleteMomentComment);

router.post('/upload/image', protect, imageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  res.json({ url: req.file.path });
});

export default router;