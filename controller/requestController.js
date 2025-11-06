import Request from '../model/Request.js';
import User from '../model/User.js';
import Notification from '../model/Notification.js';

// Unbond
export const unbond = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { bonds: userId }
    });
    
    await User.findByIdAndUpdate(userId, {
      $pull: { bonds: currentUserId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(currentUserId.toString()).emit('bond_accepted');
      io.to(userId.toString()).emit('bond_accepted');
    }

    res.status(200).json({ success: true, message: 'Unbonded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unchose
export const unchose = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { chosen: userId }
    });
    
    await User.findByIdAndUpdate(userId, {
      $pull: { chosen: currentUserId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(currentUserId.toString()).emit('chosen_accepted');
      io.to(userId.toString()).emit('chosen_accepted');
    }

    res.status(200).json({ success: true, message: 'Unchosen successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Send bond request
export const sendBondRequest = async (req, res) => {

  
  try {
    const { recipientId } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.log('❌ User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const senderId = req.user._id;
    console.log('✅ senderId:', senderId);
    console.log('✅ recipientId:', recipientId);

    // Validate recipientId
    if (!recipientId) {
      console.log('❌ Recipient ID is missing');
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    // Check if trying to send request to self
    if (senderId.toString() === recipientId.toString()) {
      console.log('❌ Trying to send request to self');
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    console.log('🔍 Checking for existing request...');
    // Check if request already exists
    const existingRequest = await Request.findOne({
      sender: senderId,
      recipient: recipientId,
      type: 'bond',
      status: 'pending'
    });

    if (existingRequest) {
      console.log('⚠️ Request already exists:', existingRequest._id);
      return res.status(400).json({ message: 'Request already sent' });
    }

    console.log('🔍 Checking if already bonded...');
    // Check if already bonded
    const user = await User.findById(senderId);
    if (user.bonds && user.bonds.includes(recipientId)) {
      console.log('⚠️ Already bonded with this user');
      return res.status(400).json({ message: 'Already bonded with this user' });
    }

    console.log('✅ Creating new request...');
    const newRequest = new Request({
      sender: senderId,
      recipient: recipientId,
      type: 'bond',
      status: 'pending'
    });

    await newRequest.save();
    console.log('✅ Request saved:', newRequest._id);

    // Get sender info for notification
    const senderUser = await User.findById(senderId).select('name username');
    console.log('✅ Sender user:', senderUser);

    console.log('📬 Creating notification...');
    // Create notification for recipient
    await Notification.create({
      user: recipientId,
      type: 'bond_request',
      message: `${senderUser.name || senderUser.username} sent you a bond request`,
      sender: senderId
    });
    // ✅ ADD THESE LINES:
const io = req.app.get('io'); // Get socket.io instance
if (io) {
    if (io) {
  const socketData = {
    type: 'bond_request',
    from: senderUser.name || senderUser.username,
    senderId: senderId.toString(),
    message: `${senderUser.name || senderUser.username} sent you a bond request`,
    requestId: newRequest._id.toString() // ✅ ADD unique ID
  };
  
  console.log("📤 Emitting new_request to:", recipientId.toString());
  io.to(recipientId.toString()).emit('new_request', socketData);
}
  io.to(recipientId.toString()).emit('new_request', {
    type: 'bond_request',
    from: senderUser.name || senderUser.username,
    senderId: senderId.toString(),
    message: `${senderUser.name || senderUser.username} sent you a bond request`
  });
}
    console.log('✅ Notification created');

    console.log('✅ Bond request sent successfully');
    console.log('========================================\n');

    res.status(201).json({ 
      success: true,
      message: 'Bond request sent successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('❌ Send bond request error:', error);
    console.error('❌ Error stack:', error.stack);
    console.log('========================================\n');
    
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to send bond request'
    });
  }
};

export const sendSpecialFriendRequest = async (req, res) => {
  console.log('\n🎯 ========== SEND SPECIAL FRIEND REQUEST ==========');
  console.log('📦 req.body keys:', Object.keys(req.body));
  console.log('👤 req.user:', req.user ? { id: req.user._id, username: req.user.username } : 'NO USER');
  
  try {
    const { recipientId, image, caption } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.log('❌ User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const senderId = req.user._id;
    console.log('✅ senderId:', senderId);
    console.log('✅ recipientId:', recipientId);
    console.log('✅ caption length:', caption?.length || 0);
    console.log('✅ image length:', image?.length || 0);

    // Validate required fields
    if (!recipientId) {
      console.log('❌ Recipient ID is missing');
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    if (!image) {
      console.log('❌ Image is missing');
      return res.status(400).json({ message: 'Image is required for special friend request' });
    }

    if (!caption || caption.trim().length === 0) {
      console.log('❌ Caption is missing or empty');
      return res.status(400).json({ message: 'Caption is required for special friend request' });
    }

    if (caption.length > 500) {
      console.log('❌ Caption too long:', caption.length);
      return res.status(400).json({ message: 'Caption must be 500 characters or less' });
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

    // Create new request with image and caption
    const newRequest = new Request({
      sender: senderId,
      recipient: recipientId,
      type: 'special_friend',
      status: 'pending',
      image: image,
      caption: caption.trim()
    });

    await newRequest.save();

    const senderUser = await User.findById(senderId).select('name username');

    await Notification.create({
      user: recipientId,
      type: 'special_friend_request',
      message: `${senderUser.name || senderUser.username} sent you a special friend request`,
      sender: senderId,
      requestId: newRequest._id // ✅ Store request ID in notification
    });

    const io = req.app.get('io');
    if (io) {
      const socketData = {
        type: 'special_friend_request',
        from: senderUser.name || senderUser.username,
        senderId: senderId.toString(),
        message: `${senderUser.name || senderUser.username} sent you a special friend request`,
        requestId: newRequest._id.toString()
      };

      io.to(recipientId.toString()).emit('new_request', socketData);
    }

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

// ✅ NEW: Get full request details (for viewing image and caption)
export const getRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Request.findById(requestId)
      .populate('sender', 'name username profileImage')
      .populate('recipient', 'name username profileImage');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify user is either sender or recipient
    const userId = req.user._id.toString();
    if (request.sender._id.toString() !== userId && 
        request.recipient._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this request' });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    console.error('❌ Get request details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch request details'
    });
  }
};



// Get pending requests
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
// export const getSentRequests = async (req, res) => {
//   try {
//     const requests = await Request.find({
//       sender: req.user._id,
//       status: 'pending'
//     })
//     .populate('recipient', 'name username profileImage')
//     .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: requests.length,
//       requests
//     });
//   } catch (error) {
//     console.error('❌ Get sent requests error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: error.message || 'Failed to fetch sent requests'
//     });
//   }
// };
// Get sent requests
// Get sent requests
//------------------------------------------------------------
// export const getSentRequests = async (req, res) => {
//   try {
//     const requests = await Request.find({
//       sender: req.user._id,
//       // ✅ REMOVE status filter to get ALL requests (pending, accepted, rejected)
//       // Or specifically: status: { $in: ['pending', 'accepted'] }
//     })
//     .populate('recipient', 'name username profileImage')
//     .select('recipient type status createdAt image caption') // ✅ Include image and caption
//     .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: requests.length,
//       requests
//     });
//   } catch (error) {
//     console.error('❌ Get sent requests error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: error.message || 'Failed to fetch sent requests'
//     });
//   }
// };
//--------------------------------------------------------
// Get sent requests
export const getSentRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      sender: req.user._id,
      // ✅ Get all requests, not just pending
    })
    .populate('recipient', 'name username profileImage')
    .select('recipient type status createdAt image caption') // ✅ Include image and caption
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
// Get received accepted requests
export const getReceivedAcceptedRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      recipient: req.user._id,
      status: 'accepted',
      type: 'special_friend'
    })
    .populate('sender', 'name username profileImage')
    .select('sender type status createdAt image caption')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('❌ Get received accepted requests error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to fetch requests'
    });
  }
};
// ✅ NEW: Get received accepted requests
// export const getReceivedAcceptedRequests = async (req, res) => {
//   try {
//     const requests = await Request.find({
//       recipient: req.user._id,
//       status: 'accepted',
//       type: 'special_friend'
//     })
//     .populate('sender', 'name username profileImage')
//     .select('sender type status createdAt image caption') // ✅ Include image and caption
//     .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: requests.length,
//       requests
//     });
//   } catch (error) {
//     console.error('❌ Get received accepted requests error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: error.message || 'Failed to fetch requests'
//     });
//   }
// };
// Accept request
// Accept request
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

    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    if (request.status === 'accepted') {
      return res.status(400).json({ message: 'Request already accepted' });
    }

    request.status = 'accepted';
    await request.save();

    if (type === 'bond') {
      await User.findByIdAndUpdate(
        req.user._id, 
        { $addToSet: { bonds: request.sender } }
      );
      await User.findByIdAndUpdate(
        request.sender, 
        { $addToSet: { bonds: req.user._id } }
      );
      
      const io = req.app.get('io');
      if (io) {
        io.to(req.user._id.toString()).emit('bond_accepted', { userId: request.sender.toString() });
        io.to(request.sender.toString()).emit('bond_accepted', { userId: req.user._id.toString() });
      }
    } else if (type === 'special_friend') {
      await User.findByIdAndUpdate(
        req.user._id, 
        { $addToSet: { chosen: request.sender } }
      );
      await User.findByIdAndUpdate(
        request.sender, 
        { $addToSet: { chosen: req.user._id } }
      );
      
      const io = req.app.get('io');
      if (io) {
        io.to(req.user._id.toString()).emit('chosen_accepted', { userId: request.sender.toString() });
        io.to(request.sender.toString()).emit('chosen_accepted', { userId: req.user._id.toString() });
      }
    }

    const accepterUser = await User.findById(req.user._id).select('name username');

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

    if (request.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

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