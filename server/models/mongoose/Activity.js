const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['post', 'like', 'comment', 'follow', 'galleryUpload'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetType: { type: String },
  description: { type: String },
}, { timestamps: true });

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);