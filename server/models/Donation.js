const dbType = process.env.DB_TYPE || 'mongo';

if (dbType === 'mysql') {
  module.exports = require('./sequelize').Donation;
} else {
  module.exports = require('./mongoose/Donation');
}
