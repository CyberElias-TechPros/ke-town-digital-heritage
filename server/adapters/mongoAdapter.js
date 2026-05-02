const User = require('../models/User');

module.exports.authenticate = async (userId) => {
  try {
    // For MongoDB
    return await User.findById(userId);
  } catch (err) {
    return null;
  }
};