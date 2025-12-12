import mongoose from 'mongoose';

const momentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ✅ Either photos OR videos (at least one required)
    photoMomentImages: { type: [String], default: [] },
    videoMomentFiles: { type: [String], default: [] },

    type: {
      type: String,
      enum: ['regular'],
      required: true,
      default: 'regular',
    },

    likedBy: { type: [String], default: [] },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentCount: { type: Number, default: 0 },

    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
        parentCommentId: { type: mongoose.Schema.Types.ObjectId, default: null },
        replies: [{ type: mongoose.Schema.Types.ObjectId }],
      },
    ],

    savedMoments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Moment' }],
  },
  { timestamps: true }
);

// ✅ Validation: at least one media type required
momentSchema.pre('save', function(next) {
  if (this.photoMomentImages.length === 0 && this.videoMomentFiles.length === 0) {
    next(new Error('Moment must have at least one photo or video'));
  } else {
    next();
  }
});

export default mongoose.model('Moment', momentSchema);