const mongoose = require('mongoose');

const GalleryItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: String, enum: ['historical', 'cultural', 'contemporary', 'environment'], required: true },
  imageUrl: { type: String, required: true },
  submittedBy: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved: { type: Boolean, default: false },
  tags: [String],
  commentCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('GalleryItem', GalleryItemSchema);
