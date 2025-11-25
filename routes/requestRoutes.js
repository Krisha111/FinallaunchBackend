import express from 'express';
import { protect } from '../MiddleWare/authMiddleware.js';
import {
  sendBondRequest,
  sendSpecialFriendRequest,
  getPendingRequests,
  getSentRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getRequestDetails // ✅ NEW
  ,unbond, unchose, 
  getReceivedAcceptedRequests, // ✅ ADD THIS
  sendLikeNotification,
  sendCommentNotification,
  getNotifications
} from '../controller/requestController.js';
const router = express.Router();

// ✅ NOTIFICATIONS ROUTES (Keep at top)
router.get('/notifications', protect, getNotifications);
router.post('/like', protect, sendLikeNotification);
router.post('/comment', protect, sendCommentNotification);

// ✅ BOND/UNCHOSE ROUTES
router.post('/unbond', protect, unbond);
router.post('/unchose', protect, unchose);

// ✅ REQUEST ROUTES
router.post('/send-bond', protect, sendBondRequest);
router.post('/send-special-friend', protect, sendSpecialFriendRequest);

// ✅ GET ROUTES
router.get('/received-accepted', protect, getReceivedAcceptedRequests); 
router.get('/pending', protect, getPendingRequests);
router.get('/sent', protect, getSentRequests);

// ✅ ACTION ROUTES
router.post('/accept', protect, acceptRequest);
router.post('/reject', protect, rejectRequest);
router.post('/cancel', protect, cancelRequest);

// ✅ IMPORTANT: Put dynamic route /:requestId LAST
router.get('/:requestId', protect, getRequestDetails);

export default router;