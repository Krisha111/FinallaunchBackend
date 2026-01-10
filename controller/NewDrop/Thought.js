// controllers/thoughtController.js
import Thought from '../../model/NewDrop/Thought.js';
import User from '../../model/User.js';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Notification from '../../model/Notification.js';

// Use environment variable if provided, otherwise fallback for dev
const BASE_URL = process.env.BASE_URL || "https://finallaunchbackend.onrender.com";

/**
 * @desc   Get thoughts by user ID
 * @route  GET /api/thoughts/user/:userId
 * @access Public
 */

export const getThoughtsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const thoughts = await Thought.find({ user: userId })
      .populate("user", "username profileImage bio")
      .populate('comments.user', 'username profileImage')
      .sort({ createdAt: -1 });

    if (!thoughts || thoughts.length === 0) {
      return res.status(404).json({ message: "No thoughts found for this user" });
    }

    console.log("Fetched thoughts:", thoughts.map(t => ({ id: t._id, coverPhoto: t.coverPhoto }))); // ✅ ADD THIS

    res.json(thoughts);
  } catch (err) {
    console.error("❌ Error fetching thoughts by user ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteThought = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const userId = req.user._id;

    const thought = await Thought.findById(thoughtId);

    if (!thought) return res.status(404).json({ message: "Thought not found" });

    if (thought.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this thought" });
    }

    await Thought.findByIdAndDelete(thoughtId);
    res.status(200).json({ message: "Thought deleted successfully" });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const commentOnThought = async (req, res) => {
  try {
    const { text } = req.body;
    const { thoughtId } = req.params;

    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const thought = await Thought.findById(thoughtId);
    if (!thought) return res.status(404).json({ message: "Thought not found" });

    const newComment = {
      user: req.user._id,
      text,
      createdAt: new Date(),
    };

    thought.comments.push(newComment);
    thought.commentCount = thought.comments.length;

    await thought.save();

    await thought.populate("comments.user", "username profileImage");
    await thought.populate("user", "username profileImage");

    res.json(thought);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error while adding comment" });
  }
};

export const getAllThoughts = async (req, res) => {
  try {
    const thoughts = await Thought.find({})
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(thoughts);
  } catch (error) {
    console.error("❌ Error fetching all thoughts:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createThoughtPost = async (req, res) => {
  try {
    const { thoughtText, thoughtCaption, thoughtLocation } = req.body;

    if (!thoughtText || thoughtText.trim() === '') {
      return res.status(400).json({ message: "Thought text is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Cover photo is required" });
    }

    // ✅ FIX: Use Cloudinary URL directly
    const coverPhotoUrl = req.file.path;

    const newThought = new Thought({
      user: req.user._id,
      thoughtText: thoughtText.trim(),
      thoughtCaption: thoughtCaption?.trim() || '',
      thoughtLocation: thoughtLocation?.trim() || '',
      coverPhoto: coverPhotoUrl,
      type: "regular",
    });

    await newThought.save();

    const populatedThought = await Thought.findById(newThought._id)
      .populate("user", "username profileImage email");

    res.status(201).json({
      message: "Thought created successfully",
      thought: populatedThought
    });

  } catch (err) {
    console.error("❌ Error creating thought:", err);
    res.status(500).json({
      message: "Error creating thought",
      error: err.message
    });
  }
};

export const getAllThoughtPosts = async (req, res) => {
  try {
    const userId = req.user?._id;
    const thoughts = await Thought.find({ user: userId })
      .populate('user', 'username profileImage email')
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(thoughts);
  } catch (err) {
    console.error('❌ Error fetching thoughts:', err);
    res.status(500).json({ message: 'Error fetching thoughts', error: err.message });
  }
};

export const getMyThoughtPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query;

    const filter = { user: userId };
    if (type) filter.type = type;

    const thoughts = await Thought.find(filter)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(thoughts);
  } catch (error) {
    console.error('❌ Error fetching user thoughts:', error);
    res.status(500).json({ message: error.message });
  }
};

export const saveThought = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).populate('savedThoughts');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.savedThoughts.includes(thoughtId)) {
      user.savedThoughts.push(thoughtId);
      await user.save();
    }

    res.status(200).json({ message: 'Thought saved successfully!' });
  } catch (error) {
    console.error('❌ Error saving thought:', error);
    res.status(500).json({ message: 'Error saving thought', error: error.message });
  }
};

export const getSavedThoughts = async (req, res) => {
  try {
    const { type } = req.query;

    const user = await User.findById(req.user._id).populate('savedThoughts');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let savedThoughts = user.savedThoughts;
    if (type) savedThoughts = savedThoughts.filter((t) => t.type === type);

    res.status(200).json(savedThoughts);
  } catch (error) {
    console.error('❌ Error fetching saved thoughts:', error);
    res.status(500).json({ message: 'Error fetching saved thoughts', error: error.message });
  }
};

export const addCommentToThought = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const { text, parentCommentId } = req.body;

    const thought = await Thought.findById(thoughtId);
    if (!thought) return res.status(404).json({ message: 'Thought not found' });

    const newComment = {
      user: req.user._id,
      text: text,
      createdAt: new Date(),
      parentCommentId: parentCommentId || null,
      replies: []
    };

    thought.comments.push(newComment);
    const addedComment = thought.comments[thought.comments.length - 1];

    if (parentCommentId) {
      const parentComment = thought.comments.id(parentCommentId);
      if (parentComment) {
        parentComment.replies.push(addedComment._id);
      }
    }

    thought.commentCount = thought.comments.length;
    await thought.save();

    await thought.populate('comments.user', 'username profileImage');
    await thought.populate('user', 'username profileImage');

    res.json({ success: true, thought: thought });
  } catch (error) {
    console.error('❌ Comment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const likeThought = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const thought = await Thought.findById(thoughtId).populate('user', 'username profileImage');
    if (!thought) return res.status(404).json({ message: "Thought not found" });

    const alreadyLiked = thought.likes.some((id) => id.equals(userId));

    if (alreadyLiked) {
      thought.likes.pull(userId);
    } else {
      thought.likes.push(userId);

      if (thought.user._id.toString() !== userId.toString()) {
        try {
          const liker = await User.findById(userId).select('name username profileImage');

          await Notification.create({
            user: thought.user._id,
            type: 'post_like',
            message: `${liker.name || liker.username} liked your thought`,
            sender: userId,
            postId: thoughtId
          });

          const io = req.app.get('io');
          if (io) {
            io.to(thought.user._id.toString()).emit('new_notification', {
              type: 'post_like',
              from: liker.name || liker.username,
              senderId: userId.toString(),
              message: `${liker.name || liker.username} liked your thought`,
              postId: thoughtId,
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
          console.error('⚠️ Failed to send like notification:', notifError);
        }
      }
    }

    await thought.save();

    const updatedThought = await Thought.findById(thoughtId)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage");

    res.status(200).json(updatedThought);
  } catch (error) {
    console.error("❌ Like error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteThoughtComment = async (req, res) => {
  try {
    const { thoughtId, commentId } = req.params;
    const userId = req.user._id;

    const thought = await Thought.findById(thoughtId);
    if (!thought) return res.status(404).json({ message: 'Thought not found' });

    const comment = thought.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    thought.comments.pull(commentId);
    thought.commentCount = thought.comments.length;
    await thought.save();

    await thought.populate('comments.user', 'username profileImage');
    await thought.populate('user', 'username profileImage');

    res.status(200).json({ thought });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
