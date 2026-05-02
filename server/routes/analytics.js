const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const User = require('../models/User');
const Post = require('../models/Post');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Event = require('../models/Event');
const Campaign = require('../models/Campaign');
const Petition = require('../models/Petition');
const Group = require('../models/Group');

// All routes require admin
router.use(authenticate);
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers,
      totalPosts,
      newPosts,
      totalProducts,
      newProducts,
      totalOrders,
      activeEvents,
      activeCampaigns,
      activePetitions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Post.countDocuments(),
      Post.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Product.countDocuments(),
      Product.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Order.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      Campaign.countDocuments({ status: 'active' }),
      Petition.countDocuments({ status: 'active' })
    ]);

    const revenue = await Order.sum('total', {
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo },
        status: { [Op.in]: ['delivered', 'completed'] }
      }
    }) || 0;

    res.json({
      users: { total: totalUsers, new: newUsers },
      posts: { total: totalPosts, new: newPosts },
      products: { total: totalProducts, new: newProducts },
      orders: {
        total: totalOrders,
        revenue
      },
      activeEvents,
      activeCampaigns,
      activePetitions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User stats
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, verified } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (verified !== undefined) filter.verified = verified === 'true';
    
    const users = await User.find(filter)
      .select('fullName email role verified isSeller createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revenue stats
router.get('/revenue', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(0);
    }

    const [rows] = await Order.sequelize.query(
      `SELECT DATE(createdAt) as date, SUM(total) as amount, COUNT(*) as count
       FROM orders
       WHERE createdAt >= ? AND status IN ('delivered', 'completed')
       GROUP BY DATE(createdAt)
       ORDER BY date ASC`,
      {
        replacements: [startDate],
        type: QueryTypes.SELECT
      }
    );

    const total = rows.reduce((sum, day) => sum + (day.amount || 0), 0);
    res.json({ revenue: rows, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export data (GDPR)
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let data;
    
    switch (type) {
      case 'users':
        data = await User.find().select('-password').lean();
        break;
      case 'posts':
        data = await Post.find().lean();
        break;
      case 'orders':
        data = await Order.find().lean();
        break;
      case 'products':
        data = await Product.find().lean();
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    // In production, generate proper CSV/JSON file
    res.json({
      success: true,
      type,
      count: data.length,
      data: data.slice(0, 100), // Preview first 100
      message: 'Full export available in production'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Featured/boost content
router.post('/feature/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { featured } = req.body;
    
    let model;
    switch (type) {
      case 'event':
        model = Event;
        break;
      case 'campaign':
        model = Campaign;
        break;
      case 'petition':
        model = Petition;
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }
    
    const item = await model.findById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    item.isFeatured = featured !== false;
    await item.save();
    
    res.json({ success: true, isFeatured: item.isFeatured });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;