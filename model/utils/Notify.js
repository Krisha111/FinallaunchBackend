// server/utils/notify.js
import Notification from '../models/Notification/GetNoti.js';


export async function notify(req, { receiver, sender, type, refs = {} }) {
  if (String(receiver) === String(sender)) return null; // don't notify self

  const doc = await Notification.create({
    receiver,
    sender,
    type,
    ...refs,
  });

  // Populate minimal fields used by DTO
  const populated = await Notification.findById(doc._id)
    .populate('sender', 'username profilePic')
    .populate('post', 'images')
    .populate('reel', 'thumbnail')
    .populate('highlight', 'images')
    .populate('moment', 'images')
    .populate('thought', 'images');

  // Build DTO for immediate emit
  const dto = {
    _id: populated._id,
    type: populated.type,
    isRead: populated.isRead,
    createdAt: populated.createdAt,
    sender: {
      _id: populated.sender._id,
      username: populated.sender.username,
      profilePic: populated.sender.profilePic || null,
    },
    post: populated.post?._id || null,
    reel: populated.reel?._id || null,
    highlight: populated.highlight?._id || null,
    moment: populated.moment?._id || null,
    thought: populated.thought?._id || null,
    previewUrl:
      populated.post?.images?.[0] ||
      populated.highlight?.images?.[0] ||
      populated.moment?.images?.[0] ||
      populated.thought?.images?.[0] ||
      populated.reel?.thumbnail ||
      null,
  };

  // Emit via socket
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers'); // a { userId: socketId } map

  const receiverSocketId = onlineUsers[String(receiver)];
  if (io && receiverSocketId) {
    io.to(receiverSocketId).emit('notification:new', dto);
  }

  return populated;
}
