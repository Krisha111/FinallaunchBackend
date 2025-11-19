import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../model/User.js';
import dotenv from 'dotenv';

dotenv.config(); // ✅ Load env variables (like JWT_SECRET)

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
