import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../model/User.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config(); // ✅ Load env variables (like JWT_SECRET)



export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have auth middleware that adds user to req

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete all user's content
    await Promise.all([
      // Delete user's reels
      mongoose.model('Reel').deleteMany({ userId: userId }),
      
      // Delete user's posts
      mongoose.model('Post').deleteMany({ userId: userId }),
      
      // Delete user's thoughts
      mongoose.model('Thought').deleteMany({ userId: userId }),
      
      // Delete user's highlights
      mongoose.model('HighLight').deleteMany({ userId: userId }),
      
      // Delete user's comments
      mongoose.model('Comment').deleteMany({ userId: userId }),
      
      // Remove user from other users' followers/following
      User.updateMany(
        { $or: [{ followers: userId }, { following: userId }] },
        { $pull: { followers: userId, following: userId } }
      ),
      
      // Remove user from bonds and chosen lists
      User.updateMany(
        { $or: [{ bonds: userId }, { chosen: userId }] },
        { $pull: { bonds: userId, chosen: userId } }
      ),
      
      // Remove user from follow requests
      User.updateMany(
        { followRequests: userId },
        { $pull: { followRequests: userId } }
      ),
    ]);

    // Finally, delete the user account
    await User.findByIdAndDelete(userId);

    res.status(200).json({ 
      success: true, 
      message: "Account deleted successfully" 
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete account", 
      error: error.message 
    });
  }
};



export const signUpRouteUser = async (req, res) => {
  const { username, email, password } = req.body;

  // ✅ 1. Validate email domain
  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({ message: 'Only Gmail addresses are allowed' });
  }

  // ✅ 2. Validate username format
  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
  const digitRegex = /\d/;

  if (!specialCharRegex.test(username) || !digitRegex.test(username)) {
    return res.status(400).json({
      message: 'Username must contain at least one special character and one digit',
    });
  }

  try {
    // ✅ 3. Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // ✅ 4. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 5. Create and save the new user (default profileImage = "")
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      profileImage: "", // default empty string
    });

    await newUser.save();
    console.log('✅ User saved!');

    // ✅ 6. Create token
    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '36500d' }
    );

    // ✅ 7. Send back { user, token }
    res.status(201).json({
      message: 'Signup successful',
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profileImage: newUser.profileImage || "",
      },
      token,
    });
    // console.log(newUser,token)
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ message: 'Error signing up', error: err.message });
  }
};

// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // exclude password
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
};

// ✅ Update profile image later
export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { profileImage } = req.body; // image URL or uploaded file

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage },
      { new: true }
    );

    res.json({
      message: "Profile image updated",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile image", error: err.message });
  }
};
