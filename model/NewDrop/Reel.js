// models/Reel.js
import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reelScript: { type: String, trim: true },
    reelLocation: { type: String, trim: true },

    reelCommenting: { type: Boolean, default: true },
    reelLikeCountVisible: { type: Boolean, default: true },
    reelShareCountVisible: { type: Boolean, default: true },
    reelPinned: { type: Boolean, default: false },

    // ✅ New Poster field
    posterImage: { type: String, default: "" }, // single image URL for reel cover

    // ✅ Multiple images
    photoReelImages: { type: [String], default: [], required: true },

    // ✅ Type: regular or public
    type: {
      type: String,
      enum: ['regular'],
      required: true,
      default: 'regular',
    },

    // ✅ Likes array for frontend matching
    likedBy: { type: [String], default: [] },

    // ✅ Likes references
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    commentCount: { type: Number, default: 0 },

    // ✅ Comments array
    comments: [
      {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    savedReels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reel' }],
  },
  { timestamps: true }
);

export default mongoose.model('Reel', reelSchema);
