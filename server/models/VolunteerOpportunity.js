const mongoose = require('mongoose');

const VolunteerOpportunitySchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 2000 },
  category: { 
    type: String, 
    enum: ['education', 'health', 'environment', 'sports', 'culture', 'community', 'technology', 'other'],
    default: 'community' 
  },
  location: {
    address: { type: String },
    city: { type: String },
    state: { type: String },
    isVirtual: { type: Boolean, default: false },
    virtualLink: { type: String }
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  commitment: { 
    type: String, 
    enum: ['one-time', 'daily', 'weekly', 'monthly', 'recurring'],
    default: 'one-time' 
  },
  spotsAvailable: { type: Number, default: 10 },
  volunteers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['applied', 'confirmed', 'completed', 'cancelled'], default: 'applied' },
    hoursLogged: { type: Number, default: 0 },
    appliedAt: { type: Date, default: Date.now }
  }],
  image: { type: String },
  status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

VolunteerOpportunitySchema.index({ status: 1, startDate: 1 });
VolunteerOpportunitySchema.index({ category: 1, status: 1 });
VolunteerOpportunitySchema.index({ 'volunteers.user': 1 });

module.exports = mongoose.model('VolunteerOpportunity', VolunteerOpportunitySchema);