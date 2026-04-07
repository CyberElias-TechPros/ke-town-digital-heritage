const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String },
  bio: { type: String },
  location: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Seller Profile
  isSeller: { type: Boolean, default: false },
  shopName: { type: String },
  shopDescription: { type: String },
  shopBanner: { type: String },
  shopVerified: { type: Boolean, default: false },
  sellerRating: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
  
  // Buyer Profile
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 }
  }],
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  
  // Social Features
  notifications: [{
    type: { type: String, enum: ['follow', 'like', 'comment', 'message', 'order', 'review'] },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    link: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  unreadCount: { type: Number, default: 0 },
  
  // Privacy & Social Settings
  profileVisibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
  allowMessages: { type: Boolean, default: true },
  showOnlineStatus: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', UserSchema);
