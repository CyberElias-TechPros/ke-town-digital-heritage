const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  endDate: { type: Date },
  type: { type: String, enum: ['festival', 'cultural', 'community', 'meeting', 'sport'], default: 'community' },
  location: { type: String, default: 'Ke Town' },
  image: { type: String },
  isRecurring: { type: Boolean, default: false },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
