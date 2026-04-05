const mongoose = require('mongoose');

const ElderStorySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  elderName: { type: String, required: true },
  elderPhoto: { type: String },
  elderTitle: { type: String },
  content: { type: String },
  audioUrl: { type: String },
  videoUrl: { type: String },
  thumbnailUrl: { type: String },
  duration: { type: String },
  category: { type: String, enum: ['history', 'tradition', 'customs', 'war-canoe', 'masquerade', 'fishing', 'marriage', 'spirituality', 'miscellaneous'], default: 'miscellaneous' },
  tags: [String],
  recordedBy: { type: String },
  recordedDate: { type: Date },
  language: { type: String, default: 'Kalabari' },
  transcript: { type: String },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('ElderStory', ElderStorySchema);