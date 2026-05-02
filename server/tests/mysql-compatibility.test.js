# MySQL Compatibility Test Suite
# Run with: node test-mysql.js
#
# This script validates that the Sequelize adapter correctly handles:
# - Basic CRUD operations
# - MongoDB-style operators ($push, $inc, $set)
# - Nested populate (cart.product, notifications.from)
# - Simple array populates (conversation.participants)
# - Query methods (find, findById, countDocuments, lean)
# - Virtual fields (name, artisan, stock, isActive, totalAmount)
# - Associations (belongsTo, hasMany)
# - Custom static methods (Review.getAverageRating)
# - Raw SQL aggregations (donations monthly stats)
# ================================================

const { Sequelize, DataTypes, Op, fn, col, literal, QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Use same config as app
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_CHARSET = 'utf8mb4'
} = process.env;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
  console.error('❌ MySQL credentials not fully configured in .env');
  process.exit(1);
}

// Create direct sequelize connection for testing
const sequelize = new Sequelize(MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, {
  host: MYSQL_HOST,
  port: parseInt(MYSQL_PORT) || 3306,
  dialect: 'mysql',
  charset: MYSQL_CHARSET,
  logging: false
});

// Test results tracker
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  return async () => {
    try {
      await fn();
      passed++;
      results.push({ name, status: '✅ PASS' });
      console.log(`✅ ${name}`);
    } catch (err) {
      failed++;
      results.push({ name, status: '❌ FAIL', error: err.message });
      console.log(`❌ ${name}: ${err.message}`);
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
  console.log('\n========================================');
  console.log('MySQL Compatibility Test Suite');
  console.log('========================================\n');

  // Connect
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL\n');
  } catch (err) {
    console.error('❌ Failed to connect:', err.message);
    process.exit(1);
  }

  // ============================================
  // MODEL DEFINITIONS (minimal for testing)
  // ============================================

  const User = sequelize.define('TestUser', {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    fullName: { type: DataTypes.STRING(100) },
    email: { type: DataTypes.STRING(100), unique: true },
    password: { type: DataTypes.STRING(255) },
    cart: { type: DataTypes.JSON, defaultValue: [] },
    notifications: { type: DataTypes.JSON, defaultValue: [] },
    isSeller: { type: DataTypes.BOOLEAN, defaultValue: false },
    shopName: { type: DataTypes.STRING(100) }
  }, { tableName: 'test_users', timestamps: true });

  const Product = sequelize.define('TestProduct', {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    seller: { type: DataTypes.STRING(36) },
    title: { type: DataTypes.STRING(80) },
    name: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('title'); } },
    artisan: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('seller'); } },
    price: { type: DataTypes.DECIMAL(10,2) },
    status: { type: DataTypes.ENUM('active','sold','archived'), defaultValue: 'active' },
    isActive: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('status') === 'active'; } }
  }, { tableName: 'test_products', timestamps: true });

  const Order = sequelize.define('TestOrder', {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    buyer: { type: DataTypes.STRING(36) },
    seller: { type: DataTypes.STRING(36) },
    items: { type: DataTypes.JSON, defaultValue: [] },
    total: { type: DataTypes.DECIMAL(10,2) },
    totalAmount: { type: DataTypes.VIRTUAL, get() { return this.getDataValue('total'); } }
  }, { tableName: 'test_orders', timestamps: true });

  const Conversation = sequelize.define('TestConversation', {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    participants: { type: DataTypes.JSON, defaultValue: [] }
  }, { tableName: 'test_conversations', timestamps: true });

  const Project = sequelize.define('TestProject', {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: { type: DataTypes.STRING(200) },
    updates: { type: DataTypes.JSON, defaultValue: [] },
    raisedAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 }
  }, { tableName: 'test_projects', timestsamps: true });

  const Review = sequelize.define('TestReview', {
    id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    product: { type: DataTypes.STRING(36) },
    buyer: { type: DataTypes.STRING(36) },
    rating: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } }
  }, { tableName: 'test_reviews', timestamps: true });

  // Associations
  User.hasMany(Product, { foreignKey: 'seller', as: 'products' });
  Product.belongsTo(User, { foreignKey: 'seller', as: 'seller' });

  User.hasMany(Order, { foreignKey: 'buyer', as: 'orders' });
  Order.belongsTo(User, { foreignKey: 'buyer', as: 'buyer' });
  Order.belongsTo(User, { foreignKey: 'seller', as: 'seller' });

  User.hasMany(Project, { foreignKey: 'organizer', as: 'projects' });
  Project.belongsTo(User, { foreignKey: 'organizer', as: 'organizer' });

  Review.belongsTo(Product, { foreignKey: 'product', as: 'product' });
  Review.belongsTo(User, { foreignKey: 'buyer', as: 'buyer' });

  // Sync and clean
  await sequelize.sync({ force: true });
  console.log('✅ Test tables created\n');

  // Hash password
  const hashedPassword = await bcrypt.hash('testpass123', 12);

  // ============================================
  // TEST 1: User Creation & toJSON
  // ============================================
  await test('User.create() and toJSON()', async () => {
    const user = await User.create({
      fullName: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      isSeller: true,
      shopName: 'Test Shop'
    });
    assert(user.id, 'User should have UUID id');
    assert(user.fullName === 'Test User');
    const json = user.toJSON();
    assert(!json.password, 'Password should be hidden in JSON');
    assert(json.shopName === 'Test Shop');
  })();

  // ============================================
  // TEST 2: Product virtual fields (name, artisan, isActive)
  // ============================================
  await test('Product virtual fields (name, artisan, isActive)', async () => {
    const product = await Product.create({
      seller: 'some-uuid',
      title: 'Test Product',
      price: 1000,
      status: 'active'
    });
    assert(product.name === 'Test Product', 'Virtual name should equal title');
    assert(product.artisan === 'some-uuid', 'Virtual artisan should equal seller');
    assert(product.isActive === true, 'isActive should be true when status is active');
    const json = product.toJSON();
    assert(json.name === 'Test Product');
    assert(json.artisan === 'some-uuid');
    assert(json.isActive === true);
  })();

  // ============================================
  // TEST 3: $push on JSON array (cart)
  // ============================================
  await test('$push for JSON array mutation (user.cart)', async () => {
    const user = await User.create({
      fullName: 'Cart User',
      email: 'cart@example.com',
      password: hashedPassword,
      cart: []
    });

    const product = await Product.create({
      seller: user.id,
      title: 'Cart Product',
      price: 500,
      status: 'active'
    });

    // Simulate: User.findByIdAndUpdate(userId, { $push: { cart: { product: product.id, quantity: 2 } } })
    await User.findByIdAndUpdate(user.id, {
      $push: { cart: { product: product.id, quantity: 2 } }
    }, { new: true });

    const updated = await User.findById(user.id);
    assert(Array.isArray(updated.cart), 'cart should be array');
    assert(updated.cart.length === 1, 'cart should have 1 item');
    assert(updated.cart[0].product === product.id);
    assert(updated.cart[0].quantity === 2);

    // Add another
    await User.findByIdAndUpdate(user.id, {
      $push: { cart: { product: product.id, quantity: 1 } }
    });
    const final = await User.findById(user.id);
    assert(final.cart.length === 2);
  })();

  // ============================================
  // TEST 4: $inc for numeric fields
  // ============================================
  await test('$inc for numeric increment (product.views)', async () => {
    const product = await Product.create({
      seller: 'some-uuid',
      title: 'View Product',
      price: 100,
      status: 'active',
      views: 0
    });

    await Product.findByIdAndUpdate(product.id, { $inc: { views: 5 } });
    const updated = await Product.findById(product.id);
    assert(updated.views === 5, `Expected views=5, got ${updated.views}`);

    await Product.findByIdAndUpdate(product.id, { $inc: { views: 3 } });
    const again = await Product.findById(product.id);
    assert(again.views === 8);
  })();

  // ============================================
  // TEST 5: $set for direct field update
  // ============================================
  await test('$set for field update (user.shopName)', async () => {
    const user = await User.create({
      fullName: 'Shop User',
      email: 'shop@example.com',
      password: hashedPassword,
      shopName: 'Old Shop'
    });

    await User.findByIdAndUpdate(user.id, { $set: { shopName: 'New Shop' } });
    const updated = await User.findById(user.id);
    assert(updated.shopName === 'New Shop');
  })();

  // ============================================
  // TEST 6: Complex update with $set + $inc
  // ============================================
  await test('Combined $set + $inc (product)', async () => {
    const product = await Product.create({
      seller: 'some-uuid',
      title: 'Combo Product',
      price: 100,
      status: 'active',
      views: 0
    });

    await Product.findByIdAndUpdate(product.id, {
      $set: { title: 'Updated Title' },
      $inc: { views: 10 }
    });

    const updated = await Product.findById(product.id);
    assert(updated.title === 'Updated Title');
    assert(updated.views === 10);
  })();

  // ============================================
  // TEST 7: Order totalAmount virtual
  // ============================================
  await test('Order.totalAmount virtual alias', async () => {
    const order = await Order.create({
      buyer: 'buyer-uuid',
      seller: 'seller-uuid',
      items: [],
      total: 2500
    });

    assert(order.total === 2500);
    assert(order.totalAmount === 2500, 'totalAmount virtual should equal total');
    const json = order.toJSON();
    assert(json.totalAmount === 2500);
  })();

  // ============================================
  // TEST 8: Order.seller field existence
  // ============================================
  await test('Order has top-level seller field', async () => {
    const order = await Order.create({
      buyer: 'buyer-uuid',
      seller: 'seller-uuid',
      items: [],
      total: 100
    });

    assert(order.seller === 'seller-uuid');
    // Should be able to populate
    // (association defined above)
  })();

  // ============================================
  // TEST 9: countDocuments()
  // ============================================
  await test('countDocuments() with filter', async () => {
    await User.create({ fullName: 'A', email: 'a@test.com', password: hashedPassword });
    await User.create({ fullName: 'B', email: 'b@test.com', password: hashedPassword });
    await User.create({ fullName: 'C', email: 'c@test.com', password: hashedPassword });

    const total = await User.countDocuments();
    assert(total === 3);

    const withFilter = await User.countDocuments({ fullName: 'A' });
    assert(withFilter === 1);
  })();

  // ============================================
  // TEST 10: find().sort().skip().limit()
  // ============================================
  await test('Query chaining (sort, skip, limit)', async () => {
    for (let i = 5; i >= 1; i--) {
      await User.create({
        fullName: `User ${i}`,
        email: `user${i}@test.com`,
        password: hashedPassword
      });
    }

    const page1 = await User.find({})
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(3);

    assert(page1.length === 3);
    assert(page1[0].fullName === 'User 5'); // latest first (created sequentially)

    const page2 = await User.find({})
      .sort({ createdAt: -1 })
      .skip(3)
      .limit(3);

    assert(page2.length === 3);
    assert(page2[0].fullName === 'User 2');
  })();

  // ============================================
  // TEST 11: findById()
  // ============================================
  await test('findById()', async () => {
    const created = await User.create({
      fullName: 'FindMe',
      email: 'findme@test.com',
      password: hashedPassword
    });

    const found = await User.findById(created.id);
    assert(found);
    assert(found.fullName === 'FindMe');
  })();

  // ============================================
  // TEST 12: Populate simple belongsTo
  // ============================================
  await test('Populate belongsTo (product.seller)', async () => {
    const seller = await User.create({
      fullName: 'Seller User',
      email: 'seller@test.com',
      password: hashedPassword,
      isSeller: true,
      shopName: 'Seller Shop'
    });

    const product = await Product.create({
      seller: seller.id,
      title: 'Seller Product',
      price: 2000
    });

    const found = await Product.findById(product.id)
      .populate('seller', 'fullName shopName');

    assert(found !== null);
    assert(found.seller !== null);
    // In our adapter, populate returns plain objects by default
    const sellerData = typeof found.seller === 'object' ? found.seller : null;
    assert(sellerData, 'Populated seller should be object');
  })();

  // ============================================
  // TEST 13: Nested populate cart.product
  // ============================================
  await test('Nested populate (cart.product)', async () => {
    const user = await User.create({
      fullName: 'Cart Buyer',
      email: 'cartbuyer@test.com',
      password: hashedPassword,
      cart: []
    });

    const product = await Product.create({
      seller: user.id,
      title: 'Cart Item Product',
      price: 300,
      status: 'active'
    });

    // Push to cart via $push
    await User.findByIdAndUpdate(user.id, {
      $push: { cart: { product: product.id, quantity: 2 } }
    });

    // Populate cart.product
    const populated = await User.findById(user.id)
      .populate('cart.product', 'title price')
      .lean();

    assert(populated.cart.length === 1);
    assert(populated.cart[0].product);
    // After populate, cart.product should be replaced with product object (or plain data)
    const prodData = typeof populated.cart[0].product === 'object' ? populated.cart[0].product : null;
    assert(prodData, 'Populated cart.product should be object');
    if (prodData) {
      assert(prodData.title === 'Cart Item Product' || prodData.title === 'Cart Item Product');
    }
  })();

  // ============================================
  // TEST 14: Simple array populate (conversation.participants)
  // ============================================
  await test('Simple array populate (conversation.participants)', async () => {
    const user1 = await User.create({
      fullName: 'Conv User 1',
      email: 'conv1@test.com',
      password: hashedPassword
    });
    const user2 = await User.create({
      fullName: 'Conv User 2',
      email: 'conv2@test.com',
      password: hashedPassword
    });

    const conv = await Conversation.create({
      participants: [user1.id, user2.id]
    });

    const found = await Conversation.findById(conv.id)
      .populate('participants', 'fullName')
      .lean();

    assert(found.participants.length === 2);
    assert(typeof found.participants[0] === 'object');
    assert(found.participants[0].fullName === 'Conv User 1' || found.participants[0].fullName === 'Conv User 2');
  })();

  // ============================================
  // TEST 15: Project $push updates JSON array
  // ============================================
  await test('$push to Project.updates JSON array', async () => {
    const org = await User.create({
      fullName: 'Project Org',
      email: 'org@test.com',
      password: hashedPassword
    });

    const project = await Project.create({
      title: 'Test Project',
      updates: []
    });

    await Project.findByIdAndUpdate(project.id, {
      $push: { updates: { text: 'First update', date: new Date() } }
    });

    const updated = await Project.findById(project.id);
    assert(Array.isArray(updated.updates));
    assert(updated.updates.length === 1);
    assert(updated.updates[0].text === 'First update');
  })();

  // ============================================
  // TEST 16: Review.getAverageRating static method
  // ============================================
  await test('Review.getAverageRating()', async () => {
    const prod = await Product.create({
      seller: 'some-uuid',
      title: 'Rating Product',
      price: 50,
      status: 'active'
    });

    await Review.create({ product: prod.id, buyer: 'buyer1', rating: 5 });
    await Review.create({ product: prod.id, buyer: 'buyer2', rating: 3 });
    await Review.create({ product: prod.id, buyer: 'buyer3', rating: 4 });

    const stats = await Review.getAverageRating(prod.id);
    assert(stats.count === 3);
    // (5+3+4)/3 = 4.0
    assert(parseFloat(stats.avgRating) === 4.0);
  })();

  // ============================================
  // TEST 17: Raw query for monthly donations (SQL pattern)
  // ============================================
  await test('Raw SQL monthly aggregation (donations pattern)', async () => {
    // Simulate donations table query
    const [rows] = await sequelize.query(
      `SELECT YEAR(createdAt) AS year, MONTH(createdAt) AS month, COUNT(*) as count, SUM(total) as amount
       FROM test_orders
       WHERE status IN ('delivered', 'completed')
       GROUP BY year, month
       ORDER BY year DESC, month DESC
       LIMIT 12`,
      { type: QueryTypes.SELECT }
    );
    // Should return array (even if empty)
    assert(Array.isArray(rows));
  })();

  // ============================================
  // TEST 18: lean() returns plain objects
  // ============================================
  await test('lean() returns plain JavaScript objects', async () => {
    await User.create({
      fullName: 'Lean User',
      email: 'lean@test.com',
      password: hashedPassword
    });

    const doc = await User.find({ fullName: 'Lean User' }).lean();
    assert(Array.isArray(doc));
    assert(typeof doc[0] === 'object');
    assert(!doc[0]._previousDataValues, 'lean object should not have Sequelize internals');
  })();

  // ============================================
  // TEST 19: deleteMany / remove many
  // ============================================
  await test('deleteMany() removes multiple documents', async () => {
    await User.create({ fullName: 'Del1', email: 'del1@test.com', password: hashedPassword });
    await User.create({ fullName: 'Del2', email: 'del2@test.com', password: hashedPassword });
    await User.create({ fullName: 'Del3', email: 'del3@test.com', password: hashedPassword });

    const before = await User.countDocuments();
    assert(before === 3);

    await User.deleteMany({ fullName: { [Op.in]: ['Del1', 'Del2'] } });

    const after = await User.countDocuments();
    assert(after === 1);
  })();

  // ============================================
  // TEST 20: insertMany / bulkCreate
  // ============================================
  await test('insertMany() / bulkCreate()', async () => {
    const docs = [
      { fullName: 'Bulk1', email: 'b1@test.com', password: hashedPassword },
      { fullName: 'Bulk2', email: 'b2@test.com', password: hashedPassword },
      { fullName: 'Bulk3', email: 'b3@test.com', password: hashedPassword }
    ];

    const inserted = await User.insertMany(docs);
    assert(inserted.length === 3);
    const count = await User.countDocuments();
    assert(count === 4); // plus any from previous test
  })();

  // Drop test tables
  await sequelize.drop();

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status.includes('FAIL')).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  console.log('========================================\n');

  await sequelize.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
