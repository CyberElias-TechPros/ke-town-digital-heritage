const mongoose = require('mongoose');

const GalleryItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: String, enum: ['historical', 'cultural', 'contemporary', 'environment'], required: true },
  imageUrl: { type: String, required: true },
  submittedBy: { type: String },
  approved: { type: Boolean, default: false },
  tags: [String],
}, { timestamps: true });

module.exports = mongoose.model('GalleryItem', GalleryItemSchema);
