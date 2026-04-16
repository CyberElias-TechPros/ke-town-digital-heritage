const router = require('express').Router();
const { authenticate, requireAdmin, requireUserManager, requireContentManager } = require('../middleware/auth');
const Event = require('../models/Event');
const News = require('../models/News');
const GalleryItem = require('../models/GalleryItem');
const DirectoryMember = require('../models/DirectoryMember');
const ContactMessage = require('../models/ContactMessage');
const EnvironmentReport = require('../models/EnvironmentReport');
const Project = require('../models/Project');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Dashboard statistics
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalEvents,
      totalNews,
      totalGallery,
      totalDirectory,
      totalContacts,
      totalEnvironment,
      totalProjects,
      totalUsers,
      pendingGallery,
      pendingDirectory,
      unreadContacts
    ] = await Promise.all([
      Event.countDocuments(),
      News.countDocuments(),
      GalleryItem.countDocuments(),
      DirectoryMember.countDocuments(),
      ContactMessage.countDocuments(),
      EnvironmentReport.countDocuments(),
      Project.countDocuments(),
      User.countDocuments(),
      GalleryItem.countDocuments({ approved: false }),
      DirectoryMember.countDocuments({ approved: false }),
      ContactMessage.countDocuments({ read: false })
    ]);

    // Recent activity
    const recentEvents = await Event.find().sort({ createdAt: -1 }).limit(5);
    const recentNews = await News.find().sort({ createdAt: -1 }).limit(5);
    const recentContacts = await ContactMessage.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      stats: {
        totalEvents,
        totalNews,
        totalGallery,
        totalDirectory,
        totalContacts,
        totalEnvironment,
        totalProjects,
        totalUsers,
        pendingGallery,
        pendingDirectory,
        unreadContacts
      },
      recentActivity: {
        events: recentEvents,
        news: recentNews,
        contacts: recentContacts
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage Events
router.get('/events', authenticate, requireAdmin, async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage News
router.get('/news', authenticate, requireAdmin, async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage Gallery (with approval)
router.get('/gallery', authenticate, requireAdmin, async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = approved !== undefined ? { approved: approved === 'true' } : {};
    const gallery = await GalleryItem.find(filter).sort({ createdAt: -1 });
    res.json(gallery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve gallery item
router.put('/gallery/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const item = await GalleryItem.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found.' });
    }

    res.json({ message: 'Gallery item approved', item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Manage Directory (with approval)
router.get('/directory', authenticate, requireAdmin, async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = approved !== undefined ? { approved: approved === 'true' } : {};
    const members = await DirectoryMember.find(filter).sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve directory member
router.put('/directory/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const member = await DirectoryMember.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    
    if (!member) {
      return res.status(404).json({ error: 'Directory member not found.' });
    }

    res.json({ message: 'Directory member approved', member });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Manage Contact Messages
router.get('/contacts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { read, type } = req.query;
    const filter = {};
    if (read !== undefined) filter.read = read === 'true';
    if (type) filter.type = type;
    
    const contacts = await ContactMessage.find(filter).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark contact as read
router.put('/contacts/:id/read', authenticate, requireAdmin, async (req, res) => {
  try {
    const contact = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact message not found.' });
    }

    res.json({ message: 'Contact marked as read', contact });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Manage Environment Reports
router.get('/environment', authenticate, requireAdmin, async (req, res) => {
  try {
    const reports = await EnvironmentReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage Projects
router.get('/projects', authenticate, requireAdmin, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project status
router.put('/projects/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ message: 'Project status updated', project });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add project update
router.post('/projects/:id/updates', authenticate, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { updates: { text } } },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ message: 'Update added', project });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (action) filter.action = action;
    
    const skip = (page - 1) * limit;
    const logs = await AuditLog.find(filter)
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await AuditLog.countDocuments(filter);
    
    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system stats (admin only)
router.get('/system-stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      recentRegistrations,
      recentLogins,
      activeSellers
    ] = await Promise.all([
      User.countDocuments({ accountStatus: 'active' }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ accountStatus: 'suspended' }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ isSeller: true, shopVerified: true })
    ]);

    res.json({
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      recentRegistrations,
      recentLogins,
      activeSellers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
