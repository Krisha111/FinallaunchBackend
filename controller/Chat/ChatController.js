import { Message, Chat } from '../../model/Chat.js';
import User from '../../model/User.js';

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

export const getMessages = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user._id;
    
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(100);
    
    // Only mark messages as read, DON'T mark chat as opened here
    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      { isRead: true }
    );
    
    const otherUser = await User.findById(otherUserId)
      .select('_id username profileImage bio');
    
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      text: msg.message,
      sender: msg.senderId.toString() === currentUserId.toString() 
        ? req.user.username 
        : otherUser.username,
      senderId: msg.senderId,
      timestamp: msg.createdAt,
      isRead: msg.isRead,
    }));
    
    res.json({ messages: formattedMessages, otherUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const sendMessage = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const senderId = req.user._id;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    
    const newMessage = await Message.create({
      senderId,
      receiverId: recipientId,
      message: message.trim(),
    });
    
    let chat = await Chat.findOne({
      participants: { $all: [senderId, recipientId] }
    });
    
    if (!chat) {
      chat = await Chat.create({
        participants: [senderId, recipientId],
        lastMessage: message.trim(),
        lastMessageTime: new Date(),
        lastMessageSender: senderId,
        isOpenedBy: [senderId],
        unreadCount: new Map([[recipientId.toString(), 1]]),
      });
    } else {
      const currentUnread = chat.unreadCount.get(recipientId.toString()) || 0;
      chat.unreadCount.set(recipientId.toString(), currentUnread + 1);
      chat.lastMessage = message.trim();
      chat.lastMessageTime = new Date();
      chat.lastMessageSender = senderId;
      
      if (!chat.isOpenedBy.includes(senderId)) {
        chat.isOpenedBy.push(senderId);
      }
      
      await chat.save();
    }
    
    // ✅ EMIT SOCKET EVENT TO UPDATE CHAT LISTS
    const io = req.app.get('io');
    if (io) {
      io.emit('new_chat_message', {
        chatId: chat._id.toString(),
        senderId: senderId.toString(),
        recipientId: recipientId.toString(),
      });
    }
    
    res.status(201).json({ message: newMessage, chatId: chat._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// export const getNewChats = async (req, res) => {
//   try {
//     const userId = req.user._id;
    
//     const chats = await Chat.find({
//       participants: userId,
//       lastMessage: { $ne: '' }
//     })
//     .populate('participants', '_id username profileImage bio')
//     .populate('lastMessageSender', '_id username')
//     .sort({ lastMessageTime: -1 });
    
//     const formattedChats = chats
//       .filter(chat => {
//         const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
//         return unreadCount > 0;
//       })
//       .map(chat => {
//         const otherUser = chat.participants.find(
//           p => p._id.toString() !== userId.toString()
//         );
        
//         const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
        
//         return {
//           _id: chat._id,
//           otherUser,
//           lastMessage: {
//             text: chat.lastMessage,
//             timestamp: chat.lastMessageTime,
//           },
//           unreadCount,
//         };
//       });
    
//     res.json(formattedChats);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


export const getNewChats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const chats = await Chat.find({
      participants: userId,
      lastMessage: { $ne: '' }
    })
    .populate('participants', '_id username profileImage bio')
    .populate('lastMessageSender', '_id username')
    .sort({ lastMessageTime: -1 });
    
    const formattedChats = chats
      .filter(chat => {
        const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
        const isOpenedByMe = chat.isOpenedBy.some(id => id.toString() === userId.toString());
        
        // ✅ FIX: New chat = has messages AND user hasn't opened it yet
        return !isOpenedByMe && unreadCount > 0;
      })
      .map(chat => {
        const otherUser = chat.participants.find(
          p => p._id.toString() !== userId.toString()
        );
        
        const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
        
        return {
          _id: chat._id,
          otherUser,
          lastMessage: {
            text: chat.lastMessage,
            timestamp: chat.lastMessageTime,
          },
          unreadCount,
        };
      });
    
    console.log(`📊 New chats for user ${userId}:`, formattedChats.length);
    res.json(formattedChats);
  } catch (error) {
    console.error('Error in getNewChats:', error);
    res.status(500).json({ message: error.message });
  }
};



export const markChatAsOpened = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] }
    });

    if (chat) {
      chat.unreadCount.set(userId.toString(), 0);
      
      if (!chat.isOpenedBy.includes(userId)) {
        chat.isOpenedBy.push(userId);
      }
      
      await chat.save();
      
      // ✅ EMIT SOCKET EVENT
      const io = req.app.get('io');
      if (io) {
        io.emit('mark_chat_opened', {
          chatId: chat._id.toString(),
          userId: userId.toString(),
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// export const getMyChats = async (req, res) => {
//   try {
//     const userId = req.user._id;
    
//     const chats = await Chat.find({
//       participants: userId,
//       lastMessage: { $exists: true, $ne: '' } // Only return chats with messages
//     })
//     .populate('participants', '_id username profileImage bio')
//     .populate('lastMessageSender', '_id username')
//     .sort({ lastMessageTime: -1 });
    
//     const formattedChats = chats.map(chat => {
//       const otherUser = chat.participants.find(
//         p => p._id.toString() !== userId.toString()
//       );
      
//       const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
//       const isOpenedByMe = chat.isOpenedBy.some(id => id.toString() === userId.toString());
      
//       console.log(`Chat ${chat._id}: unread=${unreadCount}, opened=${isOpenedByMe}`); // Debug log
      
//       return {
//         _id: chat._id,
//         otherUser,
//         lastMessage: {
//           text: chat.lastMessage,
//           timestamp: chat.lastMessageTime,
//           sender: chat.lastMessageSender?._id,
//         },
//         unreadCount,
//         isOpenedBy: isOpenedByMe, // ✅ This returns boolean correctly
//       };
//     });
    
//     res.json(formattedChats);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


export const getMyChats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const chats = await Chat.find({
      participants: userId,
      lastMessage: { $exists: true, $ne: '' }
    })
    .populate('participants', '_id username profileImage bio')
    .populate('lastMessageSender', '_id username')
    .sort({ lastMessageTime: -1 });
    
    const formattedChats = chats.map(chat => {
      const otherUser = chat.participants.find(
        p => p._id.toString() !== userId.toString()
      );
      
      const unreadCount = chat.unreadCount.get(userId.toString()) || 0;
      const isOpenedByMe = chat.isOpenedBy.some(id => id.toString() === userId.toString());
      
      console.log(`Chat ${chat._id}: unread=${unreadCount}, opened=${isOpenedByMe}, otherUser=${otherUser?.username}`);
      
      return {
        _id: chat._id,
        otherUser,
        lastMessage: {
          text: chat.lastMessage,
          timestamp: chat.lastMessageTime,
          sender: chat.lastMessageSender?._id,
        },
        unreadCount,
        isOpenedBy: isOpenedByMe,
      };
    });
    
    console.log(`📊 Total chats: ${formattedChats.length}, User: ${userId}`);
    res.json(formattedChats);
  } catch (error) {
    console.error('Error in getMyChats:', error);
    res.status(500).json({ message: error.message });
  }
};
