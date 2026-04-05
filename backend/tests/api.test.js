const request = require('supertest');
const app     = require('../src/app');
const { pool } = require('../src/config/db');

// ── Helpers ──────────────────────────────────────────────────────────────────
let _counter = 0;
const uniq = role => {
  _counter++;
  return { name: `${role} ${_counter}`, email: `${role}${_counter}@test.com`, password: 'Test@1234', role };
};

async function registerAndLogin(role = 'admin') {
  const creds = uniq(role);
  await request(app).post('/api/auth/register').send(creds);
  const { body } = await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password });
  return { token: body.data.token, user: body.data.user };
}

const auth = token => ({ Authorization: `Bearer ${token}` });

const record = (overrides = {}) => ({
  amount: 5000, type: 'income', category: 'Salary',
  date: '2024-06-01', notes: 'Test', ...overrides,
});

// ── Cleanup between tests ─────────────────────────────────────────────────────
afterEach(async () => {
  await pool.query('DELETE FROM financial_records');
  await pool.query('DELETE FROM users');
  _counter = 0;
});

// ═════════════════════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  it('creates a user and returns sanitized data (no password)', async () => {
    const res = await request(app).post('/api/auth/register').send(uniq('admin'));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data.role).toBe('admin');
  });

  it('defaults role to viewer when omitted', async () => {
    const { name, email, password } = uniq('viewer');
    const res = await request(app).post('/api/auth/register').send({ name, email, password });
    expect(res.body.data.role).toBe('viewer');
  });

  it('returns 409 for duplicate email', async () => {
    const creds = uniq('admin');
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
  });

  it('returns 422 for invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'bad', password: 'pass123' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@x.com', password: '123' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('returns JWT on valid credentials', async () => {
    const creds = uniq('admin');
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(creds.email);
  });

  it('returns 401 for wrong password', async () => {
    const creds = uniq('admin');
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/login').send({ email: creds.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@x.com', password: 'pass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user for valid token', async () => {
    const { token, user } = await registerAndLogin('analyst');
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RECORDS — ACCESS CONTROL
// ═════════════════════════════════════════════════════════════════════════════
describe('Records — access control', () => {
  it('viewer cannot create a record (403)', async () => {
    const { token } = await registerAndLogin('viewer');
    const res = await request(app).post('/api/records').set(auth(token)).send(record());
    expect(res.status).toBe(403);
  });

  it('analyst cannot create a record (403)', async () => {
    const { token } = await registerAndLogin('analyst');
    const res = await request(app).post('/api/records').set(auth(token)).send(record());
    expect(res.status).toBe(403);
  });

  it('viewer cannot read raw records (403)', async () => {
    const { token } = await registerAndLogin('viewer');
    const res = await request(app).get('/api/records').set(auth(token));
    expect(res.status).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RECORDS — CRUD
// ═════════════════════════════════════════════════════════════════════════════
describe('Records — CRUD', () => {
  let adminToken, analystToken, recordId;

  beforeEach(async () => {
    ({ token: adminToken }   = await registerAndLogin('admin'));
    ({ token: analystToken } = await registerAndLogin('analyst'));
  });

  it('admin creates a record (201)', async () => {
    const res = await request(app).post('/api/records').set(auth(adminToken)).send(record());
    expect(res.status).toBe(201);
    expect(parseFloat(res.body.data.amount)).toBe(5000);
    recordId = res.body.data.id;
  });

  it('analyst can read the record list', async () => {
    await request(app).post('/api/records').set(auth(adminToken)).send(record());
    const res = await request(app).get('/api/records').set(auth(analystToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('admin updates a record', async () => {
    const { body: { data: { id } } } = await request(app).post('/api/records').set(auth(adminToken)).send(record());
    const res = await request(app).patch(`/api/records/${id}`).set(auth(adminToken)).send({ amount: 9999 });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.amount)).toBe(9999);
  });

  it('returns 404 for non-existent record', async () => {
    const res = await request(app).get('/api/records/00000000-0000-0000-0000-000000000000').set(auth(analystToken));
    expect(res.status).toBe(404);
  });

  it('admin soft-deletes a record', async () => {
    const { body: { data: { id } } } = await request(app).post('/api/records').set(auth(adminToken)).send(record());
    const del = await request(app).delete(`/api/records/${id}`).set(auth(adminToken));
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/records/${id}`).set(auth(analystToken));
    expect(get.status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RECORDS — VALIDATION
// ═════════════════════════════════════════════════════════════════════════════
describe('Records — validation', () => {
  let adminToken;
  beforeEach(async () => { ({ token: adminToken } = await registerAndLogin('admin')); });

  it('rejects negative amount (422)', async () => {
    const res = await request(app).post('/api/records').set(auth(adminToken)).send(record({ amount: -100 }));
    expect(res.status).toBe(422);
  });

  it('rejects invalid type (422)', async () => {
    const res = await request(app).post('/api/records').set(auth(adminToken)).send(record({ type: 'transfer' }));
    expect(res.status).toBe(422);
  });

  it('rejects malformed date (422)', async () => {
    const res = await request(app).post('/api/records').set(auth(adminToken)).send(record({ date: '15-06-2024' }));
    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RECORDS — FILTERING & PAGINATION
// ═════════════════════════════════════════════════════════════════════════════
describe('Records — filtering & pagination', () => {
  let adminToken, analystToken;

  beforeEach(async () => {
    ({ token: adminToken }   = await registerAndLogin('admin'));
    ({ token: analystToken } = await registerAndLogin('analyst'));
    await Promise.all([
      request(app).post('/api/records').set(auth(adminToken)).send(record({ type: 'income',  category: 'Salary',    date: '2024-01-10', amount: 1000 })),
      request(app).post('/api/records').set(auth(adminToken)).send(record({ type: 'expense', category: 'Rent',      date: '2024-01-20', amount: 500 })),
      request(app).post('/api/records').set(auth(adminToken)).send(record({ type: 'expense', category: 'Food & Dining', date: '2024-02-05', amount: 200 })),
    ]);
  });

  it('filters by type=income', async () => {
    const res = await request(app).get('/api/records?type=income').set(auth(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.records.every(r => r.type === 'income')).toBe(true);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/records?category=Rent').set(auth(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.records.every(r => r.category === 'Rent')).toBe(true);
  });

  it('filters by date range', async () => {
    const res = await request(app).get('/api/records?startDate=2024-01-01&endDate=2024-01-31').set(auth(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.records.every(r => r.date.startsWith('2024-01'))).toBe(true);
  });

  it('paginates correctly', async () => {
    const res = await request(app).get('/api/records?page=1&limit=2').set(auth(analystToken));
    expect(res.status).toBe(200);
    expect(res.body.records.length).toBeLessThanOrEqual(2);
    expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
describe('Dashboard', () => {
  let adminToken, viewerToken;

  beforeEach(async () => {
    ({ token: adminToken }  = await registerAndLogin('admin'));
    ({ token: viewerToken } = await registerAndLogin('viewer'));
    await Promise.all([
      request(app).post('/api/records').set(auth(adminToken)).send(record({ type: 'income',  amount: 10000, category: 'Salary',    date: '2024-03-01' })),
      request(app).post('/api/records').set(auth(adminToken)).send(record({ type: 'expense', amount: 3000,  category: 'Rent',      date: '2024-03-05' })),
      request(app).post('/api/records').set(auth(adminToken)).send(record({ type: 'income',  amount: 5000,  category: 'Freelance', date: '2024-04-10' })),
    ]);
  });

  it('viewer can access /dashboard/summary', async () => {
    const res = await request(app).get('/api/dashboard/summary').set(auth(viewerToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total_income');
    expect(res.body.data).toHaveProperty('total_expense');
    expect(res.body.data).toHaveProperty('net_balance');
  });

  it('net_balance equals income minus expense', async () => {
    const res = await request(app).get('/api/dashboard/summary').set(auth(viewerToken));
    const { total_income, total_expense, net_balance } = res.body.data;
    expect(parseFloat(net_balance)).toBeCloseTo(parseFloat(total_income) - parseFloat(total_expense), 1);
  });

  it('/dashboard/overview returns all sections', async () => {
    const res = await request(app).get('/api/dashboard/overview').set(auth(viewerToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('categories');
    expect(res.body.data).toHaveProperty('monthly_trends');
    expect(res.body.data).toHaveProperty('weekly_trends');
    expect(res.body.data).toHaveProperty('recent_activity');
  });

  it('/dashboard/categories returns income and expense groups', async () => {
    const res = await request(app).get('/api/dashboard/categories').set(auth(viewerToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('income');
    expect(res.body.data).toHaveProperty('expense');
  });

  it('/dashboard/trends/monthly returns pivoted rows with net', async () => {
    const res = await request(app).get('/api/dashboard/trends/monthly?year=2024').set(auth(viewerToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('net');
    }
  });

  it('unauthenticated dashboard request returns 401', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// USERS
// ═════════════════════════════════════════════════════════════════════════════
describe('Users', () => {
  it('admin can list all users', async () => {
    const { token } = await registerAndLogin('admin');
    const res = await request(app).get('/api/users').set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('analyst cannot list users (403)', async () => {
    const { token } = await registerAndLogin('analyst');
    const res = await request(app).get('/api/users').set(auth(token));
    expect(res.status).toBe(403);
  });

  it('admin can update a user role', async () => {
    const { token: adminToken } = await registerAndLogin('admin');
    const { user: targetUser }  = await registerAndLogin('viewer');
    const res = await request(app).patch(`/api/users/${targetUser.id}`).set(auth(adminToken)).send({ role: 'analyst' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('analyst');
  });

  it('admin can deactivate a user', async () => {
    const { token: adminToken } = await registerAndLogin('admin');
    const { user: targetUser }  = await registerAndLogin('viewer');
    const res = await request(app).patch(`/api/users/${targetUser.id}`).set(auth(adminToken)).send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
  });
});
