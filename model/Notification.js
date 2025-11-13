// backend/model/Notification.js

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'bond_request',
      'special_friend_request',
      'bond_accepted',
      'special_friend_accepted',
      'follow_request',
      'like',
      'comment',
      'post_like',           // ✅ ADD THIS
      'post_comment'         // ✅ ADD THIS
    ],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  postId: {                 // ✅ ADD THIS (optional field for likes/comments)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  },
  read: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

  