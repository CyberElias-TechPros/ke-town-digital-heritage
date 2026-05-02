const db = require('../models');

// Adapter for User model with Mongoose-like API
const UserAdapter = {
  async findOne(query) {
    const where = {};
    Object.keys(query).forEach(key => {
      if (key === '_id' || key === 'id') {
        where.id = query[key];
      } else if (key === 'email') {
        where.email = query[key];
      } else if (key === 'username') {
        where.username = query[key];
      } else {
        where[key] = query[key];
      }
    });
    return await db.User.findOne({ where });
  },

  async findById(id) {
    return await db.User.findByPk(id);
  },

  async find(filter) {
    const where = {};
    Object.keys(filter).forEach(key => {
      if (key === '_id') {
        where.id = { [Array.isArray(filter[key]) ? '$in' : '$eq']: filter[key] };
      } else {
        where[key] = filter[key];
      }
    });
    return await db.User.findAll({ where });
  },

  async create(data) {
    return await db.User.create(data);
  },

  async findByIdAndUpdate(id, update, options) {
    const record = await db.User.findByPk(id);
    if (!record) return null;
    await record.update(update);
    // If options.new is true, return updated
    if (options && options.new) {
      return await db.User.findByPk(id);
    }
    return record;
  },

  async updateOne(filter, update) {
    const where = {};
    Object.keys(filter).forEach(key => {
      where[key === '_id' ? 'id' : key] = filter[key];
    });
    return await db.User.update(update, { where });
  },

  async countDocuments(filter) {
    const where = {};
    Object.keys(filter).forEach(key => {
      where[key === '_id' ? 'id' : key] = filter[key];
    });
    return await db.User.count({ where });
  },

  async select(...fields) {
    // For MySQL, return raw data with attributes
    const instances = await db.User.findAll();
    const result = instances.map(inst => {
      const obj = inst.get({ plain: true });
      if (fields.length) {
        const filtered = {};
        fields.forEach(f => {
          if (f !== '-password' && obj.hasOwnProperty(f)) {
            filtered[f] = obj[f];
          }
        });
        return filtered;
      }
      return obj;
    });
    return result;
  },

  async populate(docs, path, select) {
    // Simplified populate: if docs is array, iterate
    if (!docs) return null;
    const items = Array.isArray(docs) ? docs : [docs];
    for (const item of items) {
      // Handle references like 'organizer', 'author', etc.
      // This is simplistic; full implementation would need association handling
    }
    return docs;
  },

  // Instance method helpers
  comparePassword(candidatePassword) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(candidatePassword, this.password);
  },

  isLocked() {
    return this.lockUntil && this.lockUntil > Date.now();
  },

  async incrementLoginAttempts() {
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION = 15 * 60 * 1000;
    if (this.loginAttempts + 1 >= MAX_ATTEMPTS) {
      await this.update({
        loginAttempts: 0,
        lockUntil: Date.now() + LOCK_DURATION
      });
    } else {
      await this.update({ $inc: { loginAttempts: 1 } });
    }
  },

  async resetLoginAttempts() {
    await this.update({
      loginAttempts: 0,
      lockUntil: null
    });
  },

  canManageUsers() {
    return ['admin', 'content_manager'].includes(this.role);
  },

  canManageContent() {
    return ['admin', 'content_manager', 'moderator'].includes(this.role);
  },

  canManageSellers() {
    return ['admin', 'seller_manager'].includes(this.role);
  }
};

// Apply instance methods to User model prototype
if (db.User && db.User.prototype) {
  db.User.prototype.comparePassword = UserAdapter.comparePassword;
  db.User.prototype.isLocked = UserAdapter.isLocked;
  db.User.prototype.incrementLoginAttempts = UserAdapter.incrementLoginAttempts;
  db.User.prototype.resetLoginAttempts = UserAdapter.resetLoginAttempts;
  db.User.prototype.canManageUsers = UserAdapter.canManageUsers;
  db.User.prototype.canManageContent = UserAdapter.canManageContent;
  db.User.prototype.canManageSellers = UserAdapter.canManageSellers;
}

module.exports = {
  ...db.User,
  findOne: UserAdapter.findOne,
  findById: UserAdapter.findById,
  find: UserAdapter.find,
  create: UserAdapter.create,
  findByIdAndUpdate: UserAdapter.findByIdAndUpdate,
  updateOne: UserAdapter.updateOne,
  countDocuments: UserAdapter.countDocuments
};