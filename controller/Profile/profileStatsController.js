
import Reel from '../../model/NewDrop/Reel.js';


export const getProfileStats = async (req, res) => {
    const userId = req.user._id; // ✅ Get user ID from token
 
  try {
  
    const userId = req.user._id; // ✅ Get user ID from token
  
    // Count separately for regular & public posts
    const [ regularReelCount] = await Promise.all([
     
      Reel.countDocuments({ user: userId , type: 'regular'}),
     
    ]);
    res.json({
 
      regularReelCount,
 
      
    });
  } catch (error) {
    console.error('❌ Error fetching profile stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};