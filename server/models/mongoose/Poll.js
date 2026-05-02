const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true, maxlength: 500 },
  options: [{
    text: { type: String, required: true, maxlength: 200 },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  totalVotes: { type: Number, default: 0 },
  expiresAt: { type: Date },
  isMultiple: { type: Boolean, default: false },
  allowViewVoters: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  viewCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 }
}, { timestamps: true });

PollSchema.index({ user: 1, createdAt: -1 });
PollSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Poll', PollSchema);