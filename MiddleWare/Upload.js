// ================================
// 📁 backend/MiddleWare/Upload.js
// Multer configuration for file uploads (images/videos)
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

    // Get extension safely
    const ext = path.extname(file.originalname) || '';

    // Sanitize the original filename (without extension)
    const baseName = path.basename(file.originalname, ext)
      .replace(/\s+/g, '-')      // Replace spaces
      .replace(/[^\w\-]/g, '');  // Remove special characters

    // ✅ Create final filename
    const finalName = `${timestamp}-${random}-${baseName}${ext}`;
    cb(null, finalName);
  },
});

// ✅ Export configured multer instance
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max (optional)
});

export default upload;
