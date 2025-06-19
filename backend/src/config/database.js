const { Sequelize } = require('sequelize');
require('dotenv').config();
const testConfig = require('./test.config');

const getSequelize = () => {
  if (process.env.NODE_ENV === 'test') {
    return new Sequelize(
      testConfig.database.database,
      testConfig.database.username,
      testConfig.database.password,
      {
        host: testConfig.database.host,
        dialect: testConfig.database.dialect,
        logging: testConfig.database.logging,
        pool: testConfig.database.pool,
        define: {
          timestamps: true,
          underscored: true
        }
      }
    );
  }

  return new Sequelize(
    process.env.DB_NAME || 'ticketing_system',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'root',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true
      }
    }
  );
};

const sequelize = getSequelize();

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1); // Exit if database connection fails
  });

module.exports = sequelize; 