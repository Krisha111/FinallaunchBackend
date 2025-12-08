import express from 'express';
import { protect } from '../../MiddleWare/authMiddleware.js';
import {
  getUnopenedChats,
  getNewChats,
  getMemories,
  markChatAsOpened,
  sendMessage,
  getChatMessages
} from '../../controllers/chatController.js';

const router = express.Router();

router.use(protect);

router.get('/unopened', getUnopenedChats);
router.get('/new', getNewChats);
router.get('/memories', getMemories);
router.put('/:chatId/open', markChatAsOpened);
router.post('/send', sendMessage);
router.get('/messages/:otherUserId', getChatMessages);

export default router;