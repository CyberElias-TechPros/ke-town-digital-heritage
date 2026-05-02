const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  caption: { type: String, maxlength: 500 },
  duration: { type: Number, default: 24 }, // hours before expiring
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: String }],
  replyCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

StorySchema.index({ user: 1, createdAt: -1 });
StorySchema.index({ createdAt: -1 }, { 
  expireAfterSeconds: 86400 // Auto-delete after 24 hours (86400 seconds = 24 hours)
});

module.exports = mongoose.model('Story', StorySchema);