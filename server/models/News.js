const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, default: 'KE Kingdom Admin' },
  category: { type: String, enum: ['announcement', 'development', 'culture', 'event', 'general'], default: 'general' },
  image: { type: String },
  published: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('News', NewsSchema);
