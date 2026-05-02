const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  date: { type: Date, required: true },
  endDate: { type: Date },
  type: { type: String, enum: ['festival', 'cultural', 'community', 'meeting', 'sport'], default: 'community' },
  category: { type: String, enum: ['general', 'education', 'business', 'culture', 'sports', 'technology', 'health', 'religion', 'entertainment'], default: 'general' },
  location: { type: String, default: 'Ke Kingdom' },
  image: { type: String },
  coverImage: { type: String },
  isRecurring: { type: Boolean, default: false },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
  
  // Social features
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxAttendees: { type: Number },
  isVirtual: { type: Boolean, default: false },
  virtualLink: { type: String },
  isPinned: { type: Boolean, default: false }
}, { timestamps: true });

EventSchema.index({ date: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ organizer: 1 });

module.exports = mongoose.model('Event', EventSchema);