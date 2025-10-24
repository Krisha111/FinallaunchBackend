// ================================
// 📁 server.js (Fixed Reel Sync)
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================
const app = express();

// ================================
// ✅ MongoDB Connection
// ================================
const MONGODB_URI = 'mongodb://localhost:27017/ReelChatt';

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true })
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
// ✅ CORS Configuration
// ================================
const isProduction = process.env.NODE_ENV === 'production';

// const allowedOrigins = [
//   'http://localhost:8081',
//   'http://localhost:19006',
//   'http://localhost:3000',
//   'http://10.0.2.2:8081',
//   'http://192.168.2.16:8081',
//   'exp://192.168.2.16:8081',
//   'https://finallaunchfrontend.onrender.com',
// ];

const allowedOrigins = [
  
  'http://192.168.2.16:8080',
 
  
];

app.use(
  cors({
    origin: function (origin, callback) {
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
        callback(new Error('Not allowed by CORS'));
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
// ✅ HTTP + Socket.IO Server
// ================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (!isProduction) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
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
// ✅ Session Setup
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
  });

  socket.on('register', async ({ username }) => {
    if (!username) return;
    socket.username = username;

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
      profileImage,
      bio,
    };

    console.log(`✅ Registered: ${username} (${socket.id})`);
    io.emit('active_users', Object.values(userssample));
  });

  socket.on("receive_invite", ({ from }) => {
    socket.emit("accept_invite", { from });
  });

  socket.on('send-notification', (data) => {
    const { receiverId } = data;
    const receiverSocket = onlineUsers[receiverId];
    if (receiverSocket) io.to(receiverSocket).emit('new_notification', data);
  });

  socket.on('change_reel', ({ room, reelUrl }) => {
    io.to(room).emit('reel_updated', { reelUrl });
  });

  socket.on('send_invite', ({ to }) => {
    const receiver = userssample[to];
    if (receiver?.socketId) {
      io.to(receiver.socketId).emit('receive_invite', { from: socket.username });
      console.log(`📨 Invite sent from ${socket.username} to ${to}`);
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
  socket.on("sync_reel_index", ({ room, index }) => {
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
socket.on("admin_left_room", ({ room, adminName }) => {
  // Notify all users in the room (non-admins) to leave with admin name
  io.to(room).emit("admin_left", { adminName });

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
        console.log(`👋 Admin ${socket.username} left room ${room}`);
        delete admins[room];
        delete roomStates[room];
        
        // Notify other users in room that admin left
        io.to(room).emit('admin_left');
        
        // Clean up other user's room reference
        for (const [user, userRoom] of Object.entries(rooms)) {
          if (userRoom === room) {
            delete rooms[user];
          }
        }
      } else {
        console.log(`👋 User ${socket.username} left room ${room}`);
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
  res.send('✅ ReelChatt backend running locally on http://localhost:8000');
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

// ================================
// ✅ Start Server
// ================================
const PORT = 8000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KrishaServer running locally at http://localhost:${PORT}`);
  console.log(`🌐 Network accessible at http://192.168.2.16:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔓 CORS: ${isProduction ? 'Production (Whitelist)' : 'Development (Allow All)'}`);
});