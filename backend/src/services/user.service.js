const UserModel = require('../models/user.model');

const UserService = {
  async getAll(filters) { return UserModel.findAll(filters); },

  async getById(id) {
    const user = await UserModel.findById(id);
    if (!user) { const e = new Error('User not found.'); e.statusCode = 404; throw e; }
    const { password, ...safe } = user;
    return safe;
  },

  async update(id, fields, requestingUser) {
    if (requestingUser.id === id && fields.role && fields.role !== requestingUser.role) {
      const e = new Error('You cannot change your own role.'); e.statusCode = 403; throw e;
    }
    const existing = await UserModel.findById(id);
    if (!existing) { const e = new Error('User not found.'); e.statusCode = 404; throw e; }
    if (fields.email && fields.email !== existing.email) {
      const taken = await UserModel.findByEmail(fields.email);
      if (taken) { const e = new Error('Email already in use.'); e.statusCode = 409; throw e; }
    }
    return UserModel.update(id, fields);
  },
};

module.exports = { UserService };
