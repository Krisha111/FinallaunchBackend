
import User from '../../model/User';
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';



export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (!query || query.trim().length === 0) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: 'i' }
    })
    .select('_id username profileImage bio')
    .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};