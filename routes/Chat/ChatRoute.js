import express from 'express';
import { searchUsers } from '../../controller/Chat/ChatController.js';
import { protect } from '../../MiddleWare/authMiddleware.js';

const router = express.Router();

router.get('/search-users', authenticateToken, searchUsers);

export default router;