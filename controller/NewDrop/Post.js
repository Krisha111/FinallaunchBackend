// controllers/postController.js
// ✅ Removed frontend import (caused localhost issue)
import Post from '../../model/NewDrop/Post.js';
import User from '../../model/User.js';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Notification from '../../model/Notification.js';

// Use environment variable if provided (recommended for production), otherwise fall back to localhost for dev
const BASE_URL = process.env.BASE_URL || "https://finallaunchbackend.onrender.com";

/**
 * @desc   Get posts by user ID
 * @route  GET /api/posts/user/:userId
 * @access Public
 */
export const getPostsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const posts = await Post.find({ user: userId })
      .populate("user", "username profileImage bio")
      .populate('comments.user', 'username profileImage')
      .sort({ createdAt: -1 });

    // ✅ Return empty array instead of 404
    res.json(posts);
  } catch (err) {
    console.error("❌ Error fetching posts by user ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user owns this post
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(postId);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const newComment = {
      user: req.user._id,
      text,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    
    // ✅ UPDATE COMMENT COUNT
    post.commentCount = post.comments.length;
    
    await post.save();

    // populate user info before sending to frontend
    await post.populate("comments.user", "username profileImage");
    await post.populate("user", "username profileImage");

    res.json(post);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error while adding comment" });
  }
};

// ✅ Get all posts (from all users)
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate("user", "username profileImage") // include user info
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json(posts);
  } catch (error) {
    console.error("❌ Error fetching all posts:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createPostPost = async (req, res) => {
  try {
    const {
      postCaption,
      postLocation,
      postCommenting,
      postLikeCountVisible,
      postShareCountVisible,
      postPinned,
      type,
    } = req.body;

    // ✅ Access uploaded files safely
    const posterFile = req.files?.poster ? req.files.poster[0] : null;
    const postFiles = req.files?.postFiles || [];

    if (!postFiles.length || !posterFile) {
      return res.status(400).json({ message: "Missing image or poster file" });
    }

    // ✅ Cloudinary URLs
    const posterImage = posterFile?.path || "";
    const photoPostImages = postFiles.map(file => file.path);

    console.log("📸 Uploaded files:", photoPostImages);
    console.log("🖼️ Poster:", posterImage);

    const newPost = new Post({
      user: req.user._id,
      postCaption,
      postLocation,
      postCommenting: postCommenting ?? true,
      postLikeCountVisible: postLikeCountVisible ?? true,
      postShareCountVisible: postShareCountVisible ?? true,
      postPinned: postPinned ?? false,
      posterImage,
      photoPostImages,
      type: type || "regular",
    });

    await newPost.save();

    const populatedPost = await Post.findById(newPost._id).populate(
      "user",
      "username profileImage email"
    );

    console.log("✅ Post created:", newPost._id);

    res.status(201).json({
      message: "Post created successfully",
      post: populatedPost,
    });
  } catch (err) {
    console.error("❌ Error creating post:", err);
    res.status(500).json({
      message: "Error creating post",
      error: err.toString(),
    });
  }
};

/**
 * @desc   Get all posts (optionally filter by type)
 * @route  GET /api/posts
 * @access Public (or protected depending on middleware)
 */
export const getAllPostPosts = async (req, res) => {
  try {
    const userId = req.user?._id; // only works if route is protected
    const posts = await Post.find({ user: userId })
      .populate('user', 'username profileImage email')
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error('❌ Error fetching posts:', err);
    res.status(500).json({ message: 'Error fetching posts', error: err.message });
  }
};

/**
 * @desc   Get posts created by authenticated user
 * @route  GET /api/posts/mine
 * @access Private
 */
export const getMyPostPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query;

    const filter = { user: userId };
    if (type) filter.type = type;

    const posts = await Post.find(filter)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error('❌ Error fetching user posts:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc   Save a post to user's saved list
 * @route  POST /api/posts/save/:postId
 * @access Private
 */
export const savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).populate('savedPosts');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.savedPosts.includes(postId)) {
      user.savedPosts.push(postId);
      await user.save();
    }

    res.status(200).json({ message: 'Post saved successfully!' });
  } catch (error) {
    console.error('❌ Error saving post:', error);
    res.status(500).json({ message: 'Error saving post', error: error.message });
  }
};

/**
 * @desc   Get all saved posts for a user
 * @route  GET /api/posts/saved
 * @access Private
 */
export const getSavedPosts = async (req, res) => {
  try {
    const { type } = req.query;

    const user = await User.findById(req.user._id).populate('savedPosts');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let savedPosts = user.savedPosts;
    if (type) savedPosts = savedPosts.filter((post) => post.type === type);

    res.status(200).json(savedPosts);
  } catch (error) {
    console.error('❌ Error fetching saved posts:', error);
    res.status(500).json({ message: 'Error fetching saved posts', error: error.message });
  }
};

export const addCommentToPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentCommentId } = req.body; // ✅ Accept parentCommentId
    const commenterId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const newComment = {
      user: commenterId,
      text: text,
      createdAt: new Date(),
      parentCommentId: parentCommentId || null, // ✅ NEW
      replies: []
    };

    post.comments.push(newComment);
    const addedComment = post.comments[post.comments.length - 1];

    // ✅ If it's a reply, add to parent's replies array
    if (parentCommentId) {
      const parentComment = post.comments.id(parentCommentId);
      if (parentComment) {
        parentComment.replies.push(addedComment._id);
      }
    }

    post.commentCount = post.comments.length;
    await post.save();

    await post.populate('comments.user', 'username profileImage');
    await post.populate('user', 'username profileImage');

    res.json({ success: true, post: post });
  } catch (error) {
    console.error('❌ Comment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const post = await Post.findById(postId).populate('user', 'username profileImage');
    if (!post) return res.status(404).json({ message: "Post not found" });

    const alreadyLiked = post.likes.some((id) => id.equals(userId));
    
    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
      
      if (post.user._id.toString() !== userId.toString()) {
        try {
          const liker = await User.findById(userId).select('name username profileImage'); // ✅ Added profileImage
          
          await Notification.create({
            user: post.user._id,
            type: 'post_like',
            message: `${liker.name || liker.username} liked your post`,
            sender: userId,
            postId: postId
          });

          const io = req.app.get('io');
          if (io) {
            const socketData = {
              type: 'post_like',
              from: liker.name || liker.username,
              senderId: userId.toString(),
              message: `${liker.name || liker.username} liked your post`,
              postId: postId,
              timestamp: Date.now(),
              sender: {  // ✅ Include full sender object
                _id: userId.toString(),
                username: liker.username,
                name: liker.name,
                profileImage: liker.profileImage
              }
            };
            
            console.log('📤 Emitting like notification');
            io.to(post.user._id.toString()).emit('new_notification', socketData);
          }
        } catch (notifError) {
          console.error('⚠️ Failed to send like notification:', notifError);
        }
      }
    }

    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage");

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("❌ Like error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deletePostComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Check if user owns this comment
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    post.comments.pull(commentId);
    post.commentCount = post.comments.length;
    await post.save();

    await post.populate('comments.user', 'username profileImage');
    await post.populate('user', 'username profileImage');

    res.status(200).json({ post });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};