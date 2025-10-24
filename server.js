// ================================
// 📁 server.js (Production Ready for Render + MongoDB Atlas)
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ReelChatt';

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
// ✅ CORS Configuration (Production Ready)
// ================================
const isProduction = process.env.NODE_ENV === 'production';

// Dynamic allowed origins based on environment
const allowedOrigins = isProduction
  ? [
      process.env.FRONTEND_URL,
      'https://reelchatt-backend.onrender.com',
    ].filter(Boolean)
  : [
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:3000',
      'http://10.0.2.2:8081',
      'http://192.168.2.16:8081',
      'http://192.168.2.16:8080',
      'exp://192.168.2.16:8081',
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        console.log('✅ Request with no origin header (likely mobile app) - ALLOWED');
        return callback(null, true);
      }

      if (!isProduction) {
        console.log(`✅ Development mode - Origin allowed: ${origin}`);
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Production - Whitelisted origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn('⚠️ CORS Blocked Origin:', origin);
        // Still allow for mobile apps in production
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
      if (!isProduction) return callback(null, true);
      // In production, allow all for mobile app compatibility
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
  // ✅ Important for mobile apps and Render deployment
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8, // 100 MB
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
// ✅ Health Check Route (Important for Render)
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
// ✅ SOCKET.IO HANDLERS (FIXED REEL SYNC)
// ================================
let userssample = {};
let rooms = {};
let admins = {};
let roomStates = {}; // Track current reel index per room

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

  socket.on('send_invite', ({ to, from }) => {
    const receiver = userssample[to];
    if (receiver?.socketId) {
      io.to(receiver.socketId).emit('receive_invite', { 
        from: from || socket.username 
      });
      console.log(`📨 Invite sent from ${from || socket.username} to ${to}`);
    } else {
      console.log(`❌ Invite failed: ${to} not connected`);
    }
  });

  socket.on('accept_invite', ({ from }) => {
    const room = `${from}-${socket.username}`;
    socket.join(room);
    
    const fromUser = userssample[from];
    if (fromUser?.socketId) {
      const fromSocket = io.sockets.sockets.get(fromUser.socketId);
      if (fromSocket) {
        fromSocket.join(room);
        
        // Initialize room state with admin's current position (default 0)
        roomStates[room] = { currentIndex: 0, isPlaying: true };
        
        // Set admin
        admins[room] = from;
        rooms[socket.username] = room;
        rooms[from] = room;
        
        console.log(`✅ Room created: ${room} | Admin: ${from}`);
        
        // Notify admin that invite was accepted (admin gets isAdmin: true)
        io.to(fromUser.socketId).emit('invite_accepted', {
          by: socket.username,
          from: fromUser.username,
          room,
          isAdmin: true,
          currentReelIndex: 0,
        });
        
        // Notify non-admin that they joined (gets isAdmin: false and current index)
        io.to(socket.id).emit('joined_room', { 
          room, 
          isAdmin: false,
          currentReelIndex: 0,
        });
      }
    }
  });

  socket.on('send_message', ({ room, message, sender }) => {
    console.log(`💬 Message in ${room} from ${sender}: ${message.substring(0, 50)}`);
    io.to(room).emit('receive_message', { sender, message });
  });

  // ✅ FIXED: Sync reel index from admin
  socket.on('sync_reel_index', ({ room, index }) => {
    const admin = admins[room];
    
    // Only allow admin to sync index
    if (socket.username === admin) {
      // Update room state
      if (roomStates[room]) {
        roomStates[room].currentIndex = index;
      } else {
        roomStates[room] = { currentIndex: index, isPlaying: true };
      }
      
      console.log(`🔄 Admin ${socket.username} synced reel index to ${index} in room ${room}`);
      
      // Broadcast to all OTHER users in room (not back to admin)
      socket.to(room).emit('sync_reel_index', { index });
    } else {
      console.warn(`⚠️ Non-admin ${socket.username} tried to sync index in room ${room}`);
    }
  });

  // ✅ FIXED: Sync play state from admin
  socket.on('reel_play', ({ room, index, isPlaying }) => {
    const admin = admins[room];
    
    // Only allow admin to control playback
    if (socket.username === admin) {
      // Update room state
      if (roomStates[room]) {
        roomStates[room].currentIndex = index;
        roomStates[room].isPlaying = isPlaying;
      } else {
        roomStates[room] = { currentIndex: index, isPlaying };
      }
      
      console.log(`▶️ Admin ${socket.username} set play state: index=${index}, isPlaying=${isPlaying} in room ${room}`);
      
      // Broadcast to all OTHER users in room
      socket.to(room).emit('reel_play_state', { index, isPlaying });
    } else {
      console.warn(`⚠️ Non-admin ${socket.username} tried to control playback in room ${room}`);
    }
  });

  // Legacy support (if needed)
  socket.on('change_reel_index', ({ room, index }) => {
    const admin = admins[room];
    if (socket.username === admin) {
      if (roomStates[room]) {
        roomStates[room].currentIndex = index;
      }
      socket.to(room).emit('sync_reel_index', { index });
      console.log(`✅ ${socket.username} changed reel to index ${index} in room ${room} (legacy)`);
    }
  });

  socket.on('admin_left_room', ({ room }) => {
    const adminName = socket.username;
    
    // Notify all users in the room that admin left
    io.to(room).emit('admin_left', { adminName });

    // Admin leaves the room
    socket.leave(room);

    // Clean up server state
    delete admins[room];
    delete roomStates[room];

    // Remove room mapping for all users
    for (const [user, userRoom] of Object.entries(rooms)) {
      if (userRoom === room) {
        delete rooms[user];
      }
    }

    console.log(`👋 Admin ${adminName} left room ${room}, all users removed`);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Client disconnected: ${socket.id} (${socket.username || 'Unknown'})`);
    
    if (socket.username) {
      delete userssample[socket.username];
    }
    
    // Remove from onlineUsers
    for (const [uid, sid] of Object.entries(onlineUsers)) {
      if (sid === socket.id) {
        delete onlineUsers[uid];
      }
    }
    
    // Handle room cleanup
    const room = rooms[socket.username];
    const wasAdmin = admins[room] === socket.username;
    
    if (room) {
      delete rooms[socket.username];
      
      if (wasAdmin) {
        console.log(`👋 Admin ${socket.username} disconnected from room ${room}`);
        delete admins[room];
        delete roomStates[room];
        
        // Notify other users in room that admin left
        io.to(room).emit('admin_left', { adminName: socket.username });
        
        // Clean up other user's room reference
        for (const [user, userRoom] of Object.entries(rooms)) {
          if (userRoom === room) {
            delete rooms[user];
          }
        }
      } else {
        console.log(`👋 User ${socket.username} disconnected from room ${room}`);
      }
    }
    
    // Broadcast updated user list
    io.emit('active_users', Object.values(userssample));
  });
});

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
          <p>MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}</p>
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
    method: req.method
  });
});

// ================================
// ✅ Error Handler
// ================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
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
  console.log(`🔓 CORS: ${isProduction ? 'Production (Mobile Friendly)' : 'Development (Allow All)'}`);
  console.log(`💾 MongoDB: ${MONGODB_URI.includes('mongodb+srv') ? 'Atlas (Cloud)' : 'Local'}`);
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