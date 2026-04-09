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

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
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

  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'KE Kingdom API' }));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`KE Kingdom API running on port ${PORT}`));
});