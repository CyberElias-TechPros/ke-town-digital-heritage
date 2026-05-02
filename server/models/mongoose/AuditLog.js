const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'register',
      'password_changed',
      'password_reset',
      'password_reset_requested',
      'email_verified',
      'profile_updated',
      'role_changed',
      'status_changed',
      'account_deleted',
      'content_created',
      'content_updated',
      'content_deleted',
      'report_submitted',
      'donation_made',
      'order_placed',
      'order_updated',
      'group_joined',
      'group_left',
      'follower_added',
      'blocking',
      'verification'
    ]
  },
  resource: {
    type: String,
    enum: ['user', 'post', 'event', 'news', 'gallery', 'group', 'product', 'order', 'donation', 'message', 'report']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

// Static method to log an action
auditLogSchema.statics.log = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);