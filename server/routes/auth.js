const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const tokenExpiry = '7d';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: tokenExpiry }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Check username availability if provided
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken.' });
      }
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      username: username || null,
      password,
      role: 'user',
      accountStatus: 'active'
    });

    // Log registration
    await AuditLog.create({
      user: user._id,
      action: 'register',
      resource: 'user',
      resourceId: user._id,
      details: { method: 'email' }
    });

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(401).json({ error: 'Account is suspended or deactivated.' });
    }

    // Check if locked
    if (user.isLocked()) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ 
        error: 'Account is locked. Please try again later.',
        lockUntil: user.lockUntil
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log login
    await AuditLog.create({
      user: user._id,
      action: 'login',
      resource: 'user',
      resourceId: user._id,
      details: { method: 'password' }
    });

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        accountStatus: user.accountStatus,
        avatar: user.avatar,
        isSeller: user.isSeller,
        shopName: user.shopName,
        shopVerified: user.shopVerified
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a reset link will be sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Log password reset request
    await AuditLog.create({
      user: user._id,
      action: 'password_reset_requested',
      resource: 'user',
      resourceId: user._id
    });

    res.json({ 
      message: 'If the email exists, a reset link will be sent.',
      // In production, this would be sent via email
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log password reset
    await AuditLog.create({
      user: user._id,
      action: 'password_reset',
      resource: 'user',
      resourceId: user._id
    });

    // Generate new token
    const newToken = generateToken(user);

    res.json({
      message: 'Password reset successfully',
      token: newToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      emailVerificationToken: token
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'email_verified',
      resource: 'user',
      resourceId: user._id
    });

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        accountStatus: req.user.accountStatus,
        emailVerified: req.user.emailVerified,
        avatar: req.user.avatar,
        bio: req.user.bio,
        location: req.user.location,
        createdAt: req.user.createdAt,
        isSeller: req.user.isSeller,
        shopName: req.user.shopName,
        shopVerified: req.user.shopVerified,
        sellerRating: req.user.sellerRating,
        totalSales: req.user.totalSales,
        followers: req.user.followers,
        following: req.user.following,
        profileVisibility: req.user.profileVisibility,
        allowMessages: req.user.allowMessages,
        showOnlineStatus: req.user.showOnlineStatus,
        verified: req.user.verified,
        blockedUsers: req.user.blockedUsers,
        mutedUsers: req.user.mutedUsers
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowedFields = [
      'fullName', 'bio', 'location', 'avatar', 'profileVisibility', 
      'allowMessages', 'showOnlineStatus', 'username', 'language', 'timezone'
    ];
    
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'password_changed',
      resource: 'user',
      resourceId: user._id
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete account
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Password is incorrect.' });
    }

    // Deactivate account instead of deleting
    user.accountStatus = 'deactivated';
    user.isActive = false;
    user.email = `deleted_${Date.now()}@archived.com`;
    await user.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'account_deleted',
      resource: 'user',
      resourceId: req.user._id
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user permissions
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      role: user.role,
      permissions: {
        canManageUsers: user.canManageUsers(),
        canManageContent: user.canManageContent(),
        canManageSellers: user.canManageSellers(),
        isAdmin: user.role === 'admin',
        isModerator: user.role === 'moderator',
        isContentManager: user.role === 'content_manager',
        isSellerManager: user.role === 'seller_manager'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all users with pagination
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (status) filter.accountStatus = status;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update user role
router.put('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'moderator', 'content_manager', 'seller_manager', 'admin'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'role_changed',
      resource: 'user',
      resourceId: user._id,
      details: { newRole: role }
    });

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Update user status
router.put('/users/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { accountStatus } = req.body;
    const validStatus = ['active', 'suspended', 'deactivated'];
    
    if (!validStatus.includes(accountStatus)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        accountStatus,
        isActive: accountStatus === 'active'
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'status_changed',
      resource: 'user',
      resourceId: user._id,
      details: { accountStatus }
    });

    res.json({
      message: `User ${accountStatus === 'active' ? 'activated' : accountStatus} successfully`,
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Get user activity
router.get('/users/:id/activity', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const activities = await AuditLog.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get public user profile
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'fullName avatar bio location followers following createdAt isSeller shopName shopVerified sellerRating verified'
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Check if profile is private (if the viewer is not the owner)
    // For now, return basic info
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by username
router.get('/users/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      'fullName avatar bio location followers following createdAt isSeller shopName shopVerified sellerRating verified'
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;