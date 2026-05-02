const mongoose = require('mongoose');

const MentorshipSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  menteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['available', 'matched', 'completed', 'cancelled'],
    default: 'available'
  },
  skills: [{
    type: String,
    required: true
  }],
  bio: {
    type: String,
    maxlength: 500
  },
  expertise: [{
    type: String
  }],
  experience: {
    type: String,
    maxlength: 1000
  },
  availability: {
    type: String,
    enum: ['weekdays', 'weekends', 'evenings', 'flexible'],
    default: 'flexible'
  },
  matchedAt: Date,
  completedAt: Date,
  notes: [{
    text: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

MentorshipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Mentorship', MentorshipSchema);