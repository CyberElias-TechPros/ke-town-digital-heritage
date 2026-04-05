const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  images: [String],
  category: { type: String, enum: ['textiles', 'jewelry', 'masquerade', 'art', 'crafts', 'food', 'other'], required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  artisanName: { type: String, required: true },
  artisanLocation: { type: String },
  stock: { type: Number, default: 0, min: 0 },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  contact: { type: String },
  tags: [String],
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);