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
} from '../controller/requestController.js';

const router = express.Router();


router.post('/unbond', protect, unbond);
router.post('/unchose', protect, unchose);
/**
 * @route   POST /api/requests/send-bond
 * @desc    Send bond request
 * @access  Private
 */
router.post('/send-bond', protect, sendBondRequest);

/**
 * @route   POST /api/requests/send-special-friend
 * @desc    Send special friend request
 * @access  Private
 */
router.post('/send-special-friend', protect, sendSpecialFriendRequest);

/**
 * @route   GET /api/requests/pending
 * @desc    Get pending requests (received)
 * @access  Private
 */
router.get('/received-accepted', protect, getReceivedAcceptedRequests); 
router.get('/pending', protect, getPendingRequests);

/**
 * @route   GET /api/requests/sent
 * @desc    Get sent requests
 * @access  Private
 */
router.get('/sent', protect, getSentRequests);

/**
 * @route   POST /api/requests/accept
 * @desc    Accept a request
 * @access  Private
 */
router.post('/accept', protect, acceptRequest);

/**
 * @route   POST /api/requests/reject
 * @desc    Reject a request
 * @access  Private
 * 
 */
router.get('/:requestId', protect, getRequestDetails);
router.post('/reject', protect, rejectRequest);

/**
 * @route   POST /api/requests/cancel
 * @desc    Cancel sent request
 * @access  Private
 */
router.post('/cancel', protect, cancelRequest);

export default router;