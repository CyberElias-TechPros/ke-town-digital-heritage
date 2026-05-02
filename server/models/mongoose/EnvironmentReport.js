const mongoose = require('mongoose');

const EnvironmentReportSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  year: { type: String },
  location: { type: String, required: true },
  impact: { type: String },
  status: { type: String, enum: ['active', 'documented', 'resolved'], default: 'documented' },
  sources: [String],
  image: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('EnvironmentReport', EnvironmentReportSchema);
