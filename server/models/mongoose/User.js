const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['user', 'moderator', 'content_manager', 'seller_manager', 'admin'];
const ACCOUNT_STATUS = ['active', 'suspended', 'deactivated'];

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  username: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: USER_ROLES, default: 'user' },
  accountStatus: { type: String, enum: ACCOUNT_STATUS, default: 'active' },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
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
  rsvpedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  
// Privacy & Social Settings
  profileVisibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
  allowMessages: { type: Boolean, default: true },
  showOnlineStatus: { type: Boolean, default: true },
  mutedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Preferences
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'Africa/Lagos' },
  notificationSettings: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Indexes for better performance (excluding unique fields which are auto-indexed)
UserSchema.index({ role: 1 });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ fullName: 'text', bio: 'text' });

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

// Check if account is locked
UserSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
UserSchema.methods.incrementLoginAttempts = async function() {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  if (this.loginAttempts + 1 >= MAX_ATTEMPTS) {
    await this.updateOne({
      $set: { loginAttempts: 0, lockUntil: Date.now() + LOCK_DURATION }
    });
  } else {
    await this.updateOne({ $inc: { loginAttempts: 1 } });
  }
};

// Reset login attempts
UserSchema.methods.resetLoginAttempts = async function() {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Check permissions
UserSchema.methods.hasRole = function(...roles) {
  return roles.includes(this.role);
};

UserSchema.methods.canManageUsers = function() {
  return ['admin', 'content_manager'].includes(this.role);
};

UserSchema.methods.canManageContent = function() {
  return ['admin', 'content_manager', 'moderator'].includes(this.role);
};

UserSchema.methods.canManageSellers = function() {
  return ['admin', 'seller_manager'].includes(this.role);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

module.exports = mongoose.model('User', UserSchema);
