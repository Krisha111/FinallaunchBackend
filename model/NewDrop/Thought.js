

import mongoose from 'mongoose';

const thoughtSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Main body and optional location
    thoughtText: { type: String, trim: true },
    thoughtLocation: { type: String, trim: true },

    // Interaction / visibility flags
    thoughtCommenting: { type: Boolean, default: true },
    thoughtLikeCountVisible: { type: Boolean, default: true },
    thoughtShareCountVisible: { type: Boolean, default: true },
    thoughtPinned: { type: Boolean, default: false },

    // Single poster/cover image for list views
    posterImage: { type: String, default: "" },

    // Multiple images attached to the thought (required to mirror Reel/Post behavior)
    photoThoughtImages: { type: [String], default: [], required: true },

    // Type: keep parity with your other models; extend enum values if needed
    type: {
      type: String,
      enum: ['regular'],
      required: true,
      default: 'regular',
    },

    // For frontend quick-match / boolean-like checks
    likedBy: { type: [String], default: [] },

    // Likes referencing users (actual user ObjectIds)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Comments count and threaded comments structure
    commentCount: { type: Number, default: 0 },

    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
        parentCommentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // parent for threaded replies
        replies: [{ type: mongoose.Schema.Types.ObjectId }], // store reply IDs (populate if replies stored separately)
      },
    ],

    // Users' saved thoughts (references to Thought documents)
    savedThoughts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Thought' }],
  },
  { timestamps: true }
);

// OPTIONAL: Helpful indexes / virtuals (uncomment & adapt if needed)
// thoughtSchema.index({ user: 1, createdAt: -1 }); // useful for timeline queries
// thoughtSchema.virtual('likeCount').get(function () { return this.likes ? this.likes.length : 0; });

export default mongoose.model('Thought', thoughtSchema);
