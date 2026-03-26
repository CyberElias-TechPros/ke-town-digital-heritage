const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['general', 'story', 'photo', 'event', 'feedback', 'partnership'], default: 'general' },
  read: { type: Boolean, default: false },
  replied: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
