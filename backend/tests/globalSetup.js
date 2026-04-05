process.env.NODE_ENV    = 'test';
process.env.JWT_SECRET  = 'test_secret_key';
process.env.DB_HOST     = process.env.DB_HOST     || 'localhost';
process.env.DB_PORT     = process.env.DB_PORT     || '5432';
process.env.DB_NAME     = process.env.TEST_DB_NAME || 'finance_test';
process.env.DB_USER     = process.env.DB_USER     || 'finance_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'finance_secret';

const { migrate } = require('../src/utils/migrate');

module.exports = async () => {
  console.log('\n[Test] Running migrations on test DB...');
  await migrate();
};
