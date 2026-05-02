// ============================================
// KE Kingdom Backend — Node.js + Express + MongoDB
// ============================================
// To run: cd server && npm install && npm run dev

const express = require('express');
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

// Database abstraction layer
const DB_TYPE = process.env.DB_TYPE || 'mongo';
let db = {};
let connectDB;
let socketAuth;
let mysqlConfig; // For MySQL

if (DB_TYPE === 'mysql') {
  console.log('Using MySQL database');
  mysqlConfig = require('./config/database');
  connectDB = mysqlConfig.connectMySQL;
  socketAuth = require('./adapters/mysqlAdapter').authenticate;
  // Models will be loaded after DB connection
} else {
  console.log('Using MongoDB database');
  const mongoose = require('mongoose');
  const mongodbModels = require('./models/mongoose');
  connectDB = mongodbModels.connectDB;
  db = { ...mongodbModels };
  socketAuth = require('./adapters/mongoAdapter').authenticate;
}

// Make models available globally for routes
app.set('db', db);
app.set('socketAuth', socketAuth);

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

// Database connection
connectDB().then(() => {
  // For MySQL, load models now that DB is connected
  if (DB_TYPE === 'mysql') {
    const sequelizeModels = require('./models/sequelize');
    db.sequelize = mysqlConfig.getSequelize;
    Object.assign(db, sequelizeModels);
    app.set('db', db);
    console.log('✅ MySQL models loaded');
  }

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
  
  // Enhanced Socket.io for real-time features
  const onlineUsers = new Map();
  const userSockets = new Map(); // userId -> socket.id
  const typingUsers = new Map(); // conversationId -> Set of userIds
  
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Authentication middleware for socket connections
    socket.on('authenticate', async (data) => {
      try {
        const { token, userId } = data;
        
        // Verify token with the same authentication as REST API
        const user = await socketAuth(token, userId);
        
        if (user) {
          socket.userId = userId;
          socket.user = user;
          onlineUsers.set(userId, { socketId: socket.id, user, lastSeen: new Date() });
          userSockets.set(userId, socket.id);
          
          // Join user to their personal room for notifications
          socket.join(`user:${userId}`);
          
          // Notify others that user is online
          socket.broadcast.emit('userOnline', { 
            userId, 
            user: { 
              id: user.id, 
              fullName: user.fullName, 
              avatar: user.avatar,
              isOnline: true 
            } 
          });
          
          // Send user's online friends list
          const onlineFriends = Array.from(onlineUsers.entries())
            .filter(([id]) => id !== userId)
            .map(([id, data]) => ({
              userId: id,
              user: data.user,
              isOnline: true
            }));
          
          socket.emit('onlineUsers', onlineFriends);
          
          console.log(`User ${userId} authenticated successfully`);
        } else {
          socket.emit('authenticationError', { message: 'Invalid credentials' });
          socket.disconnect();
        }
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('authenticationError', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });
    
    // Join conversation room
    socket.on('joinConversation', async (conversationId) => {
      if (!socket.userId) return;
      
      try {
        // Verify user has access to this conversation
        const hasAccess = await db.conversations?.findOne({
          _id: conversationId,
          'participants._id': socket.userId
        });
        
        if (hasAccess) {
          socket.join(`conversation:${conversationId}`);
          
          // Mark messages as read when joining
          await db.messages?.updateMany(
            { 
              conversationId, 
              'sender._id': { $ne: socket.userId },
              readAt: { $exists: false }
            },
            { $set: { readAt: new Date() } }
          );
          
          socket.emit('joinedConversation', { conversationId });
        } else {
          socket.emit('error', { message: 'Access denied to conversation' });
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });
    
    // Leave conversation room
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      socket.emit('leftConversation', { conversationId });
    });
    
    // Handle typing indicators
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!socket.userId || !conversationId) return;
      
      if (isTyping) {
        if (!typingUsers.has(conversationId)) {
          typingUsers.set(conversationId, new Set());
        }
        typingUsers.get(conversationId).add(socket.userId);
      } else {
        if (typingUsers.has(conversationId)) {
          typingUsers.get(conversationId).delete(socket.userId);
          if (typingUsers.get(conversationId).size === 0) {
            typingUsers.delete(conversationId);
          }
        }
      }
      
      // Broadcast typing status to other participants
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        userId: socket.userId,
        isTyping,
        typingUsers: typingUsers.has(conversationId) ? Array.from(typingUsers.get(conversationId)) : []
      });
    });
    
    // Send message with persistence
    socket.on('sendMessage', async (data) => {
      if (!socket.userId) return;
      
      try {
        const { conversationId, content, media = [] } = data;
        
        // Verify user has access to conversation
        const conversation = await db.conversations?.findOne({
          _id: conversationId,
          'participants._id': socket.userId
        });
        
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }
        
        // Create message object
        const message = {
          _id: new Date().getTime().toString(),
          sender: {
            _id: socket.userId,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar
          },
          content: content.trim(),
          media,
          conversationId,
          createdAt: new Date().toISOString(),
          readAt: socket.userId === conversation.participants[0]._id ? new Date().toISOString() : undefined
        };
        
        // Save message to database
        await db.messages?.create(message);
        
        // Update conversation's last message
        await db.conversations?.updateOne(
          { _id: conversationId },
          { 
            $set: { 
              lastMessage: { content, createdAt: message.createdAt },
              updatedAt: new Date()
            },
            $inc: { [`unreadCount.${conversation.participants.find(p => p._id !== socket.userId)._id}`]: 1 }
          }
        );
        
        // Broadcast to all participants in conversation
        io.to(`conversation:${conversationId}`).emit('newMessage', message);
        
        // Send notifications to offline participants
        conversation.participants.forEach(participant => {
          if (participant._id !== socket.userId && !onlineUsers.has(participant._id)) {
            // Send push notification or email here
            io.to(`user:${participant._id}`).emit('newMessageNotification', {
              conversationId,
              message: {
                ...message,
                conversation: conversation
              }
            });
          }
        });
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle read receipts
    socket.on('markAsRead', async ({ conversationId, messageIds }) => {
      if (!socket.userId) return;
      
      try {
        await db.messages?.updateMany(
          { 
            _id: { $in: messageIds },
            conversationId,
            'sender._id': { $ne: socket.userId },
            readAt: { $exists: false }
          },
          { $set: { readAt: new Date() } }
        );
        
        // Notify sender that messages were read
        socket.to(`conversation:${conversationId}`).emit('messagesRead', {
          conversationId,
          messageIds,
          readBy: socket.userId
        });
        
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });
    
    // Handle user status changes
    socket.on('updateStatus', async ({ status }) => {
      if (!socket.userId) return;
      
      try {
        await db.users?.updateOne(
          { _id: socket.userId },
          { $set: { status, lastSeen: new Date() } }
        );
        
        // Broadcast status change to friends
        socket.broadcast.emit('userStatusChanged', {
          userId: socket.userId,
          status,
          lastSeen: new Date()
        });
        
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        userSockets.delete(socket.userId);
        
        // Update user's last seen
        db.users?.updateOne(
          { _id: socket.userId },
          { $set: { lastSeen: new Date(), isOnline: false } }
        ).catch(err => console.error('Error updating last seen:', err));
        
        // Remove from typing indicators
        typingUsers.forEach((users, conversationId) => {
          users.delete(socket.userId);
          if (users.size === 0) {
            typingUsers.delete(conversationId);
          }
          socket.to(`conversation:${conversationId}`).emit('userTyping', {
            userId: socket.userId,
            isTyping: false,
            typingUsers: Array.from(users)
          });
        });
        
        // Notify others that user is offline
        socket.broadcast.emit('userOffline', { 
          userId: socket.userId,
          lastSeen: new Date()
        });
        
        console.log(`User ${socket.userId} disconnected`);
      }
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
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