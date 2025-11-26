// controllers/reelController.js
// ✅ Removed frontend import (caused localhost issue)
// import API_CONFIG from '../../../src/config/api.js';
import Reel from '../../model/NewDrop/Reel.js';
import User from '../../model/User.js';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Notification from '../../model/Notification.js';
// Use environment variable if provided (recommended for production), otherwise fall back to localhost for dev
const BASE_URL = process.env.BASE_URL || "https://finallaunchbackend.onrender.com";

/**
 * @desc   Get reels by user ID
 * @route  GET /api/reels/user/:userId
 * @access Public
 */
export const getReelsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // 🔒 Validate userId before querying
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // ✅ Fetch reels for this user
    const reels = await Reel.find({ user: userId })
      .populate("user", "username profileImage bio")
      .populate('comments.user', 'username profileImage') // populate only needed fields
      .sort({ createdAt: -1 });

    if (!reels || reels.length === 0) {
      return res.status(404).json({ message: "No reels found for this user" });
    }

    res.json(reels);
  } catch (err) {
    console.error("❌ Error fetching reels by user ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    // Check if user owns this reel
    if (reel.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this reel" });
    }

    await Reel.findByIdAndDelete(reelId);

    res.status(200).json({ message: "Reel deleted successfully" });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const commentOnReel = async (req, res) => {
  try {
    const { text } = req.body;
    const { reelId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const newComment = {
      user: req.user._id,
      text,
      createdAt: new Date(),
    };

    reel.comments.push(newComment);
    
    // ✅ UPDATE COMMENT COUNT
    reel.commentCount = reel.comments.length;
    
    await reel.save();

    // populate user info before sending to frontend
    await reel.populate("comments.user", "username profileImage");
    await reel.populate("user", "username profileImage");

    res.json(reel);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error while adding comment" });
  }
};// ✅ Get all reels (from all users)
export const getAllReels = async (req, res) => {
  try {
    const reels = await Reel.find({})
      .populate("user", "username profileImage") // include user info
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json(reels);
  } catch (error) {
    console.error("❌ Error fetching all reels:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createReelPost = async (req, res) => {
  const { reelScript, reelLocation } = req.body;
  const reelFile = req.files?.reelFiles ? req.files.reelFiles[0] : null;
  const posterFile = req.files?.poster ? req.files.poster[0] : null;

  if (!reelFile || !posterFile) {
    return res.status(400).json({ message: "Missing video or poster file" });
  }

  try {
    const {
      reelScript,
      reelLocation,
      reelCommenting,
      reelLikeCountVisible,
      reelShareCountVisible,
      reelPinned,
      type,
    } = req.body;

    // ✅ Access uploaded files safely
    const posterFile = req.files?.poster ? req.files.poster[0] : null;
    const reelFiles = req.files?.reelFiles || [];

    // ✅ Expecting poster and multiple reel files
    // const posterImage = posterFile
    //   ? `${BASE_URL}/uploads/${posterFile.filename}`
    //   : "";


const posterImage = posterFile?.path || "";
const photoReelImages = reelFiles.map(file => file.path); // ✅ Cloudinary URL
 // ✅ Cloudinary returns .path as URL


    // Build array and log each uploaded file (fix: logging inside loop)
   
    if (reelFiles.length) {
      console.log("🎬 ====== Uploaded Video Files ======");
      reelFiles.forEach((file, index) => {
        const fileUrl = `${BASE_URL}/uploads/${file.filename}`;
        console.log(`🎥 Video ${index + 1} URL: ${fileUrl}`);
        photoReelImages.push(fileUrl);
      });
      console.log("=====================================");
    } else {
      console.log("⚠️ No reel files uploaded.");
    }

    if (posterFile) {
      console.log(`🖼️ Poster Image URL: ${BASE_URL}/uploads/${posterFile.filename}`);
    }

    // Log body & file info (for debugging)
    console.log("🧾 req.body:", req.body);
    console.log("📂 req.files:", req.files);

    const newReel = new Reel({
      user: req.user._id,
      reelScript,
      reelLocation,
      reelCommenting: reelCommenting ?? true,
      reelLikeCountVisible: reelLikeCountVisible ?? true,
      reelShareCountVisible: reelShareCountVisible ?? true,
      reelPinned: reelPinned ?? false,
      posterImage, // ✅ save poster
      photoReelImages,
      type: type || "regular",
    });

    await newReel.save();

    const populatedReel = await Reel.findById(newReel._id).populate(
      "user",
      "username profileImage email"
    );

    console.log("✅ Reel successfully created for user:", req.user?._id);
    console.log("✅ Reel DB ID:", newReel._id);
    console.log("✅ Video URLs saved:", photoReelImages);
    console.log("✅ Poster URL saved:", posterImage);

    res.status(201).json({
      message: "Reel created successfully",
      reel: populatedReel,
    });
  } catch (err) {
    console.error("❌ Error creating reel:", err);
    res.status(500).json({
      message: "Error creating reel",
      error: err.toString(),
    });
  }
};

/**
 * @desc   Get all reels (optionally filter by type)
 * @route  GET /api/reels
 * @access Public (or protected depending on middleware)
 */
export const getAllReelPosts = async (req, res) => {
  try {
    const userId = req.user?._id; // only works if route is protected
    const reels = await Reel.find({ user: userId })
      .populate('user', 'username profileImage email')
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(reels);
  } catch (err) {
    console.error('❌ Error fetching reels:', err);
    res.status(500).json({ message: 'Error fetching reels', error: err.message });
  }
};

/**
 * @desc   Get reels created by authenticated user
 * @route  GET /api/reels/mine
 * @access Private
 */
export const getMyReelPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query;

    const filter = { user: userId };
    if (type) filter.type = type;

    const reels = await Reel.find(filter)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(reels);
  } catch (error) {
    console.error('❌ Error fetching user reels:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc   Save a reel to user's saved list
 * @route  POST /api/reels/save/:reelId
 * @access Private
 */
export const saveReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).populate('savedReels');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.savedReels.includes(reelId)) {
      user.savedReels.push(reelId);
      await user.save();
    }

    res.status(200).json({ message: 'Reel saved successfully!' });
  } catch (error) {
    console.error('❌ Error saving reel:', error);
    res.status(500).json({ message: 'Error saving reel', error: error.message });
  }
};

/**
 * @desc   Get all saved reels for a user
 * @route  GET /api/reels/saved
 * @access Private
 */
export const getSavedReels = async (req, res) => {
  try {
    const { type } = req.query;

    const user = await User.findById(req.user._id).populate('savedReels');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let savedReels = user.savedReels;
    if (type) savedReels = savedReels.filter((reel) => reel.type === type);

    res.status(200).json(savedReels);
  } catch (error) {
    console.error('❌ Error fetching saved reels:', error);
    res.status(500).json({ message: 'Error fetching saved reels', error: error.message });
  }
};

/**
 * @desc   Add comment to reel
 * @route  POST /api/reels/comment/:reelId
 * @access Private
 */
// ✅ Add comment to reel AND send notification
// controllers/reelController.js

// ✅ Add comment to reel AND send notification
// export const addCommentToReel = async (req, res) => {
//   console.log('\n💬 ========== ADD COMMENT TO REEL ==========');
  
//   try {
//     const { reelId } = req.params;
//     const { text } = req.body;
//     const commenterId = req.user._id;

//     console.log('📝 ReelId:', reelId);
//     console.log('📝 Commenter:', commenterId);
//     console.log('📝 Comment text:', text);

//     const reel = await Reel.findById(reelId);
    
//     if (!reel) {
//       return res.status(404).json({ message: 'Reel not found' });
//     }

//     const newComment = {
//       user: commenterId,
//       text: text,
//       timestamp: new Date(),
//       createdAt: new Date()
//     };

//     reel.comments.push(newComment);
//     reel.commentCount = reel.comments.length;
//     await reel.save();

//     await reel.populate('comments.user', 'username profileImage');
//     await reel.populate('user', 'username profileImage');

//     // ✅ SEND NOTIFICATION (only if not commenting on own post)
//     if (reel.user._id.toString() !== commenterId.toString()) {
//       try {
//         const commenter = await User.findById(commenterId).select('name username');
        
//         // Create notification in database
//         await Notification.create({
//           user: reel.user._id,
//           type: 'post_comment',
//           message: `${commenter.name || commenter.username} commented on your reel`,
//           sender: commenterId,
//           postId: reelId
//         });

//         // ✅ Emit socket event
//         const io = req.app.get('io');
//         if (io) {
//           const preview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
          
//           const socketData = {
//             type: 'post_comment',
//             from: commenter.name || commenter.username,
//             senderId: commenterId.toString(),
//             message: `${commenter.name || commenter.username} commented: ${preview}`,
//             postId: reelId,
//             timestamp: Date.now()
//           };
          
//           console.log('📤 Emitting comment notification to:', reel.user._id.toString());
//           io.to(reel.user._id.toString()).emit('new_notification', socketData);
//         }
//       } catch (notifError) {
//         console.error('⚠️ Failed to send notification:', notifError);
//       }
//     }

//     console.log('✅ Comment added successfully');
//     res.status(200).json({ 
//       success: true,
//       reel: reel 
//     });
//   } catch (error) {
//     console.error('❌ Comment error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: error.message 
//     });
//   }
// };

// ✅ ADD NOTIFICATION FOR LIKES TOO
// export const likeReel = async (req, res) => {
//   try {
//     const { reelId } = req.params;
//     const userId = req.user?._id;

//     if (!userId) return res.status(401).json({ message: "Unauthorized" });

//     const reel = await Reel.findById(reelId).populate('user', 'username profileImage');
//     if (!reel) return res.status(404).json({ message: "Reel not found" });

//     const alreadyLiked = reel.likes.some((id) => id.equals(userId));
    
//     if (alreadyLiked) {
//       reel.likes.pull(userId);
//     } else {
//       reel.likes.push(userId);
      
//       // ✅ SEND LIKE NOTIFICATION (only if not liking own reel)
//       if (reel.user._id.toString() !== userId.toString()) {
//         try {
//           const liker = await User.findById(userId).select('name username');
          
//           await Notification.create({
//             user: reel.user._id,
//             type: 'post_like',
//             message: `${liker.name || liker.username} liked your reel`,
//             sender: userId,
//             postId: reelId
//           });

//           const io = req.app.get('io');
//           if (io) {
//             const socketData = {
//               type: 'post_like',
//               from: liker.name || liker.username,
//               senderId: userId.toString(),
//               message: `${liker.name || liker.username} liked your reel`,
//               postId: reelId,
//               timestamp: Date.now()
//             };
            
//             console.log('📤 Emitting like notification to:', reel.user._id.toString());
//             io.to(reel.user._id.toString()).emit('new_notification', socketData);
//           }
//         } catch (notifError) {
//           console.error('⚠️ Failed to send like notification:', notifError);
//         }
//       }
//     }

//     await reel.save();

//     const updatedReel = await Reel.findById(reelId)
//       .populate("user", "username profileImage email")
//       .populate("comments.user", "username profileImage");

//     res.status(200).json(updatedReel);
//   } catch (error) {
//     console.error("❌ Like error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };
export const addCommentToReel = async (req, res) => {
  console.log('\n💬 ========== ADD COMMENT TO REEL ==========');
  
  try {
    const { reelId } = req.params;
    const { text } = req.body;
    const commenterId = req.user._id;

    const reel = await Reel.findById(reelId);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }

    const newComment = {
      user: commenterId,
      text: text,
      timestamp: new Date(),
      createdAt: new Date()
    };

    reel.comments.push(newComment);
    reel.commentCount = reel.comments.length;
    await reel.save();

    await reel.populate('comments.user', 'username profileImage');
    await reel.populate('user', 'username profileImage');

    // ✅ SEND NOTIFICATION (only if not commenting on own post)
    if (reel.user._id.toString() !== commenterId.toString()) {
      try {
        const commenter = await User.findById(commenterId).select('name username profileImage'); // ✅ Added profileImage
        
        await Notification.create({
          user: reel.user._id,
          type: 'post_comment',
          message: `${commenter.name || commenter.username} commented on your reel`,
          sender: commenterId,
          postId: reelId
        });

        const io = req.app.get('io');
        if (io) {
          const preview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
          
          const socketData = {
            type: 'post_comment',
            from: commenter.name || commenter.username,
            senderId: commenterId.toString(),
            message: `${commenter.name || commenter.username} commented: ${preview}`,
            postId: reelId,
            timestamp: Date.now(),
            sender: {  // ✅ Include full sender object
              _id: commenterId.toString(),
              username: commenter.username,
              name: commenter.name,
              profileImage: commenter.profileImage
            }
          };
          
          console.log('📤 Emitting comment notification to:', reel.user._id.toString());
          io.to(reel.user._id.toString()).emit('new_notification', socketData);
        }
      } catch (notifError) {
        console.error('⚠️ Failed to send notification:', notifError);
      }
    }

    console.log('✅ Comment added successfully');
    res.status(200).json({ 
      success: true,
      reel: reel 
    });
  } catch (error) {
    console.error('❌ Comment error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
export const likeReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reel = await Reel.findById(reelId).populate('user', 'username profileImage');
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const alreadyLiked = reel.likes.some((id) => id.equals(userId));
    
    if (alreadyLiked) {
      reel.likes.pull(userId);
    } else {
      reel.likes.push(userId);
      
      if (reel.user._id.toString() !== userId.toString()) {
        try {
          const liker = await User.findById(userId).select('name username profileImage'); // ✅ Added profileImage
          
          await Notification.create({
            user: reel.user._id,
            type: 'post_like',
            message: `${liker.name || liker.username} liked your reel`,
            sender: userId,
            postId: reelId
          });

          const io = req.app.get('io');
          if (io) {
            const socketData = {
              type: 'post_like',
              from: liker.name || liker.username,
              senderId: userId.toString(),
              message: `${liker.name || liker.username} liked your reel`,
              postId: reelId,
              timestamp: Date.now(),
              sender: {  // ✅ Include full sender object
                _id: userId.toString(),
                username: liker.username,
                name: liker.name,
                profileImage: liker.profileImage
              }
            };
            
            console.log('📤 Emitting like notification');
            io.to(reel.user._id.toString()).emit('new_notification', socketData);
          }
        } catch (notifError) {
          console.error('⚠️ Failed to send like notification:', notifError);
        }
      }
    }

    await reel.save();

    const updatedReel = await Reel.findById(reelId)
      .populate("user", "username profileImage email")
      .populate("comments.user", "username profileImage");

    res.status(200).json(updatedReel);
  } catch (error) {
    console.error("❌ Like error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};