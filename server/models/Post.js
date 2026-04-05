const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 5000 },
  imageUrl: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

PostSchema.index({ createdAt: -1 });
PostSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);