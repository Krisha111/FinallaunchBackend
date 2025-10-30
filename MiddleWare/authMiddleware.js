// MiddleWare/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../model/User.js'; // ✅ correct model

import dotenv from 'dotenv';
dotenv.config(); // ✅ Load environment variables from .env
export const protect = async (req, res, next) => {
  console.log('\n🔐 ========== AUTH MIDDLEWARE ==========');
  console.log('📍 Path:', req.path);
  console.log('🔐 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      // ✅ Extract token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Token extracted (first 20 chars):', token.substring(0, 20) + '...');

      // ✅ Decode token using secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded:', { id: decoded.id, username: decoded.username });

      // ✅ Attach user to request without password
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.log('❌ User not found in database');
        return res.status(401).json({ message: '❌ User not found' });
      }

      console.log('✅ User found:', { id: user._id, username: user.username });
      req.user = user;
      console.log('========================================\n');
      next();
    } catch (err) {
      console.error('❌ Token verification error:', err.message);
      console.log('========================================\n');
      return res.status(401).json({ message: '❌ Not authorized, token invalid' });
    }
  } else {
    console.log('❌ No authorization header or invalid format');
    console.log('========================================\n');
    return res.status(401).json({ message: '❌ No token provided' });
  }
};
// export const protect = async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith('Bearer ')
//   ) {
//     try {
//       // ✅ Extract token from header
//       token = req.headers.authorization.split(' ')[1];

//       // ✅ Decode token using secret
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       // ✅ Attach user to request without password
//       const user = await User.findById(decoded.id).select('-password');
//       if (!user) {
//         return res.status(401).json({ message: '❌ User not found' });
//       }

//       req.user = user;
//       next();
//     } catch (err) {
//       console.error('❌ Invalid or expired token:', err.message);
//       return res.status(401).json({ message: '❌ Not authorized, token invalid' });
//     }
//   } else {
//     return res.status(401).json({ message: '❌ No token provided' });
//   }
// };
