const { pool } = require('../src/config/db');

module.exports = async () => {
  await pool.query('DROP TABLE IF EXISTS financial_records, users, schema_migrations CASCADE').catch(() => {});
  await pool.end();
};
