const { Sequelize } = require('sequelize');

let sequelize = null;

const connectMySQL = async () => {
  const {
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
    MYSQL_CHARSET = 'utf8mb4'
  } = process.env;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
    console.log('⚠️ MySQL credentials not fully configured. Skipping MySQL connection.');
    return null;
  }

  try {
    sequelize = new Sequelize(MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, {
      host: MYSQL_HOST,
      port: parseInt(MYSQL_PORT) || 3306,
      dialect: 'mysql',
      charset: MYSQL_CHARSET,
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        // For cPanel SSL requirements if needed
        // ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : false
      }
    });

    await sequelize.authenticate();
    console.log('✅ Connected to MySQL database');
    // Synchronize models with database (create tables if not exist)
    await sequelize.sync();
    console.log('✅ Database tables synchronized');
    return sequelize;
  } catch (err) {
    console.log(`❌ MySQL connection failed: ${err.message}`);
    return null;
  }
};

const getSequelize = () => sequelize;

module.exports = {
  connectMySQL,
  getSequelize
};