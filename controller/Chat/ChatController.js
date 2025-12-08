import { Message, Chat } from '../../model/Chat.js';
import User from '../../model/User.js';

export const getUnopenedChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: userId,
      isOpenedBy: { $ne: userId },
      lastMessageSender: { $ne: userId }
    })
    .populate('participants', 'username profileImage')
    .populate('lastMessageSender', 'username profileImage')
    .sort({ lastMessageTime: -1 });

    const unopenedChats = chats.map(chat => {
      const otherUser = chat.participants.find(p => p._id.toString() !== userId);
      return {
        id: chat._id,
        userId: otherUser._id,
        userName: otherUser.username,
        userPhoto: otherUser.profileImage,
        lastMessage: chat.lastMessage,
        lastMessageTime: formatTime(chat.lastMessageTime),
        unreadCount: chat.unreadCount.get(userId) || 0
      };
    });

    res.json(unopenedChats);
  } catch (error) {
    console.error('Get unopened chats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getNewChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: userId,
      isOpenedBy: userId,
      [`unreadCount.${userId}`]: { $gt: 0 }
    })
    .populate('participants', 'username profileImage')
    .populate('lastMessageSender', 'username profileImage')
    .sort({ lastMessageTime: -1 });

    const newChats = chats.map(chat => {
      const otherUser = chat.participants.find(p => p._id.toString() !== userId);
      return {
        id: chat._id,
        userId: otherUser._id,
        userName: otherUser.username,
        userPhoto: otherUser.profileImage,
        lastMessage: chat.lastMessage,
        lastMessageTime: formatTime(chat.lastMessageTime),
        unreadCount: chat.unreadCount.get(userId) || 0
      };
    });

    res.json(newChats);
  } catch (error) {
    console.error('Get new chats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMemories = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: userId,
      isOpenedBy: userId,
      $or: [
        { [`unreadCount.${userId}`]: 0 },
        { [`unreadCount.${userId}`]: { $exists: false } }
      ]
    })
    .populate('participants', 'username profileImage')
    .populate('lastMessageSender', 'username profileImage')
    .sort({ lastMessageTime: -1 });

    const memories = chats.map(chat => {
      const otherUser = chat.participants.find(p => p._id.toString() !== userId);
      return {
        id: chat._id,
        userId: otherUser._id,
        userName: otherUser.username,
        userPhoto: otherUser.profileImage,
        lastMessage: chat.lastMessage,
        lastMessageTime: formatTime(chat.lastMessageTime),
        unreadCount: 0
      };
    });

    res.json(memories);
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markChatAsOpened = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isOpenedBy.includes(userId)) {
      chat.isOpenedBy.push(userId);
      await chat.save();
    }

    res.json({ message: 'Chat marked as opened', chatId });
  } catch (error) {
    console.error('Mark chat as opened error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ message: 'Receiver ID and message are required' });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      message,
      isRead: false,
      isOpened: false
    });

    await newMessage.save();

    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!chat) {
      chat = new Chat({
        participants: [senderId, receiverId],
        lastMessage: message,
        lastMessageTime: new Date(),
        lastMessageSender: senderId,
        unreadCount: new Map([[receiverId, 1]])
      });
    } else {
      chat.lastMessage = message;
      chat.lastMessageTime = new Date();
      chat.lastMessageSender = senderId;
      
      const currentCount = chat.unreadCount.get(receiverId) || 0;
      chat.unreadCount.set(receiverId, currentCount + 1);
    }

    await chat.save();
    await newMessage.populate('senderId', 'username profileImage');

    res.status(201).json({
      id: newMessage._id,
      senderId: newMessage.senderId._id,
      senderName: newMessage.senderId.username,
      senderPhoto: newMessage.senderId.profileImage,
      message: newMessage.message,
      createdAt: newMessage.createdAt,
      isRead: newMessage.isRead
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    })
    .populate('senderId', 'username profileImage')
    .populate('receiverId', 'username profileImage')
    .sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, isRead: false },
      { $set: { isRead: true, isOpened: true } }
    );

    const chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] }
    });

    if (chat) {
      chat.unreadCount.set(userId, 0);
      if (!chat.isOpenedBy.includes(userId)) {
        chat.isOpenedBy.push(userId);
      }
      await chat.save();
    }

    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      senderId: msg.senderId._id,
      senderName: msg.senderId.username,
      senderPhoto: msg.senderId.profileImage,
      receiverId: msg.receiverId._id,
      message: msg.message,
      createdAt: msg.createdAt,
      isRead: msg.isRead,
      isMine: msg.senderId._id.toString() === userId
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function formatTime(date) {
  const now = new Date();
  const messageDate = new Date(date);
  const diffInMs = now - messageDate;
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}