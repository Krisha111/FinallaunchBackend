// ================================
// 📁 backend/MiddleWare/Upload.js
// Multer configuration for file uploads
// Supports both images and videos for reels
// ================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Required for ES Modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define upload directory relative to backend folder
const uploadPath = path.join(__dirname, '../uploads');

// ✅ Ensure uploads folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`📁 Created uploads folder at ${uploadPath}`);
}

// ✅ Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(/\s+/g, '-')       // replace spaces with dashes
      .replace(/[^\w\-\.]/g, ''); // remove unsafe chars
    cb(null, `${timestamp}-${random}-${safeName}${ext}`);
  },
});

// ✅ Export configured multer instance
const upload = multer({ storage });

export default upload;
