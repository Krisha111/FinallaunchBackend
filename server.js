import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import signUpRouteUser from './routes/Authentication/SignUp.js';
import signInRouteUser from './routes/Authentication/signIn.js';
import dotenv from 'dotenv';
import cookieSession from 'cookie-session';
import path from 'path';
import profileInformationRoutes from "./routes/Profile/ProfileInformationRoute.js";
import verifyToken from './MiddleWare/verifyToken.js';
import reelRoutes from './routes/NewDrop/Reel.js';
import session from 'express-session';
import profileStatsRoutes from './routes/Profile/profileStatsRoute.js';
import MongoStore from 'connect-mongo';
import { fileURLToPath } from 'url';
import User from './model/User.js';

// ✅ LOAD ENVIRONMENT VARIABLES FIRST
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ✅ MongoDB Connection
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
    process.exit(1);
  });

// ✅ CORS FIX (this is the most important part)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8081';

app.use(cors({
  origin: [
    CLIENT_URL,                    // local
    'http://localhost:19006',      // Expo web/dev
    'http://localhost:3000',       // common frontend dev port
    'https://finallaunchfrontend.onrender.com' // replace with your frontend domain when deployed
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// ✅ Handle preflight requests (OPTIONS)
app.options('*', cors());

// ✅ Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Create HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      CLIENT_URL,
      'http://localhost:19006',
      'http://localhost:3000',
      'https://finallaunchfrontend.onrender.com'
    ],
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  }
});

// ✅ Share IO globally
const onlineUsers = {};
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ✅ Attach IO to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Session (with MongoDB)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_super_secret_key6373764@#^**^FKJN',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // only secure in prod
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600
  }),
}));

// ✅ ROUTES
app.use('/api/profile', profileStatsRoutes);
app.use('/auth', signUpRouteUser);
app.use('/', signInRouteUser);
app.use('/api/reels', reelRoutes);
app.use('/api/profileInformation', profileInformationRoutes);

// ✅ Auth check
app.get('/auth/me', verifyToken, (req, res) => {
  const userId = req.user.id;
  User.findById(userId)
    .then(user => res.json({ user }))
    .catch(() => res.status(500).json({ message: 'User not found' }));
});

// ✅ Google Auth success endpoint
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

// ✅ Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ✅ SOCKET.IO HANDLERS
let userssample = {};
let rooms = {};
let admins = {};

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  // online tracking
  socket.on('user-connected', (userId) => {
    onlineUsers[userId] = socket.id;
  });

  // register user
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

    userssample[username] = {
      socketId: socket.id,
      username,
      profileImage,
      bio,
    };

    console.log(`✅ Registered: ${username} (${socket.id})`);
    io.emit('active_users', Object.values(userssample));
  });

  // notifications
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
      io.to(fromUser.socketId).emit('invite_accepted', {
        by: socket.username,
        from: fromUser.username,
        room,
        isAdmin: true
      });
    }

    admins[room] = from;
    rooms[socket.username] = room;
    rooms[from] = room;

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

  // play/pause sync
  socket.on('reel_play', ({ room, index, isPlaying }) => {
    console.log("📡 Server relaying play state:", room, index, isPlaying);
    io.to(room).emit('reel_play_state', { index, isPlaying });
  });

  // disconnect
  socket.on('disconnect', () => {
    if (socket.username && userssample[socket.username]) {
      delete userssample[socket.username];
    }

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

// ✅ Server Start
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
