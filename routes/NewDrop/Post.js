// ================================
// 📁 backend/routes/NewDrop/Post.js
// ================================

import express from 'express';
import multer from 'multer';
import {
  createPostPost,
  getAllPosts,
  getMyPostPosts,
  savePost,
  getSavedPosts,
  addCommentToPost,
  likePost,
  getAllPostPosts,
  commentOnPost,
  getPostsByUserId,
  deletePost,
  deletePostComment  
} from '../../controller/NewDrop/Post.js';
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

// ✅ Storage for posts (videos/images)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = file.fieldname === 'poster' ? 'post_posters' : 'post_files';
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
    resource_type: 'video',
    allowed_formats: ['mp3', 'm4a', 'wav', 'ogg', 'mp4', 'aac'],
  },
});

const upload = multer({ storage });
const audioUpload = multer({ storage: audioStorage });

// ================================
// Routes
// ================================

router.get('/user/:userId', getPostsByUserId);
router.get('/all', getAllPosts);
router.delete('/:postId', protect, deletePost);

router.post(
  '/createNewPostDrop',
  protect,
  upload.fields([
    { name: 'poster', maxCount: 1 },
    { name: 'postFiles', maxCount: 10 }
  ]),
  createPostPost
);

router.get('/getNewPostDrop', protect, getAllPostPosts);
router.get('/mine', protect, getMyPostPosts);
router.post('/save/:postId', protect, savePost);
router.get('/saved', protect, getSavedPosts);
router.post('/:postId/like', protect, likePost);
router.post('/comments/:postId', protect, addCommentToPost);
router.delete('/comments/:postId/:commentId', protect, deletePostComment);

router.post('/upload/image', protect, imageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  res.json({ url: req.file.path });
});

export default router;