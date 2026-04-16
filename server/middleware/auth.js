const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'keKingdom-secret-key-2024');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token or user not found.' });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(401).json({ error: 'Account is suspended or deactivated.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Check if user can manage users (admin or content_manager)
const requireUserManager = (req, res, next) => {
  if (!['admin', 'content_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. User management privileges required.' });
  }
  next();
};

// Check if user can manage content (admin, content_manager, or moderator)
const requireContentManager = (req, res, next) => {
  if (!['admin', 'content_manager', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Content management privileges required.' });
  }
  next();
};

// Check if user can manage sellers (admin or seller_manager)
const requireSellerManager = (req, res, next) => {
  if (!['admin', 'seller_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Seller management privileges required.' });
  }
  next();
};

// Check if user is admin or moderator
const requireModerator = (req, res, next) => {
  if (!['admin', 'moderator', 'content_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Moderator privileges required.' });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'keKingdom-secret-key-2024');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.accountStatus === 'active') {
        req.user = user;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { 
  authenticate, 
  requireAdmin, 
  requireUserManager,
  requireContentManager,
  requireSellerManager,
  requireModerator,
  optionalAuth 
};