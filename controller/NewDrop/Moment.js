// ================================
// 📁 controllers/momentController.js
// ================================

import Moment from '../../model/NewDrop/Moment.js';
import User from '../../model/User.js';
import Notification from '../../model/Notification.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const BASE_URL = process.env.BASE_URL || "https://finallaunchbackend.onrender.com";

// =======================================================
//  GET MOMENTS BY USER ID
// =======================================================
export const getMomentsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const moments = await Moment.find({ user: userId })
      .populate("user", "username profileImage bio")
      .populate("comments.user", "username profileImage")
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

// =======================================================
//  DELETE MOMENT
// =======================================================
export const deleteMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const userId = req.user._id;

    const moment = await Moment.findById(momentId);

    if (!moment) {
      return res.status(404).json({ message: "Moment not found" });
    }

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

// =======================================================
//  ADD COMMENT (TOP LEVEL ONLY)
// =======================================================
export const commentOnMoment = async (req, res) => {
  try {
    const { text } = req.body;
    const { momentId } = req.params;

    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const moment = await Moment.findById(momentId);
    if (!moment) return res.status(404).json({ message: "Moment not found" });

    const newComment = {
      user: req.user._id,
      text,
      createdAt: new Date(),
      parentCommentId: null,
      replies: []
    };

    moment.comments.push(newComment);
    moment.commentCount = moment.comments.length;

    await moment.save();

    await moment.populate("comments.user", "username profileImage");
    await moment.populate("user", "username profileImage");

    res.json(moment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error while adding comment" });
  }
};

// =======================================================
//  GET ALL MOMENTS (PUBLIC)
// =======================================================
export const getAllMoments = async (req, res) => {
  try {
    const moments = await Moment.find({})
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(moments);
  } catch (error) {
    console.error("❌ Error fetching all moments:", error);
    res.status(500).json({ error: error.message });
  }
};

// =======================================================
//  CREATE MOMENT POST (FILES ONLY MATCH MODEL)
// =======================================================
export const createMomentPost = async (req, res) => {
  try {
    const momentPhotos = req.files?.momentPhotos || [];
    const momentVideos = req.files?.momentVideos || [];

    // ✅ Validate at least one media type
    if (momentPhotos.length === 0 && momentVideos.length === 0) {
      return res.status(400).json({ 
        message: "At least one photo or video is required for a moment" 
      });
    }

    const photoMomentImages = momentPhotos.map(file => file.path);
    const videoMomentFiles = momentVideos.map(file => file.path);

    console.log("📸 Moment Photos:", photoMomentImages);
    console.log("🎥 Moment Videos:", videoMomentFiles);

    const newMoment = new Moment({
      user: req.user._id,
      photoMomentImages,
      videoMomentFiles,
      type: "regular"
    });

    await newMoment.save();

    const populatedMoment = await Moment.findById(newMoment._id)
      .populate("user", "username profileImage email");

    res.status(201).json({
      message: "Moment created successfully",
      moment: populatedMoment
    });
  } catch (err) {
    console.error("❌ Error creating moment:", err);
    res.status(500).json({
      message: "Error creating moment",
      error: err.toString(),
    });
  }
};
// =======================================================
//  GET MOMENTS OF AUTHENTICATED USER
// =======================================================
export const getAllMomentPosts = async (req, res) => {
  try {
    const userId = req.user?._id;

    const moments = await Moment.find({ user: userId })
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(moments);
  } catch (err) {
    console.error("❌ Error fetching moments:", err);
    res.status(500).json({ message: "Error fetching moments", error: err.message });
  }
};

// =======================================================
//  GET ONLY MY MOMENT POSTS
// =======================================================
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
    console.error("❌ Error fetching user moments:", error);
    res.status(500).json({ message: error.message });
  }
};

// =======================================================
//  SAVE MOMENT
// =======================================================
export const saveMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).populate("savedMoments");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.savedMoments.includes(momentId)) {
      user.savedMoments.push(momentId);
      await user.save();
    }

    res.status(200).json({ message: "Moment saved successfully!" });
  } catch (error) {
    console.error("❌ Error saving moment:", error);
    res.status(500).json({ message: "Error saving moment", error: error.message });
  }
};

// =======================================================
//  GET SAVED MOMENTS
// =======================================================
export const getSavedMoments = async (req, res) => {
  try {
    const { type } = req.query;

    const user = await User.findById(req.user._id).populate("savedMoments");
    if (!user) return res.status(404).json({ message: "User not found" });

    let savedMoments = user.savedMoments;
    if (type) savedMoments = savedMoments.filter(m => m.type === type);

    res.status(200).json(savedMoments);
  } catch (error) {
    console.error("❌ Error fetching saved moments:", error);
    res.status(500).json({ message: "Error fetching saved moments", error: error.message });
  }
};

// =======================================================
//  ADD THREAD COMMENT / REPLY
// =======================================================
export const addCommentToMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const { text, parentCommentId } = req.body;

    const commenterId = req.user._id;

    const moment = await Moment.findById(momentId);
    if (!moment) return res.status(404).json({ message: "Moment not found" });

    const newComment = {
      user: commenterId,
      text,
      createdAt: new Date(),
      parentCommentId: parentCommentId || null,
      replies: []
    };

    moment.comments.push(newComment);
    const addedComment = moment.comments[moment.comments.length - 1];

    if (parentCommentId) {
      const parent = moment.comments.id(parentCommentId);
      if (parent) parent.replies.push(addedComment._id);
    }

    moment.commentCount = moment.comments.length;

    await moment.save();

    await moment.populate("comments.user", "username profileImage");
    await moment.populate("user", "username profileImage");

    res.json({ success: true, moment });
  } catch (error) {
    console.error("❌ Comment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =======================================================
//  LIKE / UNLIKE MOMENT
// =======================================================
export const likeMoment = async (req, res) => {
  try {
    const { momentId } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const moment = await Moment.findById(momentId).populate("user", "username profileImage");
    if (!moment) return res.status(404).json({ message: "Moment not found" });

    const alreadyLiked = moment.likes.some(id => id.equals(userId));

    if (alreadyLiked) {
      moment.likes.pull(userId);
    } else {
      moment.likes.push(userId);

      // Send notification only if liking someone else's moment
      if (moment.user._id.toString() !== userId.toString()) {
        try {
          const liker = await User.findById(userId).select("name username profileImage");

          await Notification.create({
            user: moment.user._id,
            type: "post_like",
            message: `${liker.name || liker.username} liked your moment`,
            sender: userId,
            postId: momentId
          });

          const io = req.app.get("io");
          if (io) {
            io.to(moment.user._id.toString()).emit("new_notification", {
              type: "post_like",
              senderId: userId.toString(),
              message: `${liker.name || liker.username} liked your moment`,
              postId: momentId,
              timestamp: Date.now(),
              sender: {
                _id: userId.toString(),
                username: liker.username,
                name: liker.name,
                profileImage: liker.profileImage
              }
            });
          }
        } catch (notifError) {
          console.error("⚠️ Notification error:", notifError);
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

// =======================================================
//  DELETE COMMENT
// =======================================================
export const deleteMomentComment = async (req, res) => {
  try {
    const { momentId, commentId } = req.params;
    const userId = req.user._id;

    const moment = await Moment.findById(momentId);
    if (!moment) return res.status(404).json({ message: "Moment not found" });

    const comment = moment.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    moment.comments.pull(commentId);
    moment.commentCount = moment.comments.length;

    await moment.save();

    await moment.populate("comments.user", "username profileImage");
    await moment.populate("user", "username profileImage");

    res.status(200).json({ moment });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
