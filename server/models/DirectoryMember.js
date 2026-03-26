const mongoose = require('mongoose');

const DirectoryMemberSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  connection: { type: String, enum: ['born', 'descendant', 'married', 'friend'], required: true },
  bio: { type: String },
  isPublic: { type: Boolean, default: true },
  approved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('DirectoryMember', DirectoryMemberSchema);
