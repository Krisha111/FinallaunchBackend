import Post from '../../models/NewDrop/Post.js';
import Reel from '../../model/NewDrop/Reel.js';
import Highlight from '../../models/NewDrop/HighLight.js';
import Thought from '../../models/NewDrop/Thought.js';
import Moment from '../../models/NewDrop/Moment.js';
// Get all public posts by a specific user
export const getAllPublicContent = async (req, res) => {
  try {
    const { userId } = req.query;

    const [posts, reels, thoughts, highlights] = await Promise.all([
      Post.find({ user: userId, type: 'public' }).sort({ createdAt: -1 }),
      Reel.find({ user: userId, type: 'public' }).sort({ createdAt: -1 }),
      Thought.find({ user: userId, type: 'public' }).sort({ createdAt: -1 }),
      Highlight.find({ user: userId, type: 'public' }).sort({ createdAt: -1 }), // ✅ corrected here
    ]);

    const combined = [
      ...posts.map(post => ({ ...post.toObject(), contentType: 'post' })),
      ...reels.map(reel => ({ ...reel.toObject(), contentType: 'reel' })),
      ...thoughts.map(thought => ({ ...thought.toObject(), contentType: 'thought' })),
      ...highlights.map(highlight => ({ ...highlight.toObject(), contentType: 'highlight' })),
    ];

    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(combined);
  } catch (error) {
    console.error('Error fetching user public content:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};