// ================================
// 📁 backend/routes/NewDrop/Thought.js
// ================================

import express from 'express';
import multer from 'multer';
import {
  createThoughtPost,
  getAllThoughts,
  getMyThoughtPosts,
  saveThought,
  getSavedThoughts,
  addCommentToThought,
  likeThought,
  getAllThoughtPosts,
  commentOnThought,
  getThoughtsByUserId,
  deleteThought,
  deleteThoughtComment  
} from '../../controller/NewDrop/Thought.js';
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

// ✅ Storage for thoughts (no file uploads for thoughts - text only)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = 'thought_files';
    return {
      folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'mov'],
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

router.get('/user/:userId', getThoughtsByUserId);
router.get('/all', getAllThoughts);
router.delete('/:thoughtId', protect, deleteThought);

router.post('/newThoughtDrop', protect, createThoughtPost);

router.get('/getNewThoughtDrop', protect, getAllThoughtPosts);
router.get('/mine', protect, getMyThoughtPosts);
router.post('/save/:thoughtId', protect, saveThought);
router.get('/saved', protect, getSavedThoughts);
router.post('/:thoughtId/like', protect, likeThought);
router.post('/comments/:thoughtId', protect, addCommentToThought);
router.delete('/comments/:thoughtId/:commentId', protect, deleteThoughtComment);

router.post('/upload/image', protect, imageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  res.json({ url: req.file.path });
});

export default router;