// ============================================================================
// 📁 backend/controllers/requestNotificationController.js
// FULL FIXED VERSION — NO CODE SKIPPED
// Cleaned, merged, optimized, socket events corrected
// ============================================================================

import Request from "../model/Request.js";
import User from "../model/User.js";
import Notification from "../model/Notification.js";


// ============================================================================
// ✅ GET ALL NOTIFICATIONS
// ============================================================================
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ user: userId })
      .populate("sender", "name username profileImage")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("❌ Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch notifications",
    });
  }
};


// ============================================================================
// ✅ SEND LIKE NOTIFICATION
// ============================================================================
export const sendLikeNotification = async (req, res) => {
  console.log("\n🔔 SEND LIKE NOTIFICATION");
  try {
    const { postId, postOwnerId } = req.body;
    const likerId = req.user._id;

    if (likerId.toString() === postOwnerId.toString()) {
      return res.status(200).json({ message: "Self-like, no notification sent" });
    }

    const liker = await User.findById(likerId).select("name username");

    const notification = await Notification.create({
      user: postOwnerId,
      type: "post_like",
      message: `${liker.name || liker.username} liked your post`,
      sender: likerId,
      postId,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(postOwnerId.toString()).emit("new_notification", {
        type: "post_like",
        from: liker.name || liker.username,
        senderId: likerId.toString(),
        message: `${liker.name || liker.username} liked your post`,
        postId,
        timestamp: Date.now(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification sent",
      notificationId: notification._id,
    });
  } catch (error) {
    console.error("❌ Send like notification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ SEND COMMENT NOTIFICATION
// ============================================================================
export const sendCommentNotification = async (req, res) => {
  console.log("\n💬 SEND COMMENT NOTIFICATION");
  try {
    const { postId, postOwnerId, commentText } = req.body;
    const commenterId = req.user._id;

    if (commenterId.toString() === postOwnerId.toString()) {
      return res.status(200).json({ message: "Self-comment, no notification sent" });
    }

    const commenter = await User.findById(commenterId).select("name username");

    await Notification.create({
      user: postOwnerId,
      type: "post_comment",
      message: `${commenter.name || commenter.username} commented on your post`,
      sender: commenterId,
      postId,
    });

    const io = req.app.get("io");
    if (io) {
      const preview =
        commentText.length > 50
          ? commentText.substring(0, 50) + "..."
          : commentText;

      io.to(postOwnerId.toString()).emit("new_notification", {
        type: "post_comment",
        from: commenter.name || commenter.username,
        senderId: commenterId.toString(),
        message: `${commenter.name || commenter.username} commented: ${preview}`,
        postId,
        timestamp: Date.now(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification sent",
    });
  } catch (error) {
    console.error("❌ Send comment notification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ GET RECEIVED ACCEPTED REQUESTS
// ============================================================================
export const getReceivedAcceptedRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const acceptedRequests = await Request.find({
      recipient: userId,
      status: "accepted",
    })
      .populate("sender", "name username profileImage")
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, requests: acceptedRequests });
  } catch (error) {
    console.error("❌ Get received accepted requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch accepted requests",
    });
  }
};


// ============================================================================
// ✅ GET SENT REQUESTS
// ============================================================================
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const sentRequests = await Request.find({ sender: userId })
      .populate("recipient", "name username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests: sentRequests });
  } catch (error) {
    console.error("❌ Get sent requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sent requests",
    });
  }
};


// ============================================================================
// ✅ UNBOND
// ============================================================================
export const unbond = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    await User.findByIdAndUpdate(currentUserId, { $pull: { bonds: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { bonds: currentUserId } });

    const io = req.app.get("io");
    if (io) {
      io.to(currentUserId.toString()).emit("bond_accepted");
      io.to(userId.toString()).emit("bond_accepted");
    }

    res.status(200).json({ success: true, message: "Unbonded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ UNCHOOSE
// ============================================================================
export const unchose = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    await User.findByIdAndUpdate(currentUserId, { $pull: { chosen: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { chosen: currentUserId } });

    const io = req.app.get("io");
    if (io) {
      io.to(currentUserId.toString()).emit("chosen_accepted");
      io.to(userId.toString()).emit("chosen_accepted");
    }

    res.status(200).json({ success: true, message: "Unchosen successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ SEND BOND REQUEST
// ============================================================================
export const sendBondRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    const existingRequest = await Request.findOne({
      sender: senderId,
      recipient: recipientId,
      type: "bond",
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const user = await User.findById(senderId);
    if (user.bonds.includes(recipientId)) {
      return res.status(400).json({ message: "Already bonded" });
    }

    const newRequest = await Request.create({
      sender: senderId,
      recipient: recipientId,
      type: "bond",
      status: "pending",
    });

    const senderUser = await User.findById(senderId).select("name username");

    await Notification.create({
      user: recipientId,
      type: "bond_request",
      message: `${senderUser.name || senderUser.username} sent you a bond request`,
      sender: senderId,
      requestId: newRequest._id,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(recipientId.toString()).emit("new_request", {
        type: "bond_request",
        from: senderUser.name || senderUser.username,
        senderId: senderId.toString(),
        message: `${senderUser.name || senderUser.username} sent you a bond request`,
        requestId: newRequest._id.toString(),
      });
    }

    res.status(201).json({
      success: true,
      message: "Bond request sent successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("❌ Send bond request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ SEND SPECIAL FRIEND REQUEST
// ============================================================================
export const sendSpecialFriendRequest = async (req, res) => {
  try {
    const { recipientId, image, caption } = req.body;
    const senderId = req.user._id;

    if (!recipientId || !image || !caption?.trim()) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (caption.length > 500) {
      return res.status(400).json({ message: "Caption must be 500 characters max" });
    }

    if (senderId.toString() === recipientId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    const existingRequest = await Request.findOne({
      sender: senderId,
      recipient: recipientId,
      type: "special_friend",
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const user = await User.findById(senderId);
    if (user.chosen.includes(recipientId)) {
      return res.status(400).json({ message: "Already a special friend" });
    }

    const newRequest = await Request.create({
      sender: senderId,
      recipient: recipientId,
      type: "special_friend",
      status: "pending",
      image,
      caption: caption.trim(),
    });

    const senderUser = await User.findById(senderId).select("name username");

    await Notification.create({
      user: recipientId,
      type: "special_friend_request",
      message: `${senderUser.name || senderUser.username} sent you a special friend request`,
      sender: senderId,
      requestId: newRequest._id,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(recipientId.toString()).emit("new_request", {
        type: "special_friend_request",
        from: senderUser.name || senderUser.username,
        senderId: senderId.toString(),
        message: `${senderUser.name || senderUser.username} sent you a special friend request`,
        requestId: newRequest._id.toString(),
      });
    }

    res.status(201).json({
      success: true,
      message: "Special friend request sent successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("❌ Send special friend request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ GET REQUEST DETAILS
// ============================================================================
export const getRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Request.findById(requestId)
      .populate("sender", "name username profileImage")
      .populate("recipient", "name username profileImage");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const userId = req.user._id.toString();
    if (
      request.sender._id.toString() !== userId &&
      request.recipient._id.toString() !== userId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json({ success: true, request });
  } catch (error) {
    console.error("❌ Get request details error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ GET PENDING REQUESTS
// ============================================================================
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await Request.find({
      recipient: userId,
      status: "pending",
      type: { $in: ["bond", "special_friend"] },
    })
      .populate("sender", "name username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("❌ Get pending requests error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ ACCEPT REQUEST
// ============================================================================
export const acceptRequest = async (req, res) => {
  try {
    const { requestId, type } = req.body;

    if (!requestId || !type) {
      return res.status(400).json({ message: "Request ID and type required" });
    }

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (request.status === "accepted") {
      return res.status(400).json({ message: "Already accepted" });
    }

    request.status = "accepted";
    await request.save();

    if (type === "bond") {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { bonds: request.sender } });
      await User.findByIdAndUpdate(request.sender, { $addToSet: { bonds: req.user._id } });
    }

    if (type === "special_friend") {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { chosen: request.sender } });
      await User.findByIdAndUpdate(request.sender, { $addToSet: { chosen: req.user._id } });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit(`${type}_accepted`, {
        userId: request.sender.toString(),
      });
      io.to(request.sender.toString()).emit(`${type}_accepted`, {
        userId: req.user._id.toString(),
      });
    }

    const accepterUser = await User.findById(req.user._id).select("name username");

    await Notification.create({
      user: request.sender,
      type: `${type}_accepted`,
      message: `${accepterUser.name || accepterUser.username} accepted your request`,
      sender: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "Request accepted successfully",
      request,
    });
  } catch (error) {
    console.error("❌ Accept request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ REJECT REQUEST
// ============================================================================
export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Request ID required" });
    }

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "rejected";
    await request.save();

    res.status(200).json({ success: true, message: "Request rejected successfully" });
  } catch (error) {
    console.error("❌ Reject request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// ✅ CANCEL YOUR OWN REQUEST
// ============================================================================
export const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Request ID required" });
    }

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Request.findByIdAndDelete(requestId);

    res.status(200).json({ success: true, message: "Request cancelled successfully" });
  } catch (error) {
    console.error("❌ Cancel request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

