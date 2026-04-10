const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 80
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['electronics', 'fashion', 'home', 'vehicles', 'services', 'beauty', 'sports', 'books', 'food', 'other'],
    required: true
  },
  condition: {
    type: String,
    enum: ['new', 'like-new', 'used-good', 'used-fair'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  negotiable: { type: Boolean, default: true },
  images: [String],
  video: String,
  brand: String,
  model: String,
  size: String,
  color: String,
  location: {
    name: String,
    lat: Number,
    lng: Number
  },
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['active', 'sold', 'archived'],
    default: 'active'
  },
  isFeatured: { type: Boolean, default: false },
  contact: { type: String },
  tags: [String],
  quantity: { type: Number, default: 1, min: 1 }
}, { timestamps: true });

ProductSchema.index({ seller: 1, createdAt: -1 });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);