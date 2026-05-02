const User = require('../models/User');

module.exports.authenticate = async (userId) => {
  try {
    // For MySQL using Sequelize (expects UUID or integer id)
    return await User.findByPk(userId);
  } catch (err) {
    return null;
  }
};