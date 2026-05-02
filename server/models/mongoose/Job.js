const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'volunteer'],
    default: 'full-time'
  },
  category: {
    type: String,
    enum: ['engineering', 'design', 'marketing', 'operations', 'finance', 'education', 'healthcare', 'other'],
    default: 'other'
  },
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'NGN' }
  },
  requirements: [String],
  responsibilities: [String],
  applyUrl: {
    type: String
  },
  applyEmail: {
    type: String
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active'
  },
  views: {
    type: Number,
    default: 0
  },
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

JobSchema.index({ title: 'text', description: 'text' });
JobSchema.index({ status: 1, expiresAt: 1 });

JobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Job', JobSchema);