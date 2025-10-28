// ================================
// 📁 server.js (Production Ready for Render + MongoDB Atlas + Expo CORS FIX)
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
      `📍 Connected to: ${
        MONGODB_URI.includes('mongodb+srv')
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

// ✅ ALL socket.on() handlers MUST be INSIDE this io.on('connection') block
io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  socket.on('user-connected', (userId) => {
    onlineUsers[userId] = socket.id;
    console.log(`👤 User connected: ${userId}`);
  });

  socket.on('register', async ({ username, userId }) => {
    if (!username) return;
    socket.username = username;
    socket.userId = userId;

    let profileImage = '';
    let bio = '';
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
  // ✅ NOTIFICATION SYSTEM
  // ================================

  socket.on('send_invite', ({ to, from }) => {
    const receiver = userssample[to];
    const timestamp = Date.now();
    const inviteData = {
      from: from || socket.username,
      to,
      timestamp,
      status: 'pending',
      id: `invite_${timestamp}_${from}_${to}`,
    };

    // Store pending invite
    if (!pendingInvites.has(to)) {
      pendingInvites.set(to, []);
    }
    pendingInvites.get(to).push(inviteData);

    if (receiver?.socketId) {
      // User is online - send real-time notification
      io.to(receiver.socketId).emit('receive_invite', inviteData);
      console.log(
        `📨 Real-time invite sent from ${from || socket.username} to ${to}`
      );
    } else {
      // User is offline - notification will be fetched when they come online
      console.log(
        `📭 Offline invite stored for ${to} from ${from || socket.username}`
      );
    }

    // Send confirmation to sender
    socket.emit('invite_sent', { success: true, to });
  });

  // Get pending invites when user comes online
  socket.on('get_pending_invites', ({ username }) => {
    const invites = pendingInvites.get(username) || [];
    const pendingOnly = invites.filter((inv) => inv.status === 'pending');
    socket.emit('pending_invites', pendingOnly);
    console.log(`📬 Sent ${pendingOnly.length} pending invites to ${username}`);
  });

  // Accept invite from notification
  socket.on('accept_invite_from_notification', ({ inviteId, from, to }) => {
    // Remove from pending invites
    const userInvites = pendingInvites.get(to) || [];
    const inviteIndex = userInvites.findIndex((inv) => inv.id === inviteId);

    if (inviteIndex !== -1) {
      userInvites.splice(inviteIndex, 1);
    }

    // Create room (same logic as accept_invite)
    const room = `${from}-${to}`;
    socket.join(room);

    const fromUser = userssample[from];
    if (fromUser?.socketId) {
      const fromSocket = io.sockets.sockets.get(fromUser.socketId);
      if (fromSocket) {
        fromSocket.join(room);

        roomStates[room] = { currentIndex: 0, isPlaying: true };
        admins[room] = from;
        rooms[to] = room;
        rooms[from] = room;

        console.log(
          `✅ Room created from notification: ${room} | Admin: ${from}`
        );

        io.to(fromUser.socketId).emit('invite_accepted', {
          by: to,
          from: from,
          room,
          isAdmin: true,
          currentReelIndex: 0,
        });

        io.to(socket.id).emit('joined_room', {
          room,
          isAdmin: false,
          currentReelIndex: 0,
        });
      }
    } else {
      // Sender is offline
      socket.emit('invite_accept_failed', {
        message: `${from} is currently offline`,
      });
    }
  });

  // Reject invite
  socket.on('reject_invite', ({ inviteId, username }) => {
    const userInvites = pendingInvites.get(username) || [];
    const inviteIndex = userInvites.findIndex((inv) => inv.id === inviteId);

    if (inviteIndex !== -1) {
      userInvites.splice(inviteIndex, 1);
      socket.emit('invite_rejected', { inviteId });
      console.log(`❌ Invite ${inviteId} rejected by ${username}`);
    }
  });

  // ✅ Regular accept_invite (from modal) - WITH PENDING INVITE CLEANUP
  socket.on('accept_invite', ({ from }) => {
    const room = `${from}-${socket.username}`;
    socket.join(room);

    // ✅ Remove from pending invites if it exists
    const userInvites = pendingInvites.get(socket.username) || [];
    const inviteIndex = userInvites.findIndex((inv) => inv.from === from);
    if (inviteIndex !== -1) {
      userInvites.splice(inviteIndex, 1);
    }

    const fromUser = userssample[from];
    if (fromUser?.socketId) {
      const fromSocket = io.sockets.sockets.get(fromUser.socketId);
      if (fromSocket) {
        fromSocket.join(room);

        roomStates[room] = { currentIndex: 0, isPlaying: true };
        admins[room] = from;
        rooms[socket.username] = room;
        rooms[from] = room;

        console.log(`✅ Room created: ${room} | Admin: ${from}`);

        io.to(fromUser.socketId).emit('invite_accepted', {
          by: socket.username,
          from: fromUser.username,
          room,
          isAdmin: true,
          currentReelIndex: 0,
        });

        io.to(socket.id).emit('joined_room', {
          room,
          isAdmin: false,
          currentReelIndex: 0,
        });
      }
    }
  });

  socket.on('send_message', ({ room, message, sender }) => {
    console.log(
      `💬 Message in ${room} from ${sender}: ${message.substring(0, 50)}`
    );
    io.to(room).emit('receive_message', { sender, message });
  });

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

  socket.on('admin_left_room', ({ room }) => {
    const adminName = socket.username;
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

  socket.on('disconnect', () => {
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
}); // ✅ END of io.on('connection') - CRITICAL: All socket.on() must be ABOVE this line

// ✅ Clear old invites - THIS is outside because it's a setInterval, not a socket listener
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
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎬 ReelChatt Backend</h1>
        <div class="status">✅ Server Running</div>
        <div class="info">
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>MongoDB: ${
            mongoose.connection.readyState === 1
              ? '✅ Connected'
              : '❌ Disconnected'
          }</p>
          <p>Socket.IO: ✅ Active</p>
        </div>
      </div>
    </body>
    </html>
  `);
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
    await mongoose.connection.close();
    console.log('MongoDB closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
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
    `🔓 CORS: ${
      isProduction ? 'Production (Mobile Friendly)' : 'Development (Allow All)'
    }`
  );
  console.log(
    `💾 MongoDB: ${
      MONGODB_URI.includes('mongodb+srv') ? 'Atlas (Cloud)' : 'Local'
    }`
  );
  console.log(`🔌 Socket.IO: Active`);
  console.log('='.repeat(50) + '\n');
});

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