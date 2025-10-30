import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: { type: String, default: "", trim: true, },
  pushToken: {
  type: String,
  default: null
},
chosen: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bonds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bio: { type: String, default: "" },
  profileImage: { type: String, default: "" }, // store base64 or URL
  isOnline: { type: Boolean, default: false }, // track online status
  lastSeen: { type: Date, default: Date.now }, // optional
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
    reels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reel" }],
  googleId: String,
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
     minlength: 6,
    required: function () {
      return !this.googleId; // only required if not a Google account
    }
  }
  ,
  // 👇 Add followers & following arrays here
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
   // ✅ Add this to track saved post IDs
  savedPosts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }
  ]
  ,
  savedReels: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel' // 👈 make sure this matches your Reel model name
    }
  ],
  savedThoughts: 
  [{ type: mongoose.Schema.Types.ObjectId,
     ref: 'Thought' }]
  ,
  
  savedHighLights: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HighLight',
  }],
   // NEW FIELDS
  isPrivate: { type: Boolean, default: false }, // false = public, true = private
  followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});
// Compare password method for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// New: Generate JWT token method on user instance
userSchema.methods.generateAuthToken = function () {
  // Use your JWT_SECRET from environment variables
  return jwt.sign(
    { id: this._id, username: this.username, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // token expires in 7 days (adjust as you want)
  );
};

const User = mongoose.model('User', userSchema);
export default User;
