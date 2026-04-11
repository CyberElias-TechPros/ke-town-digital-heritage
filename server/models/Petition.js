const mongoose = require('mongoose');

const PetitionSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },
  targetSignatures: { type: Number, default: 100 },
  category: { 
    type: String, 
    enum: ['government', 'community', 'environmental', 'social', 'other'],
    default: 'community' 
  },
  image: { type: String },
  signatures: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isAnonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  signatureCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'active', 'achieved', 'rejected', 'closed'], default: 'draft' },
  deadline: { type: Date },
  response: {
    message: { type: String },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date }
  },
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

PetitionSchema.index({ status: 1, createdAt: -1 });
PetitionSchema.index({ category: 1, status: 1 });
PetitionSchema.index({ creator: 1 });

module.exports = mongoose.model('Petition', PetitionSchema);