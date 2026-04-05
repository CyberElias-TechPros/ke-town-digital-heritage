const router = require('express').Router();
const Job = require('../models/Job');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all active jobs (public)
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      category, 
      location, 
      search, 
      limit = 20, 
      page = 1 
    } = req.query;
    
    const filter = { status: 'active' };
    
    // Check if expired
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null }
    ];
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (location) filter.location = new RegExp(location, 'i');
    if (search) {
      filter.$text = { $search: search };
    }

    const jobs = await Job.find(filter)
      .populate('postedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('postedBy', 'fullName email');

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a new job (auth required)
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      company,
      description,
      location,
      type,
      category,
      salary,
      requirements,
      responsibilities,
      applyUrl,
      applyEmail,
      expiresAt
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const job = await Job.create({
      title,
      company,
      description,
      location,
      type,
      category,
      salary,
      requirements: requirements || [],
      responsibilities: responsibilities || [],
      applyUrl,
      applyEmail,
      postedBy: req.user._id,
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
      message: 'Job posted successfully',
      job
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update job
router.put('/:id', authenticate, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      postedBy: req.user._id
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found or unauthorized.' });
    }

    const updates = req.body;
    delete updates.postedBy;
    delete updates.views;
    delete updates.createdAt;

    Object.assign(job, updates);
    await job.save();

    res.json({
      message: 'Job updated',
      job
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      $or: [
        { postedBy: req.user._id },
        { postedBy: req.user._id }
      ]
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found or unauthorized.' });
    }

    await job.deleteOne();

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close job (mark as closed)
router.put('/:id/close', authenticate, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      postedBy: req.user._id
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found or unauthorized.' });
    }

    job.status = 'closed';
    await job.save();

    res.json({
      message: 'Job closed',
      job
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all jobs
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const jobs = await Job.find(filter)
      .populate('postedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete any job
router.delete('/admin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    res.json({ message: 'Job deleted by admin' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;