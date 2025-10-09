// server/middleware/verifyToken.js
import jwt from 'jsonwebtoken';

export default function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = verified; // attach user payload to request
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
}
