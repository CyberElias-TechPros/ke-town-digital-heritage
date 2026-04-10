const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 500
  },
  coverImage: String,
  privacy: {
    type: String,
    enum: ['public', 'private', 'secret'],
    default: 'public'
  },
  category: {
    type: String,
    enum: ['general', 'education', 'business', 'culture', 'sports', 'technology', 'health', 'religion', 'other'],
    default: 'general'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  posts: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    media: [{ type: String, url: String }],
    reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: String }],
    commentCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  memberCount: { type: Number, default: 0 },
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  joinMethod: {
    type: String,
    enum: ['open', 'approval'],
    default: 'open'
  },
  allowPosts: {
    type: String,
    enum: ['members', 'admins', 'all'],
    default: 'members'
  },
  rules: [String],
  pinnedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ privacy: 1 });
groupSchema.index({ category: 1 });
groupSchema.index({ 'members.user': 1 });

// Virtual for checking if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

// Virtual for checking if user is admin
groupSchema.methods.isAdmin = function(userId) {
  return this.admins.some(a => a.toString() === userId.toString()) || 
         this.creator.toString() === userId.toString();
};

module.exports = mongoose.model('Group', groupSchema);