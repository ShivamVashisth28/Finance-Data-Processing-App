// ── Auth Service ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const AuthService = {
  async register({ name, email, password, role }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) { const e = new Error('Email already registered.'); e.statusCode = 409; throw e; }
    return UserModel.create({ name, email, password, role });
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    const valid = user && await UserModel.verifyPassword(password, user.password);
    if (!valid) { const e = new Error('Invalid email or password.'); e.statusCode = 401; throw e; }
    if (user.status === 'inactive') { const e = new Error('Account is inactive.'); e.statusCode = 403; throw e; }

    const { password: _, ...safe } = user;
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
    return { token, user: safe };
  },
};

module.exports = { AuthService };
