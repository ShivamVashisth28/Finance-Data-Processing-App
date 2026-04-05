const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
  async create({ name, email, password, role = 'viewer' }) {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, status, created_at, updated_at`,
      [name, email, hash, role]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async findAll({ status } = {}) {
    const conditions = [];
    const params = [];
    if (status) { conditions.push(`status = $${params.push(status)}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users ${where} ORDER BY created_at DESC`
    , params);
    return rows;
  },

  async update(id, fields) {
    const allowed = ['name', 'email', 'role', 'status'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        updates.push(`${key} = $${params.length}`);
      }
    }
    if (updates.length === 0) return this.findById(id);

    params.push(id);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, name, email, role, status, created_at, updated_at`,
      params
    );
    return rows[0] || null;
  },

  async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  },
};

module.exports = UserModel;
