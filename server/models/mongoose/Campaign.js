const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },
  category: { 
    type: String, 
    enum: ['medical', 'education', 'emergency', 'business', 'community', 'other'],
    default: 'other' 
  },
  targetAmount: { type: Number, required: true, min: 1000 },
  raisedAmount: { type: Number, default: 0 },
  image: { type: String },
  images: [String],
  beneficiary: {
    name: { type: String, required: true },
    phone: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    relationship: { type: String }
  },
  donors: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    message: { type: String },
    isAnonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
  expiresAt: { type: Date },
  isFeatured: { type: Boolean, default: false },
  shares: { type: Number, default: 0 }
}, { timestamps: true });

CampaignSchema.index({ status: 1, createdAt: -1 });
CampaignSchema.index({ category: 1, status: 1 });
CampaignSchema.index({ organizer: 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);