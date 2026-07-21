const { Sequelize } = require('sequelize');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'lease_analyzer',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = sequelize;
