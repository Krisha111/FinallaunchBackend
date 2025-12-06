

import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Post text/caption and location
    postCaption: { type: String, trim: true },
    postLocation: { type: String, trim: true },

    // Visibility / interaction flags
    postCommenting: { type: Boolean, default: true },
    postLikeCountVisible: { type: Boolean, default: true },
    postShareCountVisible: { type: Boolean, default: true },
    postPinned: { type: Boolean, default: false },

    // Single poster/cover image (for list views)
    posterImage: { type: String, default: "" },

    // Multiple images for a post
    photoPostImages: { type: [String], default: [], required: true },

    // Type (keep same enum as Reel for parity; extend if needed)
    type: {
      type: String,
      enum: ['regular'],
      required: true,
      default: 'regular',
    },

    // For frontend quick-match / boolean-like checks
    likedBy: { type: [String], default: [] },

    // Likes referencing users
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Comments count and comments subdocuments (supports threaded replies)
    commentCount: { type: Number, default: 0 },

    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
        parentCommentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // parent for threaded replies
        replies: [{ type: mongoose.Schema.Types.ObjectId }], // stores reply IDs (you can later populate if replies stored separately)
      },
    ],

    // Saved posts (references to other Post documents)
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  },
  { timestamps: true }
);



export default mongoose.model('Post', postSchema);
