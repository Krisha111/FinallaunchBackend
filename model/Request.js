import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['bond', 'special_friend'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
    // ✅ NEW FIELDS for special_friend requests
  image: {
    type: String,
    default: null // base64 or URL
  },
  caption: {
    type: String,
    default: null,
    maxlength: 500
  }

}, { 
  timestamps: true 
});

// Index for faster queries
requestSchema.index({ recipient: 1, status: 1 });
requestSchema.index({ sender: 1, status: 1 });
requestSchema.index({ sender: 1, recipient: 1, type: 1 });

const Request = mongoose.model('Request', requestSchema);
export default Request;