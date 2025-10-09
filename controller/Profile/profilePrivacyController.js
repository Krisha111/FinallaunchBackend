// controllers/profileController.js
import User from "../../models/User.js";



// PUT /api/users/:id/privacy
// controllers/userController.js
export const togglePrivacy = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // logged-in user
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isPrivate = !user.isPrivate;  // toggle value
    await user.save();                 // ✅ persist in DB

    res.json({ isPrivate: user.isPrivate });
  } catch (err) {
    res.status(500).json({ message: "Error toggling privacy" });
  }
};
export const getProfile = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id)
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isOwner = req.user.id === targetUser._id.toString();
    const isFollower = targetUser.followers.some(
      (f) => f._id.toString() === req.user.id
    );

    // 🔒 if private and not follower, restrict fields
    if (targetUser.isPrivate && !isOwner && !isFollower) {
      return res.json({
        _id: targetUser._id,
        username: targetUser.username,
        profilePic: targetUser.profilePic,
        bio: targetUser.bio,
        isPrivate: true,
        locked: true, // 👈 frontend knows it’s locked
      });
    }

    // otherwise return full profile
    res.json({
      ...targetUser._doc,
      isPrivate: targetUser.isPrivate,
      locked: false,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
