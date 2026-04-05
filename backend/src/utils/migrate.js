require('dotenv').config();
const { pool } = require('../config/db');

const migrations = [
  {
    version: 1,
    name: 'create_users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         VARCHAR(100) NOT NULL,
        email        VARCHAR(255) UNIQUE NOT NULL,
        password     VARCHAR(255) NOT NULL,
        role         VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                     CHECK (role IN ('admin', 'analyst', 'viewer')),
        status       VARCHAR(20)  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `,
  },
  {
    version: 2,
    name: 'create_financial_records',
    sql: `
      CREATE TABLE IF NOT EXISTS financial_records (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        amount       NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
        type         VARCHAR(10)    NOT NULL CHECK (type IN ('income', 'expense')),
        category     VARCHAR(100)   NOT NULL,
        date         DATE           NOT NULL,
        notes        TEXT,
        created_by   UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        deleted_at   TIMESTAMPTZ    DEFAULT NULL,
        created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_records_type       ON financial_records(type);
      CREATE INDEX IF NOT EXISTS idx_records_category   ON financial_records(category);
      CREATE INDEX IF NOT EXISTS idx_records_date       ON financial_records(date DESC);
      CREATE INDEX IF NOT EXISTS idx_records_deleted    ON financial_records(deleted_at) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_records_created_by ON financial_records(created_by);
    `,
  },
  {
    version: 3,
    name: 'create_updated_at_trigger',
    sql: `
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
      CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_records_updated_at ON financial_records;
      CREATE TRIGGER trg_records_updated_at
        BEFORE UPDATE ON financial_records
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `,
  },
  {
    version: 4,
    name: 'create_migrations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
];

async function migrate() {
  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists first
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const { rows: applied } = await client.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.map(r => r.version));

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        console.log(`  ↩  Migration ${migration.version} (${migration.name}) already applied`);
        continue;
      }
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      await client.query('COMMIT');
      console.log(`  ✓  Migration ${migration.version} (${migration.name}) applied`);
    }
    console.log('\n✅ All migrations complete.\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) migrate();
module.exports = { migrate };
