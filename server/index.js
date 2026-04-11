// ============================================
// KE Kingdom Backend — Node.js + Express + MongoDB
// ============================================
// To run: cd server && npm install && npm run dev

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Security middleware with custom CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce'", "https://static.cloudflareinsights.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://static.cloudflareinsights.com"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many uploads, please try again later.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);

// Database connection - Multiple fallbacks for robustness
const connectDB = async () => {
  const mongooseOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10,
  };

  const connectionOptions = [
    { name: 'Atlas SRV', uri: 'mongodb+srv://cybereliastk_db_user:3bBKj4DtLRh7DNd8@cea.rz1xdmd.mongodb.net/keKingdom?retryWrites=true&w=majority' },
    { name: 'Atlas Sharded', uri: 'mongodb://cybereliastk_db_user:3bBKj4DtLRh7DNd8@ac-okkbkq6-shard-00-00.rz1xdmd.mongodb.net:27017,ac-okkbkq6-shard-00-01.rz1xdmd.mongodb.net:27017,ac-okkbkq6-shard-00-02.rz1xdmd.mongodb.net:27017/keKingdom?ssl=true&replicaSet=atlas-ljgzbm-shard-0&authSource=admin&appName=CEA' },
    { name: 'Localhost', uri: 'mongodb://localhost:27017/keKingdom' },
  ];

  let connected = false;
  
  for (const option of connectionOptions) {
    console.log(`Trying ${option.name}...`);
    try {
      await mongoose.connect(option.uri, mongooseOptions);
      console.log(`✅ Connected to ${option.name}`);
      connected = true;
      break;
    } catch (err) {
      console.log(`❌ ${option.name} failed: ${err.message}`);
    }
  }

  if (!connected) {
    console.log('⚠️ All databases unreachable. Running without database connection.');
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected, attempting reconnect...');
    connectDB();
  });
};

// Start server
connectDB().then(() => {
  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/news', require('./routes/news'));
  app.use('/api/gallery', require('./routes/gallery'));
  app.use('/api/directory', require('./routes/directory'));
  app.use('/api/projects', require('./routes/projects'));
  app.use('/api/contact', require('./routes/contact'));
  app.use('/api/newsletter', require('./routes/newsletter'));
  app.use('/api/environment', require('./routes/environment'));
  app.use('/api/upload', require('./routes/upload'));
  app.use('/api/search', require('./routes/search'));
  app.use('/api/donations', require('./routes/donations'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/mentorship', require('./routes/mentorship'));
  app.use('/api/jobs', require('./routes/jobs'));
  app.use('/api/calendar', require('./routes/calendar'));
  app.use('/api/oral-history', require('./routes/oralHistory'));
  app.use('/api/genealogy', require('./routes/genealogy'));
  app.use('/api/posts', require('./routes/posts'));
  app.use('/api/comments', require('./routes/comments'));
  app.use('/api/social', require('./routes/social'));
  app.use('/api/elder-stories', require('./routes/elderStories'));
  app.use('/api/marketplace', require('./routes/marketplace'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/shop', require('./routes/shop'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/groups', require('./routes/groups'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/reviews', require('./routes/reviews'));
  app.use('/api/stories', require('./routes/stories'));
  app.use('/api/polls', require('./routes/polls'));
  app.use('/api/campaigns', require('./routes/campaigns'));
  app.use('/api/petitions', require('./routes/petitions'));
  app.use('/api/volunteer', require('./routes/volunteer'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/analytics', require('./routes/analytics'));
  
  // Socket.io for real-time features
  const onlineUsers = new Map();
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('authenticate', (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      io.emit('userOnline', { userId });
    });
    
    socket.on('joinConversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });
    
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });
    
    socket.on('typing', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('userTyping', { userId });
    });
    
    socket.on('sendMessage', ({ conversationId, message }) => {
      io.to(`conversation:${conversationId}`).emit('newMessage', message);
    });
    
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('userOffline', { userId: socket.userId });
      }
      console.log('User disconnected:', socket.id);
    });
  });
  
  // Make io accessible in routes
  app.set('io', io);

  app.get('/api/health', (req, res) => res.json({ 
    status: 'ok', 
    service: 'KE Kingdom API',
    server: process.env.SERVER_NAME || 'primary',
    timestamp: new Date().toISOString()
  }));

  app.get('/api/servers', (req, res) => res.json({
    primary: 'https://kesrv.freegameplay.site',
    secondary: 'https://ke-town-digital-heritage-production.up.railway.app'
  }));

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => console.log(`KE Kingdom API running on port ${PORT}`));
});