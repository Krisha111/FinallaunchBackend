import express from 'express';
import { 
  generateAgoraToken, 
  initiateCall, 
  acceptCall, 
  rejectCall, 
  endCall 
} from '../../controller/requestController.js';
import verifyToken from '../../MiddleWare/verifyToken.js';
import { protect } from '../../MiddleWare/authMiddleware.js';

const router = express.Router();

router.post('/generate-token', protect, generateAgoraToken);
router.post('/initiate', protect, initiateCall);
router.post('/accept', protect, acceptCall);
router.post('/reject', protect, rejectCall);
router.post('/end', protect, endCall);

export default router;