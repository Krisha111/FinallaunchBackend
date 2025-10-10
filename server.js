import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import signUpRouteUser from './routes/Authentication/SignUp.js';
import signInRouteUser from './routes/Authentication/signIn.js';
import dotenv from 'dotenv';
import cookieSession from 'cookie-session';
// import passport from 'passport';
// import './serverr/passport.js'
import path from 'path';
import profileInformationRoutes from "./routes/Profile/ProfileInformationRoute.js";

import verifyToken from './MiddleWare/verifyToken.js'; // ✅ add this at the top
import reelRoutes from './routes/NewDrop/Reel.js'

import session from 'express-session';
import profileStatsRoutes from './routes/Profile/profileStatsRoute.js'
import MongoStore from 'connect-mongo';
import { fileURLToPath } from 'url';
import User from './model/User.js'; // ✅ adjust path if necessary

// ✅ LOAD ENVIRONMENT VARIABLES FIRST
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ✅ MONGODB ATLAS CONNECTION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ReelChatt';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📍 Connected to: ${MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit if DB connection fails
  });

// ✅ CORS Configuration with environment variable
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8081';

app.use(cors({ 
  origin: CLIENT_URL, 
  credentials: true 
}));

const server = http.createServer(app);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Socket
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,  // React Native
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  }
});

const onlineUsers = {};
app.set('io', io);                  // <-- make io available to controllers
app.set('onlineUsers', onlineUsers);

app.use((req, res, next) => {
  req.io = io;  // ✅ attach io after it's created
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));// <--- Make sure this is included

// ✅ SESSION with MongoDB Atlas
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_super_secret_key6373764@#^**^FKJN',
  resave: false,
  saveUninitialized: false, // Changed to false for production
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  },
  store: MongoStore.create({
    mongoUrl: MONGODB_URI, // ✅ Use same connection string
    touchAfter: 24 * 3600 // lazy session update (24 hours)
  }),
}));

// app.use(passport.initialize());
// app.use(passport.session());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'))); // Serve images

// Routes
app.use('/api/profile', profileStatsRoutes);
app.use('/auth', signUpRouteUser);
app.use('/', signInRouteUser);
app.use('/api/reels', reelRoutes);
app.use("/api/profileInformation", profileInformationRoutes);

app.get('/auth/me', verifyToken, (req, res) => {
  const userId = req.user.id; // Extracted from JWT in verifyToken middleware
  User.findById(userId).then(user => {
    res.json({ user });
  }).catch(err => res.status(500).json({ message: 'User not found' }));
});

// Google Authentication
app.get('/auth/login/success', (req, res) => {
  if (req.user) {
    res.status(200).json({
      message: "User Authenticated",
      user: req.user,
    });
  } else {
    res.status(403).json({ message: "Not Authorized" });
  }
});

// ✅ Health check endpoint (useful for deployment monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// ========== SOCKET.IO ==========
let userssample = {};
let rooms = {};
let admins = {}; // { roomName: adminUsername }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // noti
  socket.on('user-connected', (userId) => {
    onlineUsers[userId] = socket.id;
  });

  // Register user
  socket.on('register', async ({ username, userId }) => {
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

    // store full object including bio
    userssample[username] = {
      socketId: socket.id,
      username,
      profileImage,
      bio,
    };

    console.log(`✅ Registered: ${username} (${socket.id})`);
    io.emit('active_users', Object.values(userssample));
  });

  // send notification
  socket.on('send-notification', (data) => {
    const { receiverId } = data;
    const receiverSocket = onlineUsers[receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit('new_notification', data);
    }
  });

  // reel change
  socket.on('change_reel', ({ room, reelUrl }) => {
    io.to(room).emit('reel_updated', { reelUrl });
  });

  // send invite
  socket.on('send_invite', ({ to }) => {
    const receiver = userssample[to];
    if (receiver && receiver.socketId) {
      io.to(receiver.socketId).emit('receive_invite', { from: socket.username });
      console.log(`📨 Invite sent from ${socket.username} to ${to}`);
    } else {
      console.log(`❌ Could not send invite: ${to} not found or not connected`);
    }
  });

  // accept invite
  socket.on('accept_invite', ({ from }) => {
    const room = `${from}-${socket.username}`;
    console.log("fromfromyyyyy", from);
    socket.join(room);

    const fromUser = userssample[from];
    if (fromUser && fromUser.socketId) {
      io.sockets.sockets.get(fromUser.socketId)?.join(room);

      // ✅ tell inviter that invite was accepted (only once!)
      io.to(fromUser.socketId).emit('invite_accepted', {
        by: socket.username,   // accepter
        from: fromUser.username, // inviter
        room,
        isAdmin: true          // inviter is admin
      });
    }

    admins[room] = from; // ✅ assign admin
    rooms[socket.username] = room;
    rooms[from] = room;

    // ✅ tell accepter that they joined (non-admin)
    io.to(socket.id).emit('joined_room', { room, isAdmin: false });
  });

  // send message
  socket.on('send_message', ({ room, message, sender }) => {
    io.to(room).emit('receive_message', { sender, message });
  });

  // only admin can change reel index
  socket.on('change_reel_index', ({ room, index }) => {
    const admin = admins[room];
    if (socket.username === admin) {
      io.to(room).emit('sync_reel_index', index);
      console.log(`✅ ${socket.username} (admin) changed reel to index ${index} in room ${room}`);
    } else {
      console.log(`❌ ${socket.username} tried to change reel but is not admin of room ${room}`);
    }
  });

  // ✅ FIXED: play/pause sync (echo to all, not just others)
  socket.on('reel_play', ({ room, index, isPlaying }) => {
    console.log("📡 Server relaying play state:", room, index, isPlaying);
    io.to(room).emit('reel_play_state', { index, isPlaying });
  });

  // disconnect
  socket.on('disconnect', () => {
    if (socket.username && userssample[socket.username]) {
      delete userssample[socket.username];
    }

    // remove from onlineUsers
    for (const [uid, sid] of Object.entries(onlineUsers)) {
      if (sid === socket.id) delete onlineUsers[uid];
    }

    const room = rooms[socket.username];
    const wasAdmin = admins[room] === socket.username;

    delete rooms[socket.username];
    if (wasAdmin) {
      delete admins[room];
      io.to(room).emit('admin_left');
    }

    // ✅ Always send array of objects (with bio, image, etc.)
    io.emit('active_users', Object.values(userssample));
  });
});

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});