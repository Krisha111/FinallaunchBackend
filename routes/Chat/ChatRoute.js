import express from 'express';
import { 
  searchUsers, 
  getMyChats, 
  getMessages, 
  sendMessage 
} from '../../controller/Chat/ChatController.js';
import { protect } from '../../MiddleWare/authMiddleware.js';

const router = express.Router();

router.get('/search-users', protect, searchUsers);
router.get('/my-chats', protect, getMyChats);
router.get('/messages/:userId', protect, getMessages);
router.post('/send', protect, sendMessage);

export default router;