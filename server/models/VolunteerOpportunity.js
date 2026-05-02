const DB_TYPE = process.env.DB_TYPE || 'mongo';

if (DB_TYPE === 'mysql') {
  const models = require('./sequelize');
  module.exports = models.VolunteerOpportunity;
} else {
  module.exports = require('./mongoose/VolunteerOpportunity');
}