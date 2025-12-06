

import mongoose from 'mongoose';

const momentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Core text and optional location for the moment
    momentText: { type: String, trim: true },
    momentLocation: { type: String, trim: true },

    // Interaction and visibility toggles
    momentCommenting: { type: Boolean, default: true },
    momentLikeCountVisible: { type: Boolean, default: true },
    momentShareCountVisible: { type: Boolean, default: true },
    momentPinned: { type: Boolean, default: false },

    // Single poster/cover image (list view)
    posterImage: { type: String, default: "" },

    // Multiple images attached to the moment
    photoMomentImages: { type: [String], default: [], required: true },

    // Type (keep consistent with other models; extend enum if needed)
    type: {
      type: String,
      enum: ['regular'],
      required: true,
      default: 'regular',
    },

    // Frontend-friendly likedBy array (e.g., store user IDs or usernames as strings)
    likedBy: { type: [String], default: [] },

    // Actual likes referencing User documents
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Comments count and threaded comments
    commentCount: { type: Number, default: 0 },

    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
        parentCommentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // parent for threaded replies
        replies: [{ type: mongoose.Schema.Types.ObjectId }], // stores reply IDs (populate if replies stored separately)
      },
    ],

    // Users can save other moments (references)
    savedMoments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Moment' }],
  },
  { timestamps: true }
);


export default mongoose.model('Moment', momentSchema);
