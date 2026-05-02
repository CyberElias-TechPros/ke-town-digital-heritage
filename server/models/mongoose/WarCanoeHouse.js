const mongoose = require('mongoose');

const WarCanoeHouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  kalabariName: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  foundingStory: {
    type: String
  },
  foundingYear: {
    type: String // Can be approximate like "16th century"
  },
  founder: {
    name: String,
    title: String
  },
  community: {
    type: String,
    default: 'Ke Kingdom'
  },
  currentLeader: {
    name: String,
    title: String,
    since: String
  },
  members: [{
    name: String,
    title: String,
    isLeader: { type: Boolean, default: false }
  }],
  achievements: [String],
  ceremonies: [String],
  crest: String,
  colors: [String],
  location: String,
  status: {
    type: String,
    enum: ['active', 'dormant', 'extinct'],
    default: 'active'
  },
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

WarCanoeHouseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WarCanoeHouse', WarCanoeHouseSchema);