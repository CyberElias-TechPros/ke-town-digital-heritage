const mongoose = require('mongoose');

const OralHistorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  narrator: {
    name: { type: String, required: true },
    title: String,
    house: String,
    community: { type: String, default: 'Ke Kingdom' }
  },
  category: {
    type: String,
    enum: ['history', 'tradition', 'genealogy', 'folklore', 'war-story', 'migration', 'ceremony', 'other'],
    default: 'history'
  },
  language: {
    type: String,
    enum: ['kalabari', 'english', 'mixed'],
    default: 'mixed'
  },
  audioUrl: {
    type: String
  },
  videoUrl: {
    type: String
  },
  transcript: {
    type: String
  },
  duration: {
    type: Number // in seconds
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved: {
    type: Boolean,
    default: true
  },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

OralHistorySchema.index({ title: 'text', description: 'text', transcript: 'text' });
OralHistorySchema.index({ category: 1, approved: 1 });

OralHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('OralHistory', OralHistorySchema);