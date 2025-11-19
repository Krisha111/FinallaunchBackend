// ================================
// 📁 server.js (Production Ready + Agora Voice Chat Support)
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

import requestRoutes from './routes/requestRoutes.js';
import profileInformationRoutes from './routes/Profile/ProfileInformationRoute.js';
import verifyToken from './MiddleWare/verifyToken.js';
import reelRoutes from './routes/NewDrop/Reel.js';
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
  maxHttpBufferSize: 1e8,
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
app.use('/api/profile', profileStatsRoutes);
app.use('/auth', signUpRouteUser);
app.use('/', signInRouteUser);
app.use('/api/reels', reelRoutes);
app.use('/api/profileInformation', profileInformationRoutes);
app.use('/api/requests', requestRoutes);

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

// ✅ NEW: Track voice chat state per room
const voiceChatRooms = new Map(); // room -> { users: Set, startTime: Date }

// ✅ ALL socket.on() handlers MUST be INSIDE this io.on('connection') block
io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  // ================================
  // ✅ AGORA VOICE CHAT HANDLERS (NEW)
  // ================================
  
  socket.on('voice_chat_joined', ({ room, username }) => {
    console.log(`🎤 ${username} joined voice chat in room: ${room}`);
    
    // Initialize voice chat room if not exists
    if (!voiceChatRooms.has(room)) {
      voiceChatRooms.set(room, {
        users: new Set(),
        startTime: new Date(),
      });
    }
    
    // Add user to voice chat
    const voiceRoom = voiceChatRooms.get(room);
    voiceRoom.users.add(username);
    
    // Notify other users in the room
    socket.to(room).emit('voice_chat_user_joined', { 
      username,
      totalUsers: voiceRoom.users.size 
    });
    
    console.log(`✅ Voice chat in ${room}: ${voiceRoom.users.size} users connected`);
  });

  socket.on('voice_chat_mute_status', ({ room, username, isMuted }) => {
    console.log(`${isMuted ? '🔇' : '🎤'} ${username} ${isMuted ? 'muted' : 'unmuted'} in room: ${room}`);
    
    // Broadcast mute status to other users in the room
    socket.to(room).emit('voice_chat_mute_status', { 
      username, 
      isMuted 
    });
  });

  socket.on('voice_chat_left', ({ room, username }) => {
    console.log(`👋 ${username} left voice chat in room: ${room}`);
    
    // Remove user from voice chat
    if (voiceChatRooms.has(room)) {
      const voiceRoom = voiceChatRooms.get(room);
      voiceRoom.users.delete(username);
      
      // Notify other users
      socket.to(room).emit('voice_chat_user_left', { 
        username,
        totalUsers: voiceRoom.users.size 
      });
      
      // Clean up empty voice chat rooms
      if (voiceRoom.users.size === 0) {
        voiceChatRooms.delete(room);
        console.log(`🧹 Voice chat room ${room} cleaned up (empty)`);
      }
    }
  });

  // ================================
  // ✅ ICE CANDIDATE HANDLER (for future WebRTC if needed)
  // ================================
  socket.on('ice_candidate', ({ room, candidate, from }) => {
    console.log(`🧊 ICE candidate from ${from} in room ${room}`);
    socket.to(room).emit('ice_candidate', { candidate, from });
  });

  // ================================
  // ✅ CANCEL INVITE HANDLER
  // ================================
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
  // ✅ USER ROOM HANDLERS
  // ================================
  socket.on('join_user_room', (userId) => {
    if (!userId) {
      console.warn('⚠️ No userId provided for join_user_room');
      return;
    }

    console.log(`📍 User ${userId} joining room (socket: ${socket.id})`);
    
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

  socket.on('register', async ({ username, userId }) => {
    if (!username) return;
    console.log(`✅ Registered: ${username} (${userId})`);
    socket.join(userId.toString()); 
    socket.username = username;
    socket.userId = userId;

    let profileImage = '';
    let bio = '';
    
    userSockets.set(userId.toString(), socket.id);
    socket.join(userId.toString());
    
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

    console.log(`✅ Registered: ${username} (${socket.id})`);
    io.emit('active_users', Object.values(userssample));
  });

  // ================================
  // ✅ ACCEPT INVITE FROM NOTIFICATION
  // ================================
  socket.on('accept_invite_from_notification', ({ inviteId, from, to }) => {
    console.log(`✅ ${to} accepting invite from ${from} via notification`);
    
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

    const room = `${from}-${to}`;
    
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

        console.log(`✅ Room created: ${room} | Admin: ${from} | Index: ${currentIndex}`);

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
  // ✅ SEND NOTIFICATION
  // ================================
  socket.on('send-notification', (data) => {
    const { receiverId } = data;
    const receiverSocket = onlineUsers[receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit('new_notification', data);
      console.log(`🔔 Notification sent to ${receiverId}`);
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

  // ================================
  // ✅ ACCEPT INVITE (Regular)
  // ================================
  socket.on('accept_invite', ({ from }) => {
    console.log(`✅ ${socket.username} accepting invite from ${from}`);
    
    const room = `${from}-${socket.username}`;
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

  // ================================
  // ✅ SEND MESSAGE
  // ================================
  socket.on('send_message', ({ room, message, sender }) => {
    console.log(
      `💬 Message in ${room} from ${sender}: ${message.substring(0, 50)}`
    );
    io.to(room).emit('receive_message', { sender, message });
  });

  // ================================
  // ✅ SYNC REEL INDEX
  // ================================
  socket.on('sync_reel_index', ({ room, index }) => {
    const admin = admins[room];
    if (socket.username === admin) {
      if (roomStates[room]) {
        roomStates[room].currentIndex = index;
      } else {
        roomStates[room] = { currentIndex: index, isPlaying: true };
      }
      console.log(
        `🔄 Admin ${socket.username} synced reel index to ${index} in room ${room}`
      );
      socket.to(room).emit('sync_reel_index', { index });
    }
  });

  // ================================
  // ✅ REEL PLAY STATE
  // ================================
  socket.on('reel_play', ({ room, index, isPlaying }) => {
    const admin = admins[room];
    if (socket.username === admin) {
      if (roomStates[room]) {
        roomStates[room].currentIndex = index;
        roomStates[room].isPlaying = isPlaying;
      } else {
        roomStates[room] = { currentIndex: index, isPlaying };
      }
      console.log(
        `▶️ Admin ${socket.username} set play state: index=${index}, isPlaying=${isPlaying} in room ${room}`
      );
      socket.to(room).emit('reel_play_state', { index, isPlaying });
    }
  });

  // ================================
  // ✅ ADMIN LEFT ROOM
  // ================================
  socket.on('admin_left_room', ({ room }) => {
    const adminName = socket.username;
    
    // Clean up voice chat for this room
    if (voiceChatRooms.has(room)) {
      voiceChatRooms.delete(room);
      console.log(`🧹 Voice chat room ${room} cleaned up (admin left)`);
    }
    
    io.to(room).emit('admin_left', { adminName });
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

  // ================================
  // ✅ DISCONNECT HANDLER
  // ================================
  socket.on('disconnect', () => {
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
    
    // Clean up voice chat if user was in one
    if (room && voiceChatRooms.has(room)) {
      const voiceRoom = voiceChatRooms.get(room);
      voiceRoom.users.delete(socket.username);
      
      if (voiceRoom.users.size === 0) {
        voiceChatRooms.delete(room);
        console.log(`🧹 Voice chat room ${room} cleaned up (empty after disconnect)`);
      }
    }
    
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
setInterval(() => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  pendingInvites.forEach((invites, username) => {
    const filtered = invites.filter((inv) => now - inv.timestamp < oneDayMs);
    if (filtered.length > 0) {
      pendingInvites.set(username, filtered);
    } else {
      pendingInvites.delete(username);
    }
  });
  console.log(
    `🧹 Cleaned old invites. Current pending: ${pendingInvites.size} users`
  );
}, 60 * 60 * 1000); // Run every hour

// ================================
// ✅ CLEANUP OLD VOICE CHAT ROOMS (Periodic Task)
// ================================
setInterval(() => {
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;

  voiceChatRooms.forEach((voiceRoom, roomName) => {
    const duration = now - voiceRoom.startTime;
    
    // Clean up rooms older than 1 hour with no users
    if (voiceRoom.users.size === 0 && duration > oneHourMs) {
      voiceChatRooms.delete(roomName);
      console.log(`🧹 Cleaned up stale voice chat room: ${roomName}`);
    }
  });
  
  console.log(`🎤 Active voice chat rooms: ${voiceChatRooms.size}`);
}, 30 * 60 * 1000); // Run every 30 minutes

// ================================
// ✅ Root Test Route
// ================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ReelChatt Backend</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }
        h1 { margin: 0 0 20px 0; }
        .status { 
          background: #4CAF50; 
          padding: 10px 20px; 
          border-radius: 5px;
          display: inline-block;
          margin-top: 20px;
        }
        .info {
          margin-top: 20px;
          font-size: 14px;
          opacity: 0.9;
        }
        .stats {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .stat-box {
          background: rgba(255,255,255,0.15);
          padding: 15px 20px;
          border-radius: 10px;
          min-width: 120px;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 12px;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎬 ReelChatt Backend</h1>
        <div class="status">✅ Server Running</div>
        <div class="info">
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>MongoDB: ${mongoose.connection.readyState === 1
      ? '✅ Connected'
      : '❌ Disconnected'
    }</p>
          <p>Socket.IO: ✅ Active</p>
        </div>
        <div class="stats">
          <div class="stat-box">
            <div class="stat-number">${Object.keys(userssample).length}</div>
            <div class="stat-label">Online Users</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${Object.keys(rooms).length}</div>
            <div class="stat-label">Active Rooms</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${voiceChatRooms.size}</div>
            <div class="stat-label">Voice Chats</div>
          </div>
          <div class="stat-box">
            <div class="stat-number">${pendingInvites.size}</div>
            <div class="stat-label">Pending Invites</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ================================
// ✅ AGORA TOKEN GENERATION ENDPOINT (Optional - For Production)
// ================================
// Uncomment this section if you want to generate Agora tokens server-side
// You'll need to install: npm install agora-access-token

/*
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const AGORA_APP_ID = process.env.AGORA_APP_ID || '1991693dedff48b594ad5077f75464e6';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'your_agora_app_certificate';

app.get('/api/agora/token', (req, res) => {
  try {
    const { channelName, uid } = req.query;
    
    if (!channelName || !uid) {
      return res.status(400).json({ 
        error: 'Missing required parameters: channelName and uid' 
      });
    }

    // Token expires in 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Build token
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      parseInt(uid),
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    console.log(`🎫 Generated Agora token for channel: ${channelName}, uid: ${uid}`);

    res.json({
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid: parseInt(uid),
      expiresAt: privilegeExpiredTs
    });
  } catch (error) {
    console.error('❌ Error generating Agora token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message 
    });
  }
});
*/

// ================================
// ✅ VOICE CHAT STATS ENDPOINT
// ================================
app.get('/api/voice-chat/stats', (req, res) => {
  const stats = {
    totalRooms: voiceChatRooms.size,
    rooms: Array.from(voiceChatRooms.entries()).map(([roomName, voiceRoom]) => ({
      roomName,
      userCount: voiceRoom.users.size,
      users: Array.from(voiceRoom.users),
      duration: Math.floor((new Date() - voiceRoom.startTime) / 1000), // in seconds
      startTime: voiceRoom.startTime
    }))
  };
  
  res.json(stats);
});

// ================================
// ✅ 404 Handler
// ================================
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
  console.log(`🎤 Voice Chat: Ready (Agora Integration)`);
  console.log('='.repeat(50) + '\n');
  console.log('📡 Active Features:');
  console.log('   ✅ User Registration & Authentication');
  console.log('   ✅ Real-time Reel Synchronization');
  console.log('   ✅ Text Chat & Media Sharing');
  console.log('   ✅ Voice Chat (Agora)');
  console.log('   ✅ Invite System with Expiration');
  console.log('   ✅ Admin/Viewer Roles');
  console.log('='.repeat(50) + '\n');
});

// Export io and connectedUsers so other modules can access them
export { io, connectedUsers, voiceChatRooms };

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