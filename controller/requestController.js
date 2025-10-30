import Request from '../model/Request.js';
import User from '../model/User.js';
import Notification from '../model/notification.js';

// Send bond request
export const sendBondRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user._id;

    // Validate recipientId
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    // Check if trying to send request to self
    if (senderId.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    // Check if request already exists
    const existingRequest = await Request.findOne({
      sender: senderId,
      recipient: recipientId,
      type: 'bond',
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    // Check if already bonded
    const user = await User.findById(senderId);
    if (user.bonds && user.bonds.includes(recipientId)) {
      return res.status(400).json({ message: 'Already bonded with this user' });
    }

    const newRequest = new Request({
      sender: senderId,
      recipient: recipientId,
      type: 'bond',
      status: 'pending'
    });

    await newRequest.save();

    // Get sender info for notification
    const senderUser = await User.findById(senderId).select('name username');

    // Create notification for recipient
    await Notification.create({
      user: recipientId,
      type: 'bond_request',
      message: `${senderUser.name || senderUser.username} sent you a bond request`,
      sender: senderId
    });

    res.status(201).json({ 
      success: true,
      message: 'Bond request sent successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('❌ Send bond request error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to send bond request'
    });
  }
};

// Send special friend request
export const sendSpecialFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user._id;

    // Validate recipientId
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    // Check if trying to send request to self
    if (senderId.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    // Check if request already exists
    const existingRequest = await Request.findOne({
      sender: senderId,
      recipient: recipientId,
      type: 'special_friend',
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    // Check if already in chosen list
    const user = await User.findById(senderId);
    if (user.chosen && user.chosen.includes(recipientId)) {
      return res.status(400).json({ message: 'Already in special friends list' });
    }

    const newRequest = new Request({
      sender: senderId,
      recipient: recipientId,
      type: 'special_friend',
      status: 'pending'
    });

    await newRequest.save();

    // Get sender info for notification
    const senderUser = await User.findById(senderId).select('name username');

    // Create notification for recipient
    await Notification.create({
      user: recipientId,
      type: 'special_friend_request',
      message: `${senderUser.name || senderUser.username} sent you a special friend request`,
      sender: senderId
    });

    res.status(201).json({ 
      success: true,
      message: 'Special friend request sent successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('❌ Send special friend request error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to send special friend request'
    });
  }
};

// Get pending requests
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      recipient: req.user._id,
      status: 'pending'
    })
    .populate('sender', 'name username profileImage')
    .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error('❌ Get pending requests error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch requests'
    });
  }
};

// Get sent requests
export const getSentRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      sender: req.user._id,
      status: 'pending'
    })
    .populate('recipient', 'name username profileImage')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('❌ Get sent requests error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch sent requests'
    });
  }
};

// Accept request
export const acceptRequest = async (req, res) => {
  try {
    const { requestId, type } = req.body;

    if (!requestId || !type) {
      return res.status(400).json({ message: 'Request ID and type are required' });
    }

    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the request is for the current user
    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    // Check if already accepted
    if (request.status === 'accepted') {
      return res.status(400).json({ message: 'Request already accepted' });
    }

    // Update request status
    request.status = 'accepted';
    await request.save();

    // Update user relationships based on type
    if (type === 'bond') {
      await User.findByIdAndUpdate(
        req.user._id, 
        { $addToSet: { bonds: request.sender } }
      );
      await User.findByIdAndUpdate(
        request.sender, 
        { $addToSet: { bonds: req.user._id } }
      );
    } else if (type === 'special_friend') {
      await User.findByIdAndUpdate(
        req.user._id, 
        { $addToSet: { chosen: request.sender } }
      );
      await User.findByIdAndUpdate(
        request.sender, 
        { $addToSet: { chosen: req.user._id } }
      );
    }

    // Get accepter info for notification
    const accepterUser = await User.findById(req.user._id).select('name username');

    // Notify sender
    await Notification.create({
      user: request.sender,
      type: `${type}_accepted`,
      message: `${accepterUser.name || accepterUser.username} accepted your ${type === 'bond' ? 'bond' : 'special friend'} request`,
      sender: req.user._id
    });

    res.status(200).json({ 
      success: true,
      message: 'Request accepted successfully',
      request
    });
  } catch (error) {
    console.error('❌ Accept request error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to accept request'
    });
  }
};

// Reject request
export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the request is for the current user
    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    // Update request status
    request.status = 'rejected';
    await request.save();

    res.status(200).json({ 
      success: true,
      message: 'Request rejected successfully'
    });
  } catch (error) {
    console.error('❌ Reject request error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to reject request'
    });
  }
};

// Cancel sent request
export const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the request was sent by current user
    if (request.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    // Delete the request
    await Request.findByIdAndDelete(requestId);

    res.status(200).json({ 
      success: true,
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Cancel request error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to cancel request'
    });
  }
};