const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');
const Event = require('../models/Event');
const Product = require('../models/Product');

// Submit a report
router.post('/', authenticate, async (req, res) => {
  try {
    const { reportedUser, reportedPost, reportedProduct, reportedGroup, reportedEvent, reason, description } = req.body;
    
    if (!reportedUser && !reportedPost && !reportedProduct && !reportedGroup && !reportedEvent) {
      return res.status(400).json({ error: 'Must report at least one item' });
    }
    
    const report = await Report.create({
      reporter: req.user.id,
      reportedUser,
      reportedPost,
      reportedProduct,
      reportedGroup,
      reportedEvent,
      reason,
      description
    });
    
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get my reports
router.get('/my', authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending reports (admin)
router.get('/pending', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const reports = await Report.find({ status: 'pending' })
      .populate('reporter', 'fullName avatar')
      .populate('reportedUser', 'fullName avatar')
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update report status (admin)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { status, actionTaken } = req.body;
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    report.status = status;
    report.actionTaken = actionTaken;
    report.resolvedBy = req.user.id;
    report.resolvedAt = new Date();
    
    await report.save();
    res.json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get reports stats (admin)
router.get('/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const stats = {
      pending: await Report.countDocuments({ status: 'pending' }),
      reviewed: await Report.countDocuments({ status: 'reviewed' }),
      actioned: await Report.countDocuments({ status: 'actioned' }),
      dismissed: await Report.countDocuments({ status: 'dismissed' }),
      byReason: await Report.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } }
      ])
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;