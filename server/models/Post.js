const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  media: [{
    type: { type: String, enum: ['image', 'video'] },
    url: String,
    thumbnail: String,
    width: Number,
    height: Number
  }],
  location: {
    name: String,
    lat: Number,
    lng: Number
  },
  feeling: String,
  privacy: {
    type: String,
    enum: ['public', 'friends', 'only-me'],
    default: 'public'
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hashtags: [String],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'celebrate', 'support'] }
  }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: String }],
    replies: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: String }]
    }],
    createdAt: { type: Date, default: Date.now }
  }],
  commentCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  isEvent: { type: Boolean, default: false },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  isMarketplace: { type: Boolean, default: false },
  marketplace: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  visibility: {
    type: String,
    enum: ['public', 'community', 'followers'],
    default: 'community'
  }
}, {
  timestamps: true
});

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ 'reactions.user': 1 });

postSchema.virtual('likeCount').get(function() {
  return this.reactions.filter(r => r.type === 'like').length;
});

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);