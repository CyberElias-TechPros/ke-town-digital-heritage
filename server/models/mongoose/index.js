const mongoose = require('mongoose');

// Import all Mongoose models from parent directory
const User = require('../User');
const AuditLog = require('../AuditLog');
const Event = require('../Event');
const News = require('../News');
const Group = require('../Group');
const Post = require('../Post');
const Product = require('../Product');
const Order = require('../Order');
const Comment = require('../Comment');
const Message = require('../Message');
const GalleryItem = require('../GalleryItem');
const Activity = require('../Activity');
const ElderStory = require('../ElderStory');
const Mentorship = require('../Mentorship');
const OralHistory = require('../OralHistory');
const Job = require('../Job');
const NewsletterSubscriber = require('../NewsletterSubscriber');
const EnvironmentReport = require('../EnvironmentReport');
const DirectoryMember = require('../DirectoryMember');
const ContactMessage = require('../ContactMessage');
const Petition = require('../Petition');
const Campaign = require('../Campaign');
const Poll = require('../Poll');
const Report = require('../Report');
const Review = require('../Review');
const Story = require('../Story');
const VolunteerOpportunity = require('../VolunteerOpportunity');
const WarCanoeHouse = require('../WarCanoeHouse');

// Database connection function (original)
const connectDB = async () => {
  const mongooseOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10,
  };

  const connectionOptions = [
    { name: 'Localhost', uri: process.env.MONGO_URI || 'mongodb://localhost:27017/keKingdom' },
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

// Socket authentication adapter
const authenticate = async (userId) => {
  try {
    return await User.findById(userId);
  } catch (err) {
    return null;
  }
};

module.exports = {
  connectDB,
  authenticate,
  User,
  AuditLog,
  Event,
  News,
  Group,
  Post,
  Product,
  Order,
  Comment,
  Message,
  GalleryItem,
  Activity,
  ElderStory,
  Mentorship,
  OralHistory,
  Job,
  NewsletterSubscriber,
  EnvironmentReport,
  DirectoryMember,
  ContactMessage,
  Petition,
  Campaign,
  Poll,
  Report,
  Review,
  Story,
  VolunteerOpportunity,
  WarCanoeHouse
};