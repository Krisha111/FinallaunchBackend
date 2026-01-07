import mongoose from 'mongoose';

const thoughtSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
 thoughtCaption: { type: String, trim: true },
  thoughtLocation: { type: String, trim: true },
     coverPhoto: { type: String, required: true }, 
    thoughtText: { type: String, required: true, trim: true },
   
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

    savedThoughts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Thought' }],
  },
  { timestamps: true }
);

export default mongoose.model('Thought', thoughtSchema);