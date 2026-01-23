// ================================
// 📁 server.js (Production Ready - Audio/Agora removed)
// ================================

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import signUpRouteUser from './routes/Authentication/SignUp.js';
import signInRouteUser from './routes/Authentication/signIn.js';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import callRoutes from './routes/Call/CallRoute.js'
import requestRoutes from './routes/requestRoutes.js';
import profileInformationRoutes from './routes/Profile/ProfileInformationRoute.js';
import verifyToken from './MiddleWare/verifyToken.js';
import reelRoutes from './routes/NewDrop/Reel.js';
import momentRoutes from './routes/NewDrop/Moment.js';
import thoughtRoutes from './routes/NewDrop/Thought.js';
import postRoutes from './routes/NewDrop/Post.js';
import chatRoutes from './routes/Chat/ChatRoute.js';
import session from 'express-session';
import profileStatsRoutes from './routes/Profile/profileStatsRoute.js';
import MongoStore from 'connect-mongo';
import { fileURLToPath } from 'url';
import User from './model/User.js';

// ================================
// ✅ Load environment variables
// ================================
dotenv.config();

// ================================
// ✅ Directory Setup (for ES Modules)
// ================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================
const app = express();

// ================================
// ✅ MongoDB Connection (Production Ready)
// ================================
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(
      `📍 Connected to: ${MONGODB_URI.includes('mongodb+srv')
        ? 'MongoDB Atlas (Cloud)'
        : 'Local MongoDB'
      }`
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ================================
// ✅ Upload Limits
// ================================
const MAX_UPLOAD_BYTES =
  Number(process.env.MAX_UPLOAD_BYTES) || 200 * 1024 * 1024;

// ================================
// ✅ CORS Configuration (Production + Expo Fix)
// ================================
const isProduction = process.env.NODE_ENV === 'production';

// ✅ Allow both Render production and Expo dev environments
const allowedOrigins = [
  // ✅ Local Expo / Dev URLs
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'http://10.0.2.2:8081',
  'http://192.168.2.16:8081',
  'http://192.168.2.16:8080',
  'exp://192.168.2.16:8081',

  // ✅ Render Production URLs
  'https://finallaunchbackend.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

// ✅ Temporary in-memory store for invites
const invites = [];

const activeCallRooms = new Map(); // Track active calls

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        console.log(`✅ CORS Allowed Origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS Blocked Origin: ${origin}`);
        // Still allow unknown origins for mobile apps (Render mobile-friendly)
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ================================
// ✅ Body Parsers
// ================================
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// ================================
// ✅ Early Content-Length Check
// ================================
app.use((req, res, next) => {
  try {
    const contentLength = req.headers['content-length'];
    if (contentLength && Number(contentLength) > MAX_UPLOAD_BYTES) {
      console.warn(
        `📛 Request rejected: ${contentLength} > ${MAX_UPLOAD_BYTES}`
      );
      return res
        .status(413)
        .json({ message: 'File too large. Increase MAX_UPLOAD_BYTES.' });
    }
  } catch (err) {
    console.warn('Could not parse content-length header:', err?.message || err);
  }
  next();
});

// ================================
// ✅ HTTP + Socket.IO Server (Production Ready)
// ================================
const server = http.createServer(app);
const inviteTimers = new Map();
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow all origins for mobile apps
      if (!origin) return callback(null, true);
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  // maxHttpBufferSize removed (was used for audio chunks)
});

server.timeout = 10 * 60 * 1000;

// ================================
// ✅ Global Socket.IO Objects
// ================================
const onlineUsers = {};
app.set('io', io);
app.set('onlineUsers', onlineUsers);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// ================================
// ✅ Static Files
// ================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================================
// ✅ Session Setup (Production Ready)
// ================================
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      'your_super_secret_key6373764@#^**^FKJN',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      touchAfter: 24 * 3600,
    }),
  })
);

// ================================
// ✅ ROUTES
// ================================


// ✅ Move /api/call BEFORE the root '/' route
app.use('/api/call', callRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/profile', profileStatsRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/moments', momentRoutes);
app.use('/api/thoughts', thoughtRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/profileInformation', profileInformationRoutes);
app.use('/api/requests', requestRoutes);

// ✅ Auth routes LAST (they use '/' which catches everything)
app.use('/auth', signUpRouteUser);
app.use('/', signInRouteUser);




// ================================
// ✅ Auth Check Route
// ================================
app.get('/auth/me', verifyToken, (req, res) => {
  const userId = req.user.id;
  User.findById(userId)
    .then((user) => res.json({ user }))
    .catch(() => res.status(500).json({ message: 'User not found' }));
});

// ================================
// ✅ Health Check Route
// ================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    mongodb:
      mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// ================================
// ✅ SOCKET.IO HANDLERS
// ================================
let userssample = {};
let rooms = {};
let admins = {};
let roomStates = {};

// ✅ Pending invites - OUTSIDE connection handler (persists across connections)
const pendingInvites = new Map();
const connectedUsers = new Map();

// ✅ Track already-sent invites to avoid duplicates
const sentInvites = new Set();
const userSockets = new Map();

// NOTE: Voice/audio handlers removed. Only invites, rooms, messages, sync remain.

// ✅ Helper function to create consistent room names (PLACE BEFORE io.on)
function createRoomName(user1, user2) {
  const sorted = [user1, user2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}



io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);
 socket.on('register_user', (userId) => {
    socket.userId = userId;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // ✅ ADD THIS - inside io.on('connection', (socket) => { ... })
socket.on('get_active_users', () => {
  const activeUsersList = Object.values(userssample);
  socket.emit('active_users', activeUsersList);
  console.log(`📤 Sent ${activeUsersList.length} active users to ${socket.username || 'unknown'}`);
});

  socket.on('cancel_invite', ({ to, from }) => {
    console.log(`❌ ${from} cancelled invite to ${to}`);

    const userInvites = pendingInvites.get(to) || [];
    const inviteIndex = userInvites.findIndex((inv) => inv.from === from && inv.status === 'pending');

    if (inviteIndex !== -1) {
      const inviteId = userInvites[inviteIndex].id;

      if (inviteTimers.has(inviteId)) {
        clearTimeout(inviteTimers.get(inviteId));
        inviteTimers.delete(inviteId);
      }

      userInvites.splice(inviteIndex, 1);

      const recipientUser = userssample[to];
      if (recipientUser?.socketId) {
        const recipientSocket = io.sockets.sockets.get(recipientUser.socketId);
        if (recipientSocket) {
          recipientSocket.emit('invite_cancelled', { inviteId, from });
          const pendingOnly = userInvites.filter((inv) => inv.status === 'pending');
          recipientSocket.emit('pending_invites', pendingOnly);
        }
      }
    }

    socket.emit('invite_cancelled_confirm', { to });
  });


  // ================================
// ✅ CHAT MESSAGE HANDLERS (Add after line ~200)
// ================================
socket.on('join_chat_room', ({ chatId, userId }) => {
  socket.join(`chat_${chatId}`);
  console.log(`💬 User ${userId} joined chat room: chat_${chatId}`);
});

socket.on('leave_chat_room', ({ chatId }) => {
  socket.leave(`chat_${chatId}`);
  console.log(`📤 User left chat room: chat_${chatId}`);
});

socket.on('new_chat_message', ({ chatId, senderId, recipientId }) => {
  console.log(`💬 New message in chat ${chatId}`);
  
  // Notify recipient to refresh their chat list
  io.to(recipientId.toString()).emit('chat_list_update', { chatId });
  
  // Also emit to chat room if both users are in it
  io.to(`chat_${chatId}`).emit('message_received', { chatId });
});

socket.on('mark_chat_opened', ({ chatId, userId }) => {
  console.log(`👁️ User ${userId} opened chat ${chatId}`);
  
  // Notify all users in this chat that it was opened
  io.to(`chat_${chatId}`).emit('chat_opened', { chatId, userId });
});


  // ================================
  // ✅ USER ROOM HANDLERS
  // ================================
  socket.on('join_user_room', (userId) => {
    if (!userId) {
      console.warn('⚠️ No userId provided for join_user_room');
      return;
    }

    console.log(`📍 User ${userId} joining room 
      (socket: ${socket.id})`);

    socket.join(userId);
    connectedUsers.set(userId, socket.id);

    console.log(`✅ User ${userId} joined their room`);
    console.log(`👥 Total connected users: ${connectedUsers.size}`);
  });

  socket.on('leave_user_room', (userId) => {
    if (!userId) return;

    console.log(`📤 User ${userId} leaving room`);
    socket.leave(userId);
    connectedUsers.delete(userId);
  });

  // ================================
  // ✅ USER CONNECTION HANDLERS
  // ================================
  socket.on('user-connected', (userId) => {
    onlineUsers[userId] = socket.id;
    console.log(`👤 User connected: ${userId}`);
  });


  // socket.on('register', async ({ username, userId }) => {
  //   if (!username || !userId) {
  //     console.warn('⚠️ Registration failed: missing username or userId');
  //     return;
  //   }
    
  //   console.log(`✅ Registering: ${username} (${userId})`);
    
  //   socket.username = username;
  //   socket.userId = userId;
  //   socket.join(userId.toString());

  //   let profileImage = '';
  //   let bio = '';

  //   userSockets.set(userId.toString(), socket.id);

  //   try {
  //     const user = await User.findOne({ username });
  //     if (user?.profileImage) profileImage = user.profileImage;
  //     if (user?.bio) bio = user.bio;
  //   } catch (err) {
  //     console.error('Error fetching user profile:', err.message);
  //   }

  //   userssample[username] = {
  //     socketId: socket.id,
  //     username,
  //     userId,
  //     profileImage,
  //     bio,
  //   };

  //   const activeUsersList = Object.values(userssample);
  //   console.log(`👥 Broadcasting ${activeUsersList.length} active users`);
    
  //   // Emit to ALL connected clients
  //   io.emit('active_users', activeUsersList);
  // });


  // ✅ REMOVE the duplicate socket.on('register') around line 350
// Keep only ONE register handler:

socket.on('register', async ({ username, userId }) => {
  if (!username || !userId) {
    console.warn('⚠️ Registration failed: missing username or userId');
    return;
  }
  
  console.log(`✅ Registering: ${username} (${userId})`);
  
  socket.username = username;
  socket.userId = userId;
  socket.join(userId.toString());

  let profileImage = '';
  let bio = '';

  userSockets.set(userId.toString(), socket.id);

  try {
    const user = await User.findOne({ username });
    if (user?.profileImage) profileImage = user.profileImage;
    if (user?.bio) bio = user.bio;
  } catch (err) {
    console.error('Error fetching user profile:', err.message);
  }

  userssample[username] = {
    socketId: socket.id,
    username,
    userId,
    profileImage,
    bio,
  };

  const activeUsersList = Object.values(userssample);
  console.log(`👥 Broadcasting ${activeUsersList.length} active users`);
  
  // ✅ Broadcast to ALL clients immediately
  io.emit('active_users', activeUsersList);
  
  // ✅ Also send directly to the newly connected user
  socket.emit('active_users', activeUsersList);
});
  
  // socket.on('register', async ({ username, userId }) => {
  //   if (!username) return;
  //   console.log(`✅ Registered: ${username} (${userId})`);
  //   socket.join(userId.toString());
  //   socket.username = username;
  //   socket.userId = userId;

  //   let profileImage = '';
  //   let bio = '';

  //   userSockets.set(userId.toString(), socket.id);
  //   socket.join(userId.toString());

  //   try {
  //     const user = await User.findOne({ username });
  //     if (user?.profileImage) profileImage = user.profileImage;
  //     if (user?.bio) bio = user.bio;
  //   } catch (err) {
  //     console.error('Error fetching user profile:', err.message);
  //   }

  //   userssample[username] = {
  //     socketId: socket.id,
  //     username,
  //     userId,
  //     profileImage,
  //     bio,
  //   };

  //   console.log(`✅ Registered: ${username} (${socket.id})`);
  //   io.emit('active_users', Object.values(userssample));
  // });

  // ================================
  // ✅ ACCEPT INVITE FROM NOTIFICATION
  // ================================
  // ================================
  // BACKEND FIX - Replace your room creation logic
  // ================================

  // ✅ ADD THIS HELPER FUNCTION at the top of your socket handlers
  function createRoomName(user1, user2) {
    // Always put users in alphabetical order for consistency
    const sorted = [user1, user2].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  // ================================
  // UPDATE: accept_invite_from_notification
  // ================================
  socket.on('accept_invite_from_notification', ({ inviteId, from, to }) => {
    console.log(`✅ ${to} accepting invite from ${from} via notification`);

    io.to(from).emit('invite_removed', { inviteId });
    io.to(to).emit('invite_removed', { inviteId });

    if (inviteTimers.has(inviteId)) {
      clearTimeout(inviteTimers.get(inviteId));
      inviteTimers.delete(inviteId);
    }

    const userInvites = pendingInvites.get(to) || [];
    const inviteIndex = userInvites.findIndex((inv) => inv.id === inviteId);

    if (inviteIndex !== -1) {
      userInvites.splice(inviteIndex, 1);
    }

    const remainingInvites = userInvites.filter((inv) => inv.status === 'pending');
    const receiver = userssample[to];
    if (receiver?.socketId) {
      io.to(receiver.socketId).emit('pending_invites', remainingInvites);
    }

    // ✅ USE CONSISTENT ROOM NAMING
    const room = `reel_${createRoomName(from, to)}`;

    console.log('📋 Created room:', room);
    socket.join(room);

    const fromUser = userssample[from];
    if (fromUser?.socketId) {
      const fromSocket = io.sockets.sockets.get(fromUser.socketId);
      if (fromSocket) {
        fromSocket.join(room);

        const currentIndex = 0;
        roomStates[room] = { currentIndex, isPlaying: true };
        admins[room] = from;
        rooms[to] = room;
        rooms[from] = room;

        console.log(`✅ Room created: ${room} | Admin: ${from}`);

        io.to(fromUser.socketId).emit('invite_accepted', {
          by: to,
          from: from,
          room,
          isAdmin: true,
          currentReelIndex: currentIndex,
        });

        io.to(socket.id).emit('invite_accepted', {
          by: to,
          from: from,
          room,
          isAdmin: false,
          currentReelIndex: currentIndex,
        });

        console.log(`📤 Sent invite_accepted to both users`);
      }
    } else {
      socket.emit('invite_accept_failed', {
        message: `${from} is currently offline`,
      });
    }
  });

  // ================================
  // UPDATE: accept_invite (regular)
  // ================================
  socket.on('accept_invite', ({ from }) => {
    console.log(`✅ ${socket.username} accepting invite from ${from}`);

    // ✅ USE CONSISTENT ROOM NAMING
    const room = createRoomName(from, socket.username);
    console.log('📋 Created room:', room);
    socket.join(room);

    const userInvites = pendingInvites.get(socket.username) || [];
    const inviteIndex = userInvites.findIndex((inv) => inv.from === from && inv.status === 'pending');

    if (inviteIndex !== -1) {
      const inviteId = userInvites[inviteIndex].id;

      if (inviteTimers.has(inviteId)) {
        clearTimeout(inviteTimers.get(inviteId));
        inviteTimers.delete(inviteId);
      }

      userInvites.splice(inviteIndex, 1);
    }

    const remainingInvites = userInvites.filter((inv) => inv.status === 'pending');
    socket.emit('pending_invites', remainingInvites);

    const fromUser = userssample[from];
    if (fromUser?.socketId) {
      const fromSocket = io.sockets.sockets.get(fromUser.socketId);
      if (fromSocket) {
        fromSocket.join(room);

        const currentIndex = 0;
        roomStates[room] = { currentIndex, isPlaying: true };
        admins[room] = from;
        rooms[socket.username] = room;
        rooms[from] = room;

        console.log(`✅ Room created: ${room} | Admin: ${from}`);

        io.to(fromUser.socketId).emit('invite_accepted', {
          by: socket.username,
          from: from,
          room,
          isAdmin: true,
          currentReelIndex: currentIndex,
        });

        io.to(socket.id).emit('invite_accepted', {
          by: socket.username,
          from: from,
          room,
          isAdmin: false,
          currentReelIndex: currentIndex,
        });

        console.log(`📤 Sent invite_accepted to both users`);
      }
    } else {
      socket.emit('invite_accept_failed', {
        message: `${from} is currently offline`,
      });
    }
  });


  
  socket.on('send-notification', (data) => {
    const { receiverId } = data;

    // Use userSockets instead of onlineUsers
    const receiverSocket = userSockets.get(receiverId?.toString());

    if (receiverSocket) {
      // Emit to specific socket only ONCE
      io.to(receiverSocket).emit('new_notification', data);
      console.log(`🔔 Notification sent to ${receiverId}`);
    } else {
      console.log(`⚠️ Receiver ${receiverId} not connected`);
    }
  });
  socket.on('change_reel', ({ room, reelUrl }) => {
    io.to(room).emit('reel_updated', { reelUrl });
    console.log(`🎬 Reel changed in room ${room}`);
  });

  // ================================
  // ✅ SEND INVITE WITH TIMER
  // ================================
  socket.on("send_invite", ({ to, from }) => {
    const inviteId = `${from}-${to}-${Date.now()}`;
    const timestamp = Date.now();

    const invite = { id: inviteId, from, to, timestamp, status: 'pending' };

    if (!pendingInvites.has(to)) {
      pendingInvites.set(to, []);
    }
    pendingInvites.get(to).push(invite);

    console.log(`📨 ${from} sent invite to ${to}`);

    const recipientUser = userssample[to];
    if (recipientUser?.socketId) {
      const recipientSocket = io.sockets.sockets.get(recipientUser.socketId);
      if (recipientSocket) {
        recipientSocket.emit("receive_invite", invite);
        const userInvites = pendingInvites.get(to) || [];
        const pendingOnly = userInvites.filter((inv) => inv.status === 'pending');
        recipientSocket.emit('pending_invites', pendingOnly);
      }
    }

    const timer = setTimeout(() => {
      console.log(`⏰ Invite ${inviteId} expired after 1 minute`);

      const userInvites = pendingInvites.get(to) || [];
      const inviteIndex = userInvites.findIndex((inv) => inv.id === inviteId);

      if (inviteIndex !== -1 && userInvites[inviteIndex].status === 'pending') {
        userInvites[inviteIndex].status = 'expired';

        const recipientUser = userssample[to];
        if (recipientUser?.socketId) {
          const recipientSocket = io.sockets.sockets.get(recipientUser.socketId);
          if (recipientSocket) {
            recipientSocket.emit('invite_expired', { inviteId, from });
            const pendingOnly = userInvites.filter((inv) => inv.status === 'pending');
            recipientSocket.emit('pending_invites', pendingOnly);
          }
        }

        const senderUser = userssample[from];
        if (senderUser?.socketId) {
          const senderSocket = io.sockets.sockets.get(senderUser.socketId);
          if (senderSocket) {
            senderSocket.emit('invite_expired_sender', { to });
          }
        }
      }

      inviteTimers.delete(inviteId);
    }, 60000);

    inviteTimers.set(inviteId, timer);
    socket.emit('invite_sent', { to, success: true });
  });

  // ================================
  // ✅ SIMPLE INVITE (Alternative)
  // ================================
  socket.on('send_invite_simple', (data) => {
    const { from, to, roomId } = data || {};
    console.log(`📨 [simple] Sending ReelChatt invite from ${from} to ${to}`);
    io.to(to).emit('receive_invite', {
      id: `invite_${Date.now()}`,
      from,
      roomId,
      timestamp: Date.now()
    });
  });

  // ================================
  // ✅ GET PENDING INVITES
  // ================================
  socket.on('get_pending_invites', ({ username }) => {
    const invites = pendingInvites.get(username) || [];
    const pendingOnly = invites.filter((inv) => inv.status === 'pending');
    socket.emit('pending_invites', pendingOnly);
    console.log(`📬 Sent ${pendingOnly.length} pending invites to ${username}`);
  });


  // ================================
  // ✅ REJECT INVITE
  // ================================
  socket.on('reject_invite', ({ inviteId, username }) => {
    const userInvites = pendingInvites.get(username) || [];
    const inviteIndex = userInvites.findIndex((inv) => inv.id === inviteId);
    io.to(username).emit('invite_removed', { inviteId });
    // ✅ NEW: Emit to both users to remove the invite
    // io.to(data.username).emit('invite_removed', { inviteId: data.inviteId });
    if (inviteTimers.has(inviteId)) {
      clearTimeout(inviteTimers.get(inviteId));
      inviteTimers.delete(inviteId);
    }
    if (inviteIndex !== -1) {
      userInvites.splice(inviteIndex, 1);
      console.log(`❌ Invite ${inviteId} rejected and removed`);

      const remainingInvites = userInvites.filter((inv) => inv.status === 'pending');
      socket.emit('pending_invites', remainingInvites);
      socket.emit('invite_rejected', { inviteId });
    }
  });


socket.on('send_message', ({ room, to, from, message, chatId, toUserId, fromUserId }) => {
  console.log(`💬 Socket Message from ${from} to ${to}`);
  console.log(`📋 Message: "${message?.substring(0, 50)}"`);
  console.log(`📋 UserIds: ${fromUserId} → ${toUserId}`);
  
  // ✅ Emit to recipient
  const recipientSocketId = userSockets.get(toUserId?.toString());
  if (recipientSocketId) {
    io.to(recipientSocketId).emit('receive_message', {
      from,
      to,
      message,
      chatId,
      timestamp: new Date().toISOString(),
    });
    console.log(`✅ Message sent to recipient socket: ${recipientSocketId}`);
  } else {
    console.log(`⚠️ Recipient ${to} (${toUserId}) not connected`);
  }
  
  // ✅ ALSO emit to sender (for multi-device sync)
  const senderSocketId = userSockets.get(fromUserId?.toString());
  if (senderSocketId && senderSocketId !== socket.id) {
    io.to(senderSocketId).emit('receive_message', {
      from,
      to,
      message,
      chatId,
      timestamp: new Date().toISOString(),
    });
    console.log(`✅ Message echoed to sender's other devices`);
  }
  
  // ✅ Emit chat list updates using userId rooms
  if (fromUserId) {
    io.to(fromUserId.toString()).emit('chat_list_update', { chatId });
  }
  if (toUserId) {
    io.to(toUserId.toString()).emit('chat_list_update', { chatId });
    // ✅ Also emit specific event for new messages
    io.to(toUserId.toString()).emit('new_chat_message', { 
      chatId, 
      from, 
      message: message?.substring(0, 100) 
    });
  }
});

  // ================================
  // ✅ SYNC REEL INDEX
  // ================================
  socket.on('sync_reel_index', ({ room, index }) => {
    // ✅ Allow anyone to sync, not just admin
    if (roomStates[room]) {
      roomStates[room].currentIndex = index;
    } else {
      roomStates[room] = { currentIndex: index, isPlaying: true };
    }
    console.log(
      `🔄 ${socket.username} synced reel index to ${index} in room ${room}`
    );
    // ✅ Broadcast to everyone in room including sender
    io.to(room).emit('sync_reel_index', { index });
  });

  // ================================
  // ✅ SEND ACTIVITY
  // ================================
  socket.on('send_activity', ({ room, activity, username }) => {
    console.log(`📊 Activity in ${room}: ${username} - ${activity}`);
    socket.to(room).emit('user_activity', { activity, username });
  });

  // ================================
  // ✅ REEL PLAY STATE
  // ================================
  socket.on('reel_play', ({ room, index, isPlaying }) => {
    // ✅ Allow anyone to control play state, not just admin
    if (roomStates[room]) {
      roomStates[room].currentIndex = index;
      roomStates[room].isPlaying = isPlaying;
    } else {
      roomStates[room] = { currentIndex: index, isPlaying };
    }
    console.log(
      `▶️ ${socket.username} set play state: index=${index}, isPlaying=${isPlaying} in room ${room}`
    );
    // ✅ Broadcast to everyone in room including sender
    io.to(room).emit('reel_play_state', { index, isPlaying });
  });
  // Add this new event handler in your socket configuration
  socket.on('request_room_reel_order', ({ room }, callback) => {
    console.log(`📋 Room ${room} requesting reel order`);

    // Check if this room already has a reel order stored
    if (!global.roomReelOrders) {
      global.roomReelOrders = {};
    }

    if (global.roomReelOrders[room]) {
      // Return existing order for this room
      callback({ reelOrder: global.roomReelOrders[room] });
    } else {
      // No order exists yet, admin will create it
      callback({ reelOrder: null });
    }
  });

  socket.on('set_room_reel_order', ({ room, reelOrder }) => {
    console.log(`🔄 Setting reel order for room ${room}`);

    if (!global.roomReelOrders) {
      global.roomReelOrders = {};
    }

    // Store the reel order for this room
    global.roomReelOrders[room] = reelOrder;

    // Broadcast to all users in the room
    io.to(room).emit('room_reel_order_set', { reelOrder });
  });
  // ================================
  // ✅ ADMIN LEFT ROOM
  // ================================
  socket.on('admin_left_room', ({ room }) => {
    if (global.roomReelOrders) {
      delete global.roomReelOrders[room];
    }
    const adminName = socket.username;
    io.to(room).emit('admin_left', { adminName: socket.username });
    socket.leave(room);
    delete admins[room];
    delete roomStates[room];
    for (const [user, userRoom] of Object.entries(rooms)) {
      if (userRoom === room) {
        delete rooms[user];
      }
    }
    console.log(`👋 Admin ${adminName} left room ${room}`);
  });


  // ✅ MUST match frontend exactly
  function sanitizeChannelName(room) {
    if (!room) return 'default';
    let clean = room.replace(/^reel_/, '');
    clean = clean.replace(/[^a-zA-Z0-9_-]/g, '');
    return (clean.substring(0, 64) || 'fallback').toLowerCase();
  }

  


  // ✅ Update disconnect handler - add this inside your existing disconnect handler
  socket.on('disconnect', () => {
    // ... existing disconnect code ...

    // ✅ Handle call cleanup on disconnect
    activeCallRooms.forEach(call => {
      if (call.participants.includes(socket.username)) {
        call.disconnectedAt = Date.now();
        console.log(`⚠️ ${socket.username} disconnected from call ${call.callId}`);
      }
    });


    // ... rest of existing disconnect code ...
  });

  // ================================
  // ✅ DISCONNECT HANDLER
  // ================================
  socket.on('disconnect', () => {
    // Inside socket.on('disconnect', ...) - add this near the end:
    activeCallRooms.forEach((callData, callRoom) => {
      if (callData.participants.includes(socket.username)) {
        activeCallRooms.delete(callRoom);
        io.to(callRoom).emit('call_ended', { room: callRoom });
      }
    });

    // Remove user from socket map
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`🔴 User ${userId} disconnected`);
        break;
      }
    }

    console.log(
      `🔴 Client disconnected: ${socket.id} (${socket.username || 'Unknown'})`
    );

    if (socket.username) {
      delete userssample[socket.username];
    }

    for (const [uid, sid] of Object.entries(onlineUsers)) {
      if (sid === socket.id) {
        delete onlineUsers[uid];
      }
    }

    for (const [uid, sid] of connectedUsers.entries()) {
      if (sid === socket.id) {
        connectedUsers.delete(uid);
      }
    }

    const room = rooms[socket.username];
    const wasAdmin = admins[room] === socket.username;

    if (room) {
      delete rooms[socket.username];
      if (wasAdmin) {
        delete admins[room];
        delete roomStates[room];
        io.to(room).emit('admin_left', { adminName: socket.username });
        for (const [user, userRoom] of Object.entries(rooms)) {
          if (userRoom === room) {
            delete rooms[user];
          }
        }
      }
    }

    io.emit('active_users', Object.values(userssample));
  });
});

// ================================
// ✅ CLEANUP OLD INVITES (Periodic Task)
// ================================
// ================================
// ✅ CLEAN UP DEAD CALLS
// ================================
setInterval(() => {
  const now = Date.now();

  activeCallRooms.forEach((call, callId) => {
    if (
      call.disconnectedAt &&
      now - call.disconnectedAt > 20000 // 20 seconds
    ) {
      io.to(call.reelRoom).emit('call_ended', { callId });
      activeCallRooms.delete(callId);
      console.log(`📴 Call ${callId} cleaned up`);
    }
  });
}, 5000);


app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// ================================
// ✅ Error Handler
// ================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ================================
// ✅ Graceful Shutdown
// ================================
process.on('SIGTERM', async () => {
  console.log('SIGTERM: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');

    // Clear all timers
    inviteTimers.forEach(timer => clearTimeout(timer));
    inviteTimers.clear();

    await mongoose.connection.close();
    console.log('MongoDB closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');

    // Clear all timers
    inviteTimers.forEach(timer => clearTimeout(timer));
    inviteTimers.clear();

    await mongoose.connection.close();
    console.log('MongoDB closed');
    process.exit(0);
  });
});

// ================================
// ✅ Start Server (Dynamic Port for Render)
// ================================
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 ReelChatt Server Started Successfully!');
  console.log('='.repeat(50));
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  if (!isProduction) {
    console.log(`🌐 Network URL: http://192.168.2.16:${PORT}`);
  }
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔓 CORS: ${isProduction ? 'Production (Mobile Friendly)' : 'Development (Allow All)'
    }`
  );
  console.log(
    `💾 MongoDB: ${MONGODB_URI.includes('mongodb+srv') ? 'Atlas (Cloud)' : 'Local'
    }`
  );
  console.log(`🔌 Socket.IO: Active`);
  console.log('='.repeat(50) + '\n');
  console.log('📡 Active Features:');
  console.log('   ✅ User Registration & Authentication');
  console.log('   ✅ Real-time Reel Synchronization');
  console.log('   ✅ Text Chat & Media Sharing');
  console.log('   ✅ Invite System with Expiration');
  console.log('   ✅ Admin/Viewer Roles');
  console.log('='.repeat(50) + '\n');
});

// Export io and connectedUsers so other modules can access them
export { io, connectedUsers };

// ================================
// ✅ Unhandled Promise Rejection
// ================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
