import express from 'express';
import { 
  generateAgoraToken, 
  initiateCall, 
  acceptCall, 
  rejectCall, 
  endCall 
} from '../../controller/Call/CallController.js';
import verifyToken from '../../MiddleWare/verifyToken.js';

const router = express.Router();

router.post('/generate-token', verifyToken, generateAgoraToken);
router.post('/initiate', verifyToken, initiateCall);
router.post('/accept', verifyToken, acceptCall);
router.post('/reject', verifyToken, rejectCall);
router.post('/end', verifyToken, endCall);

export default router;