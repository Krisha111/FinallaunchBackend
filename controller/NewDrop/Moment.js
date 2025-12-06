// controllers/momentController.js
// ✅ Removed frontend import (caused localhost issue)
import Moment from '../../model/NewDrop/Moment.js';
import User from '../../model/User.js';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Notification from '../../model/Notification.js';

// Use environment variable if provided (recommended for production), otherwise fall back to localhost for dev
const BASE_URL = process.env.BASE_URL || "https://finallaunchbackend.onrender.com";

/**
 * @desc   Get moments by user ID
 * @route  GET /api/moments/user/:userId
 * @access Public
 */
export const getMomentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // 🔒 Validate userId before querying
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // ✅ Fetch moments for this user
    const moments = await Moment.find({ user: userId })
      .populate("user", "username profileImage bio")
      .populate('comments.user', 'username profileImage') // populate only needed fields
      .sort({ createdAt: -1 });

    if (!moments || moments.length === 0) {
      return res.status(404).json({ message: "No moments found for this user" });
    }

    res.json(moments);
  } catch (err) {
    console.error("❌ Error fetching moments by user ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const userId = req.user._id;

    const moment = await Moment.findById(momentId);
    
    if (!moment) {
      return res.status(404).json({ message: "Moment not found" });
    }

    // Check if user owns this moment
    if (moment.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this moment" });
    }

    await Moment.findByIdAndDelete(momentId);

    res.status(200).json({ message: "Moment deleted successfully" });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const commentOnMoment = async (req, res) => {
  try {
    const { text } = req.body;
    const { momentId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const moment = await Moment.findById(momentId);
    if (!moment) return res.status(404).json({ message: "Moment not found" });

    const newComment = {
      user: req.user._id,
      text,
      createdAt: new Date(),
    };

    moment.comments.push(newComment);
    
    // ✅ UPDATE COMMENT COUNT
    moment.commentCount = moment.comments.length;
    
    await moment.save();

    // populate user info before sending to frontend
    await moment.populate("comments.user", "username profileImage");
    await moment.populate("user", "username profileImage");

    res.json(moment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error while adding comment" });
  }
};

// ✅ Get all moments (from all users)
export const getAllMoments = async (req, res) => {
  try {
    const moments = await Moment.find({})
      .populate("user", "username profileImage") // include user info
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json(moments);
  } catch (error) {
    console.error("❌ Error fetching all moments:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createMomentPost = async (req, res) => {
  const { momentText, momentLocation } = req.body;
  const momentFile = req.files?.momentFiles ? req.files.momentFiles[0] : null;
  const posterFile = req.files?.poster ? req.files.poster[0] : null;

  if (!momentFile || !posterFile) {
    return res.status(400).json({ message: "Missing image or poster file" });
  }

  try {
    const {
      momentText,
      momentLocation,
      momentCommenting,
      momentLikeCountVisible,
      momentShareCountVisible,
      momentPinned,
      type,
    } = req.body;

    // ✅ Access uploaded files safely
    const posterFile = req.files?.poster ? req.files.poster[0] : null;
    const momentFiles = req.files?.momentFiles || [];

    // ✅ Expecting poster and multiple moment files
    const posterImage = posterFile?.path || "";
    const photoMomentImages = momentFiles.map(file => file.path); // ✅ Cloudinary URL

    // Build array and log each uploaded file (fix: logging inside loop)
    if (momentFiles.length) {
      console.log("📸 ====== Uploaded Moment Files ======");
      momentFiles.forEach((file, index) => {
        const fileUrl = `${BASE_URL}/uploads/${file.filename}`;
        console.log(`🖼️ Image ${index + 1} URL: ${fileUrl}`);
        photoMomentImages.push(fileUrl);
      });
      console.log("=====================================");
    } else {
      console.log("⚠️ No moment files uploaded.");
    }

    if (posterFile) {
      console.log(`🖼️ Poster Image URL: ${BASE_URL}/uploads/${posterFile.filename}`);
    }

    // Log body & file info (for debugging)
    console.log("🧾 req.body:", req.body);
    console.log("📂 req.files:", req.files);

    const newMoment = new Moment({
      user: req.user._id,
      momentText,
      momentLocation,
      momentCommenting: momentCommenting ?? true,
      momentLikeCountVisible: momentLikeCountVisible ?? true,
      momentShareCountVisible: momentShareCountVisible ?? true,
      momentPinned: momentPinned ?? false,
      posterImage, // ✅ save poster
      photoMomentImages,
      type: type || "regular",
    });

    await newMoment.save();

    const populatedMoment = await Moment.findById(newMoment._id).populate(
      "user",
      "username profileImage email"
    );

    console.log("✅ Moment successfully created for user:", req.user?._id);
    console.log("✅ Moment DB ID:", newMoment._id);
    console.log("✅ Image URLs saved:", photoMomentImages);
    console.log("✅ Poster URL saved:", posterImage);

    res.status(201).json({
      message: "Moment created successfully",
      moment: populatedMoment,
    });
  } catch (err) {
    console.error("❌ Error creating moment:", err);
    res.status(500).json({
      message: "Error creating moment",
      error: err.toString(),
    });
  }
};

/**
 * @desc   Get all moments (optionally filter by type)
 * @route  GET /api/moments
 * @access Public (or protected depending on middleware)
 */
export const getAllMomentPosts = async (req, res) => {
  try {
    const userId = req.user?._id; // only works if route is protected
    const moments = await Moment.find({ user: userId })
      .populate('user', 'username profileImage email')
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(moments);
  } catch (err) {
    console.error('❌ Error fetching moments:', err);
    res.status(500).json({ message: 'Error fetching moments', error: err.message });
  }
};

/**
 * @desc   Get moments created by authenticated user
 * @route  GET /api/moments/mine
 * @access Private
 */
export const getMyMomentPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query;

    const filter = { user: userId };
    if (type) filter.type = type;

    const moments = await Moment.find(filter)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(moments);
  } catch (error) {
    console.error('❌ Error fetching user moments:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc   Save a moment to user's saved list
 * @route  POST /api/moments/save/:momentId
 * @access Private
 */
export const saveMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).populate('savedMoments');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.savedMoments.includes(momentId)) {
      user.savedMoments.push(momentId);
      await user.save();
    }

    res.status(200).json({ message: 'Moment saved successfully!' });
  } catch (error) {
    console.error('❌ Error saving moment:', error);
    res.status(500).json({ message: 'Error saving moment', error: error.message });
  }
};

/**
 * @desc   Get all saved moments for a user
 * @route  GET /api/moments/saved
 * @access Private
 */
export const getSavedMoments = async (req, res) => {
  try {
    const { type } = req.query;

    const user = await User.findById(req.user._id).populate('savedMoments');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let savedMoments = user.savedMoments;
    if (type) savedMoments = savedMoments.filter((moment) => moment.type === type);

    res.status(200).json(savedMoments);
  } catch (error) {
    console.error('❌ Error fetching saved moments:', error);
    res.status(500).json({ message: 'Error fetching saved moments', error: error.message });
  }
};

export const addCommentToMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const { text, parentCommentId } = req.body; // ✅ Accept parentCommentId
    const commenterId = req.user._id;

    const moment = await Moment.findById(momentId);
    if (!moment) return res.status(404).json({ message: 'Moment not found' });

    const newComment = {
      user: commenterId,
      text: text,
      createdAt: new Date(),
      parentCommentId: parentCommentId || null, // ✅ NEW
      replies: []
    };

    moment.comments.push(newComment);
    const addedComment = moment.comments[moment.comments.length - 1];

    // ✅ If it's a reply, add to parent's replies array
    if (parentCommentId) {
      const parentComment = moment.comments.id(parentCommentId);
      if (parentComment) {
        parentComment.replies.push(addedComment._id);
      }
    }

    moment.commentCount = moment.comments.length;
    await moment.save();

    await moment.populate('comments.user', 'username profileImage');
    await moment.populate('user', 'username profileImage');

    res.json({ success: true, moment: moment });
  } catch (error) {
    console.error('❌ Comment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likeMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const moment = await Moment.findById(momentId).populate('user', 'username profileImage');
    if (!moment) return res.status(404).json({ message: "Moment not found" });

    const alreadyLiked = moment.likes.some((id) => id.equals(userId));
    
    if (alreadyLiked) {
      moment.likes.pull(userId);
    } else {
      moment.likes.push(userId);
      
      if (moment.user._id.toString() !== userId.toString()) {
        try {
          const liker = await User.findById(userId).select('name username profileImage'); // ✅ Added profileImage
          
          await Notification.create({
            user: moment.user._id,
            type: 'post_like',
            message: `${liker.name || liker.username} liked your moment`,
            sender: userId,
            postId: momentId
          });

          const io = req.app.get('io');
          if (io) {
            const socketData = {
              type: 'post_like',
              from: liker.name || liker.username,
              senderId: userId.toString(),
              message: `${liker.name || liker.username} liked your moment`,
              postId: momentId,
              timestamp: Date.now(),
              sender: {  // ✅ Include full sender object
                _id: userId.toString(),
                username: liker.username,
                name: liker.name,
                profileImage: liker.profileImage
              }
            };
            
            console.log('📤 Emitting like notification');
            io.to(moment.user._id.toString()).emit('new_notification', socketData);
          }
        } catch (notifError) {
          console.error('⚠️ Failed to send like notification:', notifError);
        }
      }
    }

    await moment.save();

    const updatedMoment = await Moment.findById(momentId)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage");

    res.status(200).json(updatedMoment);
  } catch (error) {
    console.error("❌ Like error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteMomentComment = async (req, res) => {
  try {
    const { momentId, commentId } = req.params;
    const userId = req.user._id;

    const moment = await Moment.findById(momentId);
    if (!moment) return res.status(404).json({ message: 'Moment not found' });

    const comment = moment.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Check if user owns this comment
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    moment.comments.pull(commentId);
    moment.commentCount = moment.comments.length;
    await moment.save();

    await moment.populate('comments.user', 'username profileImage');
    await moment.populate('user', 'username profileImage');

    res.status(200).json({ moment });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};