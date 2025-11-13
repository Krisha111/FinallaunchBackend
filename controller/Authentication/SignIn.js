import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../../model/User.js';

export const signInRouteUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

      // ✅ Generate token (same as signup)
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '36500d' }// 100 years = essentially permanent
    );

     res.status(200).json({
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email,
        _id: user._id,
        profileImage: user.profileImage || "",
      },
      token, // ✅ Send back token
    });
  } catch (err) {
    res.status(500).json({ message: 'Error signing in', error: err.message });
  }
};
