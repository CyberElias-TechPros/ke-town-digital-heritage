const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  reportedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  reportedGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  reportedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  reason: { 
    type: String, 
    enum: ['spam', 'harassment', 'inappropriate', 'scam', 'fake', 'other'],
    required: true 
  },
  description: { type: String, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'reviewed', 'actioned', 'dismissed'], default: 'pending' },
  actionTaken: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date }
}, { timestamps: true });

ReportSchema.index({ reporter: 1 });
ReportSchema.index({ reportedUser: 1 });
ReportSchema.index({ status: 1 });

module.exports = mongoose.model('Report', ReportSchema);