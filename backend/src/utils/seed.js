require('dotenv').config();
const { pool } = require('../config/db');
const { migrate } = require('./migrate');
const bcrypt = require('bcryptjs');

const INCOME_CATS  = ['Salary', 'Investments', 'Freelance', 'Dividends', 'Bonus'];
const EXPENSE_CATS = ['Rent', 'Utilities', 'Food & Dining', 'Transport', 'Healthcare', 'Software Subscriptions', 'Office Supplies', 'Marketing', 'Insurance', 'Travel'];

const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const randItem = arr => arr[Math.floor(Math.random() * arr.length)];
const randDate = (start, end) => {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
};

async function seed() {
  console.log('\n🌱 Running migrations...');
  await migrate();

  const client = await pool.connect();
  try {
    console.log('👤 Creating users...');

    const users = [
      { name: 'Alice Admin',    email: 'admin@finance.dev',    password: 'Admin@123',    role: 'admin' },
      { name: 'Ana Analyst',    email: 'analyst@finance.dev',  password: 'Analyst@123',  role: 'analyst' },
      { name: 'Victor Viewer',  email: 'viewer@finance.dev',   password: 'Viewer@123',   role: 'viewer' },
    ];

    let adminId;
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, email, role`,
        [u.name, u.email, hash, u.role]
      );
      console.log(`  ✓ ${rows[0].email} (${rows[0].role})`);
      if (u.role === 'admin') adminId = rows[0].id;
    }

    console.log('\n💰 Seeding financial records...');

    const start = new Date('2024-01-01');
    const end   = new Date('2025-03-31');
    const records = [];

    // Structured monthly salary
    for (let m = 0; m < 15; m++) {
      const d = new Date(2024, m, 5);
      if (d > end) break;
      records.push([rand(80000, 120000), 'income', 'Salary', d.toISOString().split('T')[0],
        `Monthly salary - ${d.toLocaleString('default', { month: 'long', year: 'numeric' })}`]);
    }

    // Monthly rent
    for (let m = 0; m < 15; m++) {
      const d = new Date(2024, m, 1);
      if (d > end) break;
      records.push([45000, 'expense', 'Rent', d.toISOString().split('T')[0], 'Office rent']);
    }

    // Random transactions
    for (let i = 0; i < 120; i++) {
      const isIncome = Math.random() > 0.6;
      records.push([
        isIncome ? rand(2000, 60000) : rand(200, 25000),
        isIncome ? 'income' : 'expense',
        isIncome ? randItem(INCOME_CATS) : randItem(EXPENSE_CATS),
        randDate(start, end),
        null,
      ]);
    }

    // Batch insert
    for (const [amount, type, category, date, notes] of records) {
      await client.query(
        `INSERT INTO financial_records (amount, type, category, date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [amount, type, category, date, notes, adminId]
      );
    }

    console.log(`  ✓ ${records.length} records created`);
    console.log('\n✅ Seed complete!\n');
    console.log('Test credentials:');
    console.log('  Admin   → admin@finance.dev   / Admin@123');
    console.log('  Analyst → analyst@finance.dev / Analyst@123');
    console.log('  Viewer  → viewer@finance.dev  / Viewer@123\n');

  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
