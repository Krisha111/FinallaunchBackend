import express from 'express';
import { 
  searchUsers, 
  getMyChats, 
  getMessages, 
  sendMessage ,
  getNewChats,
  markChatAsOpened
} from '../../controller/Chat/ChatController.js';
import { protect } from '../../MiddleWare/authMiddleware.js';

const router = express.Router();

router.get('/search-users', protect, searchUsers);
router.get('/my-chats', protect, getMyChats);
router.get('/messages/:userId', protect, getMessages);
router.post('/send', protect, sendMessage);
router.get('/new-chats', protect, getNewChats);
router.post('/mark-opened', protect, markChatAsOpened);

export default router;