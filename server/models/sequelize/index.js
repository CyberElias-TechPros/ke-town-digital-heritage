const { DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../../config/database').getSequelize();

// ==========================
// ADAPTER UTILITIES
// ==========================
function convertFilter(filter) {
  if (!filter) return {};
  const where = {};
  for (let key in filter) {
    const val = filter[key];
    let dbKey = key === '_id' ? 'id' : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const ops = {};
      for (let op in val) {
        const v = val[op];
        switch (op) {
          case '$in': ops[Op.in] = v; break;
          case '$gte': ops[Op.gte] = v; break;
          case '$lte': ops[Op.lte] = v; break;
          case '$gt': ops[Op.gt] = v; break;
          case '$lt': ops[Op.lt] = v; break;
          case '$ne': ops[Op.ne] = v; break;
          case '$regex': ops[Op.like] = `%${v}%`; break;
          case '$eq': ops[Op.eq] = v; break;
          default: ops[op] = v;
        }
      }
      where[dbKey] = ops;
    } else if (key === '$or' && Array.isArray(val)) {
      const orClauses = val.map(cond => convertFilter(cond));
      where[Op.or] = orClauses;
    } else {
      where[dbKey] = val;
    }
  }
  return where;
}

function parseSort(sortObj) {
  if (!sortObj) return undefined;
  const order = [];
  for (let field in sortObj) {
    const dir = sortObj[field] === 1 ? 'ASC' : 'DESC';
    order.push([field, dir]);
  }
  return order;
}

function parseSelect(fields) {
  if (!fields) return null;
  const include = [];
  const exclude = [];
  fields.split(/\s+/).forEach(f => {
    if (f.startsWith('-')) exclude.push(f.slice(1));
    else include.push(f);
  });
  const attrs = {};
  if (include.length) attrs.include = include;
  if (exclude.length) attrs.exclude = exclude;
  return Object.keys(attrs).length ? attrs : null;
}

// Simple array populate registry for direct arrays that aren't formal associations
const SIMPLE_ARRAY_POPULATES = {
  Conversation: {
    participants: { targetModel: 'User' }
  }
};

// Custom populate registry for nested paths (container.field)
const CUSTOM_POPULATE_REGISTRY = {
  User: {
    'cart.product': { targetModel: 'Product', foreignKey: 'product' },
    'notifications.from': { targetModel: 'User', foreignKey: 'from' }
  },
  Post: {
    'comments.author': { targetModel: 'User', foreignKey: 'author' },
    'reactions.user': { targetModel: 'User', foreignKey: 'user' }
  }
};

// Query builder for chaining
class Query {
  constructor(Model, where = {}) {
    this.Model = Model;
    this.where = where;
    this.order = undefined;
    this.offset = undefined;
    this.limit = undefined;
    this.attributes = undefined;
    this.include = [];
    this.lean = false;
    this._single = false;
    this._customPopulates = [];
    // Store reference to models registry (will be set later)
    this.models = global.__sequelize_models__;
  }

  sort(sortObj) {
    this.order = parseSort(sortObj);
    return this;
  }

  skip(n) {
    this.offset = n;
    return this;
  }

  limit(n) {
    this.limit = n;
    return this;
  }

  select(fields) {
    this.attributes = parseSelect(fields);
    return this;
  }

  populate(path, fields) {
    const assoc = this.Model.associations && this.Model.associations[path];
    if (assoc) {
      const attrs = fields ? fields.split(' ') : undefined;
      this.include.push({ model: assoc.target, as: path, attributes: attrs });
    } else {
      // Custom
      this._customPopulates.push({ path, fields });
    }
    return this;
  }

  lean(flag = true) {
    this.lean = flag;
    return this;
  }

  async _processCustomPopulates(results) {
    if (!this._customPopulates.length) return results;
    const docs = Array.isArray(results) ? results : [results];

    for (const { path, fields } of this._customPopulates) {
      const parts = path.split('.');
      if (parts.length === 2) {
        // Nested populate: container.field
        const [containerField, subField] = parts;
        const registry = CUSTOM_POPULATE_REGISTRY[this.Model.name] || {};
        const entry = registry[path];
        if (!entry) continue;
        const TargetModel = this.models[entry.targetModel];
        if (!TargetModel) continue;
        const options = {};
        if (fields) options.attributes = fields.split(' ');
        const allIds = new Set();
        docs.forEach(doc => {
          const container = doc[containerField];
          if (Array.isArray(container)) {
            container.forEach(item => {
              if (item && item[subField]) allIds.add(item[subField]);
            });
          }
        });
        if (!allIds.size) continue;
        const idArr = Array.from(allIds);
        const targets = await TargetModel.findAll({
          where: { id: { [Op.in]: idArr } },
          ...options
        });
        const map = {};
        targets.forEach(t => {
          map[t.id] = this.lean ? t.get({ plain: true }) : t;
        });
        docs.forEach(doc => {
          const container = doc[containerField];
          if (Array.isArray(container)) {
            container.forEach(item => {
              if (item && item[subField] && map[item[subField]]) {
                item[subField] = map[item[subField]];
              }
            });
          }
        });
      } else if (parts.length === 1) {
        // Simple array field populate (e.g., Conversation.participants)
        const field = path;
        const simpleReg = SIMPLE_ARRAY_POPULATES[this.Model.name] || {};
        const entry = simpleReg[field];
        if (!entry) continue;
        const TargetModel = this.models[entry.targetModel];
        if (!TargetModel) continue;
        const options = {};
        if (fields) options.attributes = fields.split(' ');
        const allIds = new Set();
        docs.forEach(doc => {
          const arr = doc[field];
          if (Array.isArray(arr)) {
            arr.forEach(id => allIds.add(id));
          }
        });
        if (!allIds.size) continue;
        const idArr = Array.from(allIds);
        const targets = await TargetModel.findAll({
          where: { id: { [Op.in]: idArr } },
          ...options
        });
        const map = {};
        targets.forEach(t => {
          map[t.id] = this.lean ? t.get({ plain: true }) : t;
        });
        docs.forEach(doc => {
          const arr = doc[field];
          if (Array.isArray(arr)) {
            doc[field] = arr.map(id => map[id] || id);
          }
        });
      }
    }
    return Array.isArray(results) ? docs : docs[0];
  }

  async exec() {
    const opts = {
      where: convertFilter(this.where),
      order: this.order,
      offset: this.offset,
      limit: this.limit,
      attributes: this.attributes,
      include: this.include.length ? this.include : undefined
    };
    let results;
    if (this._single) {
      results = await this.Model.findOne(opts);
    } else {
      results = await this.Model.findAll(opts);
    }
    if (this.lean && results) {
      results = Array.isArray(results) ? results.map(r => r.get({ plain: true })) : results.get({ plain: true });
    }
    if (this._customPopulates.length) {
      results = await this._processCustomPopulates(results);
    }
    return results;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

class UpdateQuery extends Query {
  constructor(Model, id, update, options = {}) {
    super(Model);
    this.id = id;
    this.update = update;
    this.options = options;
  }

  async exec() {
    const Model = this.Model;
    const id = this.id;
    const update = this.update;
    const opts = this.options;
    const sequelize = Model.sequelize;

    // Handle MongoDB-style operators
    let result;
    if (update && typeof update === 'object') {
      const keys = Object.keys(update);
      const hasOperators = keys.some(k => k.startsWith('$'));

      if (!hasOperators) {
        // Plain set - direct update
        result = await Model.update(update, { where: { id } });
      } else {
        // Process operators: $set, $inc, $push, $unset
        if (update.$set) {
          await Model.update(update.$set, { where: { id } });
        }
        if (update.$inc) {
          for (const [field, incVal] of Object.entries(update.$inc)) {
            await Model.increment(field, { by: incVal, where: { id } });
          }
        }
        if (update.$push) {
          for (const [field, value] of Object.entries(update.$push)) {
            // Read-modify-write: safe for any JSON value
            const row = await Model.findOne({ where: { id } });
            const current = row ? row.get(field) : null;
            let arr = Array.isArray(current) ? current : [];
            arr.push(value);
            await Model.update({ [field]: arr }, { where: { id } });
          }
        }
        if (update.$unset) {
          for (const field of Object.keys(update.$unset)) {
            await Model.update({ [field]: null }, { where: { id } });
          }
        }
      }
    }

    if (!opts || !opts.new) {
      return null;
    }

    // Return updated document
    const fetchOpts = {
      where: { id },
      order: this.order,
      offset: this.offset,
      limit: this.limit,
      attributes: this.attributes,
      include: this.include.length ? this.include : undefined
    };
    let doc = await Model.findOne(fetchOpts);
    if (this.lean && doc) doc = doc.get({ plain: true });
    if (doc && this._customPopulates.length) {
      doc = await this._processCustomPopulates(doc);
    }
    return doc;
  }
}

function adaptModel(Model) {
  // Register model globally for custom populates
  if (!global.__sequelize_models__) global.__sequelize_models__ = {};
  global.__sequelize_models__[Model.name] = Model;

  Model.findOne = function(query) {
    const q = new Query(this, query);
    q._single = true;
    return q;
  };
  Model.find = function(query) {
    return new Query(this, query);
  };
  Model.findById = function(id) {
    return this.findOne({ id });
  };
  Model.findByIdAndUpdate = function(id, update, options) {
    const q = new UpdateQuery(this, id, update, options);
    return q;
  };
  Model.countDocuments = function(filter) {
    const where = convertFilter(filter);
    return this.count({ where });
  };
  Model.updateOne = function(filter, update) {
    const where = convertFilter(filter);
    return this.update(update, { where });
  };
  Model.deleteOne = function(filter) {
    const where = convertFilter(filter);
    return this.destroy({ where });
  };
  Model.findOneAndDelete = function(filter) {
    const where = convertFilter(filter);
    return this.findOne({ where }).then(doc => doc ? doc.destroy() : null);
  };

  Model.findOneAndUpdate = async function(filter, update, options) {
    const where = convertFilter(filter);
    const Model = this;

    // Handle MongoDB-style operators
    if (update && typeof update === 'object') {
      const keys = Object.keys(update);
      const hasOperators = keys.some(k => k.startsWith('$'));

      if (!hasOperators) {
        await Model.update(update, { where });
      } else {
        if (update.$set) {
          await Model.update(update.$set, { where });
        }
        if (update.$inc) {
          for (const [field, incVal] of Object.entries(update.$inc)) {
            await Model.increment(field, { by: incVal, where });
          }
        }
        if (update.$push) {
          for (const [field, value] of Object.entries(update.$push)) {
            const row = await Model.findOne({ where });
            const current = row ? row.get(field) : null;
            let arr = Array.isArray(current) ? current : [];
            arr.push(value);
            await Model.update({ [field]: arr }, { where });
          }
        }
        if (update.$unset) {
          for (const field of Object.keys(update.$unset)) {
            await Model.update({ [field]: null }, { where });
          }
        }
      }
    }

    if (options && options.new) {
      return Model.findOne({ where });
    }
    return null;
  };

  Model.deleteMany = function(filter) {
    const where = convertFilter(filter);
    return this.destroy({ where });
  };

  Model.insertMany = function(docs) {
    return this.bulkCreate(docs);
  };

  // Virtual _id getter
  Object.defineProperty(Model.prototype, '_id', {
    get() { return this.id; },
    set(val) { this.id = val; }
  });
}

// ==========================
// MODEL DEFINITIONS
// ==========================

// USER
const User = sequelize.define('User', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  fullName: { type: DataTypes.STRING(100), allowNull: false },
  username: { type: DataTypes.STRING(50), unique: true, sparse: true },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('user', 'moderator', 'content_manager', 'seller_manager', 'admin'), defaultValue: 'user' },
  accountStatus: { type: DataTypes.ENUM('active', 'suspended', 'deactivated'), defaultValue: 'active' },
  emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  emailVerificationToken: { type: DataTypes.STRING },
  passwordResetToken: { type: DataTypes.STRING },
  passwordResetExpires: { type: DataTypes.DATE },
  loginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  lockUntil: { type: DataTypes.DATE },
  avatar: { type: DataTypes.STRING(500) },
  bio: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING(100) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE },
  followers: { type: DataTypes.JSON, defaultValue: [] },
  following: { type: DataTypes.JSON, defaultValue: [] },
  isSeller: { type: DataTypes.BOOLEAN, defaultValue: false },
  shopName: { type: DataTypes.STRING(100) },
  shopDescription: { type: DataTypes.TEXT },
  shopBanner: { type: DataTypes.STRING(500) },
  shopVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  sellerRating: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalSales: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalProducts: { type: DataTypes.INTEGER, defaultValue: 0 },
  cart: { type: DataTypes.JSON, defaultValue: [] },
  orders: { type: DataTypes.JSON, defaultValue: [] },
  notifications: { type: DataTypes.JSON, defaultValue: [] },
  unreadCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  rsvpedEvents: { type: DataTypes.JSON, defaultValue: [] },
  profileVisibility: { type: DataTypes.ENUM('public', 'followers', 'private'), defaultValue: 'public' },
  allowMessages: { type: DataTypes.BOOLEAN, defaultValue: true },
  showOnlineStatus: { type: DataTypes.BOOLEAN, defaultValue: true },
  mutedUsers: { type: DataTypes.JSON, defaultValue: [] },
  blockedUsers: { type: DataTypes.JSON, defaultValue: [] },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verifiedAt: { type: DataTypes.DATE },
  verifiedBy: { type: DataTypes.STRING(36) },
  language: { type: DataTypes.STRING(10), defaultValue: 'en' },
  timezone: { type: DataTypes.STRING(50), defaultValue: 'Africa/Lagos' },
  notificationSettings: { type: DataTypes.JSON, defaultValue: { email: true, push: true, sms: false } }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { fields: ['role'] },
    { fields: ['accountStatus'] },
    { fields: ['createdAt'], order: [['DESC']] }
  ]
});

User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

User.prototype.comparePassword = async function(candidate) {
  return await bcrypt.compare(candidate, this.password);
};
User.prototype.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};
User.prototype.incrementLoginAttempts = async function() {
  if (this.loginAttempts + 1 >= 5) {
    await this.update({ loginAttempts: 0, lockUntil: Date.now() + 15*60*1000 });
  } else {
    await this.update({ loginAttempts: this.loginAttempts + 1 });
  }
};
User.prototype.resetLoginAttempts = async function() {
  await this.update({ loginAttempts: 0, lockUntil: null });
};
User.prototype.canManageUsers = function() { return ['admin','content_manager'].includes(this.role); };
User.prototype.canManageContent = function() { return ['admin','content_manager','moderator'].includes(this.role); };
User.prototype.canManageSellers = function() { return ['admin','seller_manager'].includes(this.role); };
User.prototype.toJSON = function() {
  const data = this.get({ plain: true });
  delete data.password;
  delete data.passwordResetToken;
  delete data.passwordResetExpires;
  delete data.loginAttempts;
  delete data.lockUntil;
  return data;
};

// AUDIT LOG
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user: { type: DataTypes.STRING(36), allowNull: false },
  action: {
    type: DataTypes.ENUM(
      'login','logout','register','password_changed','password_reset',
      'password_reset_requested','email_verified','profile_updated','role_changed',
      'status_changed','account_deleted','content_created','content_updated',
      'content_deleted','report_submitted','donation_made','order_placed',
      'order_updated','group_joined','group_left','follower_added','blocking','verification'
    ),
    allowNull: false
  },
  resource: { type: DataTypes.ENUM('user','post','event','news','gallery','group','product','order','donation','message','report') },
  resourceId: { type: DataTypes.STRING(36) },
  details: { type: DataTypes.JSON },
  ipAddress: { type: DataTypes.STRING(45) },
  userAgent: { type: DataTypes.TEXT }
}, {
  tableName: 'audit_logs',
  timestamps: true
});

// EVENT
const Event = sequelize.define('Event', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  date: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE },
  type: { type: DataTypes.ENUM('festival','cultural','community','meeting','sport'), defaultValue: 'community' },
  category: { type: DataTypes.ENUM('general','education','business','culture','sports','technology','health','religion','entertainment'), defaultValue: 'general' },
  location: { type: DataTypes.STRING(200), defaultValue: 'Ke Kingdom' },
  image: { type: DataTypes.STRING(500) },
  coverImage: { type: DataTypes.STRING(500) },
  isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('upcoming','ongoing','completed'), defaultValue: 'upcoming' },
  organizer: { type: DataTypes.STRING(36), allowNull: false },
  rsvps: { type: DataTypes.JSON, defaultValue: [] },
  maxAttendees: { type: DataTypes.INTEGER },
  isVirtual: { type: DataTypes.BOOLEAN, defaultValue: false },
  virtualLink: { type: DataTypes.STRING(500) },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'events',
  timestamps: true,
  indexes: [
    { fields: ['date'] },
    { fields: ['category'] },
    { fields: ['organizer'] },
    { fields: ['status'] }
  ]
});

// NEWS
const News = sequelize.define('News', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  excerpt: { type: DataTypes.TEXT, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  author: { type: DataTypes.STRING(100), defaultValue: 'KE Kingdom Admin' },
  category: { type: DataTypes.ENUM('announcement','development','culture','event','general'), defaultValue: 'general' },
  image: { type: DataTypes.STRING(500) },
  published: { type: DataTypes.BOOLEAN, defaultValue: false },
  featured: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'news',
  timestamps: true
});

// GROUP
const Group = sequelize.define('Group', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(50), allowNull: false },
  description: { type: DataTypes.STRING(500) },
  coverImage: { type: DataTypes.STRING(500) },
  privacy: { type: DataTypes.ENUM('public','private','secret'), defaultValue: 'public' },
  category: { type: DataTypes.ENUM('general','education','business','culture','sports','technology','health','religion','other'), defaultValue: 'general' },
  creator: { type: DataTypes.STRING(36), allowNull: false },
  admins: { type: DataTypes.JSON, defaultValue: [] },
  members: { type: DataTypes.JSON, defaultValue: [] },
  posts: { type: DataTypes.JSON, defaultValue: [] },
  memberCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  pendingRequests: { type: DataTypes.JSON, defaultValue: [] },
  joinMethod: { type: DataTypes.ENUM('open','approval'), defaultValue: 'open' },
  allowPosts: { type: DataTypes.ENUM('members','admins','all'), defaultValue: 'members' },
  rules: { type: DataTypes.JSON, defaultValue: [] },
  pinnedPost: { type: DataTypes.STRING(36) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'groups',
  timestamps: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['privacy'] },
    { fields: ['category'] }
  ]
});

// POST
const Post = sequelize.define('Post', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  author: { type: DataTypes.STRING(36), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  media: { type: DataTypes.JSON, defaultValue: [] },
  location: { type: DataTypes.JSON },
  feeling: { type: DataTypes.STRING(100) },
  privacy: { type: DataTypes.ENUM('public','friends','only-me'), defaultValue: 'public' },
  mentions: { type: DataTypes.JSON, defaultValue: [] },
  hashtags: { type: DataTypes.JSON, defaultValue: [] },
  reactions: { type: DataTypes.JSON, defaultValue: [] },
  comments: { type: DataTypes.JSON, defaultValue: [] },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  shareCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isEvent: { type: DataTypes.BOOLEAN, defaultValue: false },
  event: { type: DataTypes.STRING(36) },
  isMarketplace: { type: DataTypes.BOOLEAN, defaultValue: false },
  marketplace: { type: DataTypes.STRING(36) },
  visibility: { type: DataTypes.ENUM('public','community','followers'), defaultValue: 'community' }
}, {
  tableName: 'posts',
  timestamps: true,
  indexes: [
    { fields: ['author'] },
    { fields: ['visibility'] },
    { fields: ['createdAt'], order: [['DESC']] }
  ]
});

// PRODUCT
const Product = sequelize.define('Product', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  seller: { type: DataTypes.STRING(36), allowNull: false },
  title: { type: DataTypes.STRING(80), allowNull: false },
  name: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('title'); } }, // alias for compatibility
  artisan: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('seller'); } }, // alias for compatibility
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.ENUM('electronics','fashion','home','vehicles','services','beauty','sports','books','food','other'), allowNull: false },
  condition: { type: DataTypes.ENUM('new','like-new','used-good','used-fair'), allowNull: false },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false, validate: { min: 0 } },
  negotiable: { type: DataTypes.BOOLEAN, defaultValue: true },
  images: { type: DataTypes.JSON, defaultValue: [] },
  video: { type: DataTypes.STRING(500) },
  brand: { type: DataTypes.STRING(100) },
  model: { type: DataTypes.STRING(100) },
  size: { type: DataTypes.STRING(50) },
  color: { type: DataTypes.STRING(50) },
  location: { type: DataTypes.JSON },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
  likes: { type: DataTypes.JSON, defaultValue: [] },
  status: { type: DataTypes.ENUM('active','sold','archived'), defaultValue: 'active' },
  isActive: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('status') === 'active'; } }, // derived from status
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
  contact: { type: DataTypes.STRING(100) },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  stock: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('quantity'); } }, // alias for compatibility
  rating: { type: DataTypes.FLOAT, defaultValue: 0 },
  reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    { fields: ['seller'] },
    { fields: ['category'] },
    { fields: ['status'] }
  ]
});

// ORDER
const Order = sequelize.define('Order', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  buyer: { type: DataTypes.STRING(36), allowNull: false },
  seller: { type: DataTypes.STRING(36) }, // denormalized top-level seller for easier queries
  items: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidItems(value) {
        if (Array.isArray(value)) {
          value.forEach((item, idx) => {
            if (!item.product || !item.seller) {
              throw new Error(`Order item ${idx} must have product and seller`);
            }
          });
        }
      }
    }
  },
  shippingAddress: { type: DataTypes.JSON },
  deliveryMethod: { type: DataTypes.JSON },
  payment: { type: DataTypes.JSON },
  status: { type: DataTypes.ENUM('pending','processing','shipped','delivered','completed','cancelled','refund_requested','refunded'), defaultValue: 'pending' },
  timeline: { type: DataTypes.JSON, defaultValue: [] },
  subtotal: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  shippingFee: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  totalAmount: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('total'); }, set(val) { this.setDataValue('total', val); } }, // alias
  notes: { type: DataTypes.TEXT },
  trackingNumber: { type: DataTypes.STRING(100) },
  cancelledAt: { type: DataTypes.DATE },
  cancellationReason: { type: DataTypes.TEXT },
  refundedAt: { type: DataTypes.DATE },
  refundAmount: { type: DataTypes.DECIMAL(10,2) }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['buyer'] },
    { fields: ['seller'] },
    { fields: ['status'] }
  ]
});

// COMMENT (standalone)
const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user: { type: DataTypes.STRING(36), allowNull: false },
  content: { type: DataTypes.STRING(1000), allowNull: false },
  targetType: { type: DataTypes.ENUM('post','galleryItem'), allowNull: false },
  targetId: { type: DataTypes.STRING(36), allowNull: false }
}, {
  tableName: 'comments',
  timestamps: true,
  indexes: [
    { fields: ['targetType','targetId'] },
    { fields: ['user'] }
  ]
});

// MESSAGE
const Message = sequelize.define('Message', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  conversation: { type: DataTypes.STRING(36), allowNull: false },
  sender: { type: DataTypes.STRING(36), allowNull: false },
  recipient: { type: DataTypes.STRING(36), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE },
  attachments: { type: DataTypes.JSON }
}, {
  tableName: 'messages',
  timestamps: true,
  indexes: [
    { fields: ['conversation'] },
    { fields: ['sender'] },
    { fields: ['recipient'] }
  ]
});

// CONVERSATION
const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  participants: { type: DataTypes.JSON, defaultValue: [] },
  lastMessage: { type: DataTypes.STRING(36) },
  lastMessageAt: { type: DataTypes.DATE },
  product: { type: DataTypes.STRING(36) }
}, {
  tableName: 'conversations',
  timestamps: true
});

// GALLERY ITEM
const GalleryItem = sequelize.define('GalleryItem', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.ENUM('historical','cultural','contemporary','environment'), allowNull: false },
  imageUrl: { type: DataTypes.STRING(500), allowNull: false },
  submittedBy: { type: DataTypes.STRING(100) },
  author: { type: DataTypes.STRING(36) },
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'gallery_items',
  timestamps: true
});

// ACTIVITY
const Activity = sequelize.define('Activity', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user: { type: DataTypes.STRING(36), allowNull: false },
  type: { type: DataTypes.ENUM('post','like','comment','follow','galleryUpload'), allowNull: false },
  targetId: { type: DataTypes.STRING(36) },
  targetType: { type: DataTypes.STRING(50) },
  description: { type: DataTypes.TEXT }
}, {
  tableName: 'activities',
  timestamps: true,
  indexes: [
    { fields: ['createdAt'], order: [['DESC']] },
    { fields: ['user'] }
  ]
});

// ELDER STORY
const ElderStory = sequelize.define('ElderStory', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  elderName: { type: DataTypes.STRING(100), allowNull: false },
  elderPhoto: { type: DataTypes.STRING(500) },
  elderTitle: { type: DataTypes.STRING(100) },
  content: { type: DataTypes.TEXT },
  audioUrl: { type: DataTypes.STRING(500) },
  videoUrl: { type: DataTypes.STRING(500) },
  thumbnailUrl: { type: DataTypes.STRING(500) },
  duration: { type: DataTypes.STRING(20) },
  category: { type: DataTypes.ENUM('history','tradition','customs','war-canoe','masquerade','fishing','marriage','spirituality','miscellaneous'), defaultValue: 'miscellaneous' },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  recordedBy: { type: DataTypes.STRING(100) },
  recordedDate: { type: DataTypes.DATE },
  language: { type: DataTypes.STRING(20), defaultValue: 'Kalabari' },
  transcript: { type: DataTypes.TEXT },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'elder_stories',
  timestamps: true
});

// MENTORSHIP
const Mentorship = sequelize.define('Mentorship', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  mentorId: { type: DataTypes.STRING(36), allowNull: false },
  menteeId: { type: DataTypes.STRING(36) },
  status: { type: DataTypes.ENUM('available','matched','completed','cancelled'), defaultValue: 'available' },
  skills: { type: DataTypes.JSON, defaultValue: [] },
  bio: { type: DataTypes.STRING(500) },
  expertise: { type: DataTypes.JSON, defaultValue: [] },
  experience: { type: DataTypes.TEXT },
  availability: { type: DataTypes.ENUM('weekdays','weekends','evenings','flexible'), defaultValue: 'flexible' },
  matchedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE },
  notes: { type: DataTypes.JSON, defaultValue: [] }
}, {
  tableName: 'mentorships',
  timestamps: true
});

// ORAL HISTORY
const OralHistory = sequelize.define('OralHistory', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  narrator: { type: DataTypes.JSON, allowNull: false },
  category: { type: DataTypes.ENUM('history','tradition','genealogy','folklore','war-story','migration','ceremony','other'), defaultValue: 'history' },
  language: { type: DataTypes.ENUM('kalabari','english','mixed'), defaultValue: 'mixed' },
  audioUrl: { type: DataTypes.STRING(500) },
  videoUrl: { type: DataTypes.STRING(500) },
  transcript: { type: DataTypes.TEXT },
  duration: { type: DataTypes.INTEGER },
  recordedBy: { type: DataTypes.STRING(36) },
  approved: { type: DataTypes.BOOLEAN, defaultValue: true },
  tags: { type: DataTypes.JSON, defaultValue: [] }
}, {
  tableName: 'oral_histories',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['approved'] }
  ]
});

// JOB
const Job = sequelize.define('Job', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  company: { type: DataTypes.STRING(100) },
  description: { type: DataTypes.TEXT, allowNull: false },
  location: { type: DataTypes.STRING(200) },
  type: { type: DataTypes.ENUM('full-time','part-time','contract','internship','volunteer'), defaultValue: 'full-time' },
  category: { type: DataTypes.ENUM('engineering','design','marketing','operations','finance','education','healthcare','other'), defaultValue: 'other' },
  salary: { type: DataTypes.JSON },
  requirements: { type: DataTypes.JSON, defaultValue: [] },
  responsibilities: { type: DataTypes.JSON, defaultValue: [] },
  applyUrl: { type: DataTypes.STRING(500) },
  applyEmail: { type: DataTypes.STRING(100) },
  postedBy: { type: DataTypes.STRING(36), allowNull: false },
  status: { type: DataTypes.ENUM('active','closed','draft'), defaultValue: 'active' },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
  expiresAt: { type: DataTypes.DATE }
}, {
  tableName: 'jobs',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['expiresAt'] }
  ]
});

// NEWSLETTER SUBSCRIBER
const NewsletterSubscriber = sequelize.define('NewsletterSubscriber', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'newsletter_subscribers',
  timestamps: true
});

// ENVIRONMENT REPORT
const EnvironmentReport = sequelize.define('EnvironmentReport', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  year: { type: DataTypes.STRING(10) },
  location: { type: DataTypes.STRING(200), allowNull: false },
  impact: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('active','documented','resolved'), defaultValue: 'documented' },
  sources: { type: DataTypes.JSON, defaultValue: [] },
  image: { type: DataTypes.STRING(500) }
}, {
  tableName: 'environment_reports',
  timestamps: true
});

// DIRECTORY MEMBER
const DirectoryMember = sequelize.define('DirectoryMember', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  fullName: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, validate: { isEmail: true } },
  city: { type: DataTypes.STRING(100), allowNull: false },
  country: { type: DataTypes.STRING(100), allowNull: false },
  connection: { type: DataTypes.ENUM('born','descendant','married','friend'), allowNull: false },
  bio: { type: DataTypes.TEXT },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
  approved: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'directory_members',
  timestamps: true
});

// CONTACT MESSAGE
const ContactMessage = sequelize.define('ContactMessage', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, validate: { isEmail: true } },
  subject: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('general','story','photo','event','feedback','partnership'), defaultValue: 'general' },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  replied: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'contact_messages',
  timestamps: true
});

// PETITION
const Petition = sequelize.define('Petition', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  creator: { type: DataTypes.STRING(36), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  targetSignatures: { type: DataTypes.INTEGER, defaultValue: 100 },
  category: { type: DataTypes.ENUM('government','community','environmental','social','other'), defaultValue: 'community' },
  image: { type: DataTypes.STRING(500) },
  signatures: { type: DataTypes.JSON, defaultValue: [] },
  signatureCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft','active','achieved','rejected','closed'), defaultValue: 'draft' },
  deadline: { type: DataTypes.DATE },
  response: { type: DataTypes.JSON },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'petitions',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['creator'] }
  ]
});

// CAMPAIGN
const Campaign = sequelize.define('Campaign', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  organizer: { type: DataTypes.STRING(36), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.ENUM('medical','education','emergency','business','community','other'), defaultValue: 'other' },
  targetAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 1000 } },
  raisedAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  image: { type: DataTypes.STRING(500) },
  images: { type: DataTypes.JSON, defaultValue: [] },
  beneficiary: { type: DataTypes.JSON },
  donors: { type: DataTypes.JSON, defaultValue: [] },
  status: { type: DataTypes.ENUM('draft','active','completed','cancelled'), defaultValue: 'draft' },
  expiresAt: { type: DataTypes.DATE },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
  shares: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'campaigns',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['organizer'] }
  ]
});

// POLL
const Poll = sequelize.define('Poll', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user: { type: DataTypes.STRING(36), allowNull: false },
  question: { type: DataTypes.STRING(500), allowNull: false },
  options: { type: DataTypes.JSON, defaultValue: [] },
  totalVotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  expiresAt: { type: DataTypes.DATE },
  isMultiple: { type: DataTypes.BOOLEAN, defaultValue: false },
  allowViewVoters: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('active','closed'), defaultValue: 'active' },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'polls',
  timestamps: true,
  indexes: [
    { fields: ['user'] },
    { fields: ['status'] }
  ]
});

// REPORT
const Report = sequelize.define('Report', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  reporter: { type: DataTypes.STRING(36), allowNull: false },
  reportedUser: { type: DataTypes.STRING(36) },
  reportedPost: { type: DataTypes.STRING(36) },
  reportedProduct: { type: DataTypes.STRING(36) },
  reportedGroup: { type: DataTypes.STRING(36) },
  reportedEvent: { type: DataTypes.STRING(36) },
  reason: { type: DataTypes.ENUM('spam','harassment','inappropriate','scam','fake','other'), allowNull: false },
  description: { type: DataTypes.STRING(1000) },
  status: { type: DataTypes.ENUM('pending','reviewed','actioned','dismissed'), defaultValue: 'pending' },
  actionTaken: { type: DataTypes.TEXT },
  resolvedBy: { type: DataTypes.STRING(36) },
  resolvedAt: { type: DataTypes.DATE }
}, {
  tableName: 'reports',
  timestamps: true,
  indexes: [
    { fields: ['reporter'] },
    { fields: ['reportedUser'] },
    { fields: ['status'] }
  ]
});

// REVIEW
const Review = sequelize.define('Review', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  product: { type: DataTypes.STRING(36), allowNull: false },
  buyer: { type: DataTypes.STRING(36), allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  title: { type: DataTypes.STRING(100) },
  comment: { type: DataTypes.STRING(500) },
  images: { type: DataTypes.JSON, defaultValue: [] },
  isVerifiedPurchase: { type: DataTypes.BOOLEAN, defaultValue: false },
  helpful: { type: DataTypes.JSON, defaultValue: [] },
  sellerResponse: { type: DataTypes.JSON }
}, {
  tableName: 'reviews',
  timestamps: true,
  indexes: [
    { fields: ['product'] },
    { fields: ['buyer'] },
    { fields: ['product','buyer'], unique: true, name: 'unique_product_buyer' }
  ]
});

// STORY
const Story = sequelize.define('Story', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user: { type: DataTypes.STRING(36), allowNull: false },
  media: { type: DataTypes.STRING(500), allowNull: false },
  mediaType: { type: DataTypes.ENUM('image','video'), defaultValue: 'image' },
  caption: { type: DataTypes.STRING(500) },
  duration: { type: DataTypes.INTEGER, defaultValue: 24 },
  views: { type: DataTypes.JSON, defaultValue: [] },
  reactions: { type: DataTypes.JSON, defaultValue: [] },
  replyCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'stories',
  timestamps: true,
  indexes: [
    { fields: ['user'] },
    { fields: ['createdAt'], order: [['DESC']] }
  ]
});

// VOLUNTEER OPPORTUNITY
const VolunteerOpportunity = sequelize.define('VolunteerOpportunity', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  organizer: { type: DataTypes.STRING(36), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.ENUM('education','health','environment','sports','culture','community','technology','other'), defaultValue: 'community' },
  location: { type: DataTypes.JSON },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE },
  commitment: { type: DataTypes.ENUM('one-time','daily','weekly','monthly','recurring'), defaultValue: 'one-time' },
  spotsAvailable: { type: DataTypes.INTEGER, defaultValue: 10 },
  volunteers: { type: DataTypes.JSON, defaultValue: [] },
  image: { type: DataTypes.STRING(500) },
  status: { type: DataTypes.ENUM('draft','active','completed','cancelled'), defaultValue: 'draft' },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'volunteer_opportunities',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['startDate'] }
  ]
});

// WAR CANOE HOUSE
const WarCanoeHouse = sequelize.define('WarCanoeHouse', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  kalabariName: { type: DataTypes.STRING(100) },
  description: { type: DataTypes.TEXT, allowNull: false },
  foundingStory: { type: DataTypes.TEXT },
  foundingYear: { type: DataTypes.STRING(20) },
  founder: { type: DataTypes.JSON },
  community: { type: DataTypes.STRING(100), defaultValue: 'Ke Kingdom' },
  currentLeader: { type: DataTypes.JSON },
  members: { type: DataTypes.JSON, defaultValue: [] },
  achievements: { type: DataTypes.JSON, defaultValue: [] },
  ceremonies: { type: DataTypes.JSON, defaultValue: [] },
  crest: { type: DataTypes.STRING(500) },
  colors: { type: DataTypes.JSON, defaultValue: [] },
  location: { type: DataTypes.STRING(200) },
  status: { type: DataTypes.ENUM('active','dormant','extinct'), defaultValue: 'active' },
  imageUrl: { type: DataTypes.STRING(500) }
}, {
  tableName: 'war_canoe_houses',
  timestamps: true
});

// PROJECT
const Project = sequelize.define('Project', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  organizer: { type: DataTypes.STRING(36) },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('planning','fundraising','in_progress','completed'), defaultValue: 'planning' },
  goalAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  raisedAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  image: { type: DataTypes.STRING(500) },
  updates: { type: DataTypes.JSON, defaultValue: [] }
}, {
  tableName: 'projects',
  timestamps: true,
  indexes: [
    { fields: ['organizer'] },
    { fields: ['status'] }
  ]
});

// DONATION
const Donation = sequelize.define('Donation', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  donorName: { type: DataTypes.STRING(100), allowNull: false },
  donorEmail: { type: DataTypes.STRING(100), allowNull: false, validate: { isEmail: true } },
  amount: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 100 } },
  currency: { type: DataTypes.STRING(10), defaultValue: 'NGN' },
  projectId: { type: DataTypes.STRING(36) },
  paystackReference: { type: DataTypes.STRING(255), unique: true },
  paystackAccessCode: { type: DataTypes.STRING(255) },
  status: { type: DataTypes.ENUM('pending','success','failed'), defaultValue: 'pending' },
  message: { type: DataTypes.TEXT },
  isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'donations',
  timestamps: false,
  indexes: [
    { fields: ['paystackReference'], unique: true },
    { fields: ['projectId'] },
    { fields: ['status'] }
  ]
});

// ==========================
// ASSOCIATIONS
// ==========================
// User relationships
User.hasMany(Event, { foreignKey: 'organizer', as: 'events' });
User.hasMany(Post, { foreignKey: 'author', as: 'posts' });
User.hasMany(Product, { foreignKey: 'seller', as: 'products' });
User.hasMany(Order, { foreignKey: 'buyer', as: 'orders' });
User.hasMany(Project, { foreignKey: 'organizer', as: 'projects' });
User.hasMany(Comment, { foreignKey: 'user', as: 'comments' });
User.hasMany(Message, { foreignKey: 'sender', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'recipient', as: 'receivedMessages' });
User.hasMany(Activity, { foreignKey: 'user', as: 'activities' });
User.hasMany(News, { foreignKey: 'author', as: 'news' }); // author is string, so skip FK in DB; use virtual
User.hasMany(Job, { foreignKey: 'postedBy', as: 'jobs' });
User.hasMany(Petition, { foreignKey: 'creator', as: 'petitions' });
User.hasMany(Campaign, { foreignKey: 'organizer', as: 'campaigns' });
User.hasMany(Poll, { foreignKey: 'user', as: 'polls' });
User.hasMany(Report, { foreignKey: 'reporter', as: 'reports' });
User.hasMany(Review, { foreignKey: 'buyer', as: 'reviews' });
User.hasMany(Story, { foreignKey: 'user', as: 'stories' });
User.hasMany(Mentorship, { foreignKey: 'mentorId', as: 'mentorships' });
User.hasMany(Mentorship, { foreignKey: 'menteeId', as: 'menteeships' });
User.hasMany(OralHistory, { foreignKey: 'recordedBy', as: 'oralHistories' });
User.hasMany(VolunteerOpportunity, { foreignKey: 'organizer', as: 'volunteerOpportunities' });

// Event belongsTo User
Event.belongsTo(User, { foreignKey: 'organizer', as: 'organizer' });

// Post belongsTo User
Post.belongsTo(User, { foreignKey: 'author', as: 'author' });

// Product belongsTo User
Product.belongsTo(User, { foreignKey: 'seller', as: 'seller' });

// Project belongsTo User (organizer)
Project.belongsTo(User, { foreignKey: 'organizer', as: 'organizer' });

// Order belongsTo User (buyer and seller)
Order.belongsTo(User, { foreignKey: 'buyer', as: 'buyer' });
Order.belongsTo(User, { foreignKey: 'seller', as: 'seller' });

// Comment belongsTo User
Comment.belongsTo(User, { foreignKey: 'user', as: 'user' });

// Message belongsTo Conversation and Users
Message.belongsTo(Conversation, { foreignKey: 'conversation', as: 'conversation' });
Message.belongsTo(User, { foreignKey: 'sender', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'recipient', as: 'recipient' });

Conversation.hasMany(Message, { foreignKey: 'conversation', as: 'messages' });

// GalleryItem belongsTo User
GalleryItem.belongsTo(User, { foreignKey: 'author', as: 'author' });

// Activity belongsTo User
Activity.belongsTo(User, { foreignKey: 'user', as: 'user' });

// Job belongsTo User
Job.belongsTo(User, { foreignKey: 'postedBy', as: 'postedBy' });

// Petition belongsTo User
Petition.belongsTo(User, { foreignKey: 'creator', as: 'creator' });

// Campaign belongsTo User
Campaign.belongsTo(User, { foreignKey: 'organizer', as: 'organizer' });

// Poll belongsTo User
Poll.belongsTo(User, { foreignKey: 'user', as: 'user' });

// Report belongsTo User (reporter)
Report.belongsTo(User, { foreignKey: 'reporter', as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'reportedUser', as: 'reportedUser' });

// Review belongsTo Product and User
Review.belongsTo(Product, { foreignKey: 'product', as: 'product' });
Review.belongsTo(User, { foreignKey: 'buyer', as: 'buyer' });

// Review static method: getAverageRating
Review.getAverageRating = async function(productId) {
  const result = await this.findAll({
    where: { product: productId },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    raw: true
  });
  const count = parseInt(result[0]?.count || 0);
  const avgRating = count ? parseFloat(result[0]?.avgRating || 0).toFixed(1) : 0;
  return { avgRating, count };
};

// Story belongsTo User
Story.belongsTo(User, { foreignKey: 'user', as: 'user' });

// Mentorship belongsTo Users
Mentorship.belongsTo(User, { foreignKey: 'mentorId', as: 'mentorId' });
Mentorship.belongsTo(User, { foreignKey: 'menteeId', as: 'menteeId' });

// OralHistory belongsTo User (recordedBy)
OralHistory.belongsTo(User, { foreignKey: 'recordedBy', as: 'recordedBy' });

// VolunteerOpportunity belongsTo User
VolunteerOpportunity.belongsTo(User, { foreignKey: 'organizer', as: 'organizer' });

// Group belongsTo User (creator)
Group.belongsTo(User, { foreignKey: 'creator', as: 'creator' });

// Post belongsTo Event (optional)
Post.belongsTo(Event, { foreignKey: 'event', as: 'event' });
Post.belongsTo(Product, { foreignKey: 'marketplace', as: 'marketplace' });

// Project belongsTo User (organizer)
Project.belongsTo(User, { foreignKey: 'organizer', as: 'organizer' });

// Donation associations
Project.hasMany(Donation, { foreignKey: 'projectId', as: 'donations' });
Donation.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// ==========================
// APPLY ADAPTER
// ==========================
adaptModel(User);
adaptModel(AuditLog);
adaptModel(Event);
adaptModel(News);
adaptModel(Group);
adaptModel(Post);
adaptModel(Product);
adaptModel(Order);
adaptModel(Comment);
adaptModel(Message);
adaptModel(Conversation);
adaptModel(GalleryItem);
adaptModel(Activity);
adaptModel(ElderStory);
adaptModel(Mentorship);
adaptModel(OralHistory);
adaptModel(Job);
adaptModel(NewsletterSubscriber);
adaptModel(EnvironmentReport);
adaptModel(DirectoryMember);
adaptModel(ContactMessage);
adaptModel(Petition);
adaptModel(Campaign);
adaptModel(Poll);
adaptModel(Report);
adaptModel(Review);
adaptModel(Story);
adaptModel(VolunteerOpportunity);
adaptModel(WarCanoeHouse);
adaptModel(Project);
adaptModel(Donation);

// ==========================
// EXPORTS
// ==========================
module.exports = {
  sequelize,
  User,
  AuditLog,
  Event,
  News,
  Group,
  Post,
  Product,
  Order,
  Comment,
  Message,
  Conversation,
  GalleryItem,
  Activity,
  ElderStory,
  Mentorship,
  OralHistory,
  Job,
  NewsletterSubscriber,
  EnvironmentReport,
  DirectoryMember,
  ContactMessage,
  Petition,
  Campaign,
  Poll,
  Report,
  Review,
  Story,
  VolunteerOpportunity,
  WarCanoeHouse,
  Project,
  Donation
};

const syncDB = async (force = false) => {
  if (force) {
    await sequelize.sync({ force: true });
    console.log('✅ All tables dropped and recreated');
  } else {
    await sequelize.sync();
    console.log('✅ Database tables synchronized');
  }
};
module.exports.syncDB = syncDB;