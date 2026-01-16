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
  getRequestDetails,
  unbond,
  unchose,
  getReceivedAcceptedRequests,
  sendLikeNotification,
  sendCommentNotification,
  getNotifications,
  getUserRequests
} from '../controller/requestController.js';

const router = express.Router();

// ✅ NOTIFICATIONS ROUTES (specific routes first)
router.get('/notifications', protect, getNotifications);
router.post('/like', protect, sendLikeNotification);
router.post('/comment', protect, sendCommentNotification);

// ✅ BOND/UNCHOSE ROUTES
router.post('/unbond', protect, unbond);
router.post('/unchose', protect, unchose);

// ✅ REQUEST ROUTES
router.post('/send-bond', protect, sendBondRequest);
router.post('/send-special-friend', protect, sendSpecialFriendRequest);

// ✅ GET ROUTES - SPECIFIC ROUTES FIRST!
router.get('/received-accepted', protect, getReceivedAcceptedRequests);
router.get('/pending', protect, getPendingRequests);  // ⚠️ Must be before /:requestId
router.get('/sent', protect, getSentRequests);        // ⚠️ Must be before /:requestId

// ✅ ACTION ROUTES
router.post('/accept', protect, acceptRequest);
router.post('/reject', protect, rejectRequest);
router.post('/cancel', protect, cancelRequest);

// ✅ DYNAMIC ROUTES LAST
router.get('/user/:userId', protect, getUserRequests);  // ⚠️ Before /:requestId
router.get('/:requestId', protect, getRequestDetails);  // ⚠️ MUST BE LAST

export default router;