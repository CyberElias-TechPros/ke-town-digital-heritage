const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  donorName: { type: String, required: true },
  donorEmail: { type: String, required: true },
  amount: { type: Number, required: true, min: 100 },
  currency: { type: String, default: 'NGN' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  paystackReference: { type: String, unique: true, required: true },
  paystackAccessCode: { type: String },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  message: { type: String },
  isAnonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema);
