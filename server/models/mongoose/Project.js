const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['planning', 'fundraising', 'in_progress', 'completed'], default: 'planning' },
  goalAmount: { type: Number, required: true },
  raisedAmount: { type: Number, default: 0 },
  image: { type: String },
  updates: [{ text: String, date: { type: Date, default: Date.now } }],
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
