const router = require('express').Router();
const OralHistory = require('../models/OralHistory');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all oral histories (public)
router.get('/', async (req, res) => {
  try {
    const { category, language, search, limit = 20, page = 1 } = req.query;
    const filter = { approved: true };
    
    if (category) filter.category = category;
    if (language) filter.language = language;
    if (search) {
      filter.$text = { $search: search };
    }

    const histories = await OralHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await OralHistory.countDocuments(filter);

    res.json({
      histories,
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

// Get single oral history
router.get('/:id', async (req, res) => {
  try {
    const history = await OralHistory.findById(req.params.id);

    if (!history) {
      return res.status(404).json({ error: 'Oral history not found.' });
    }

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create oral history (admin or authenticated)
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      narrator,
      category,
      language,
      audioUrl,
      videoUrl,
      transcript,
      duration,
      tags
    } = req.body;

    if (!title || !description || !narrator) {
      return res.status(400).json({ error: 'Title, description, and narrator are required.' });
    }

    const history = await OralHistory.create({
      title,
      description,
      narrator,
      category,
      language,
      audioUrl,
      videoUrl,
      transcript,
      duration,
      tags: tags || [],
      recordedBy: req.user._id
    });

    res.status(201).json({
      message: 'Oral history created',
      history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update oral history
router.put('/:id', authenticate, async (req, res) => {
  try {
    const history = await OralHistory.findOne({
      _id: req.params.id,
      $or: [
        { recordedBy: req.user._id },
        { recordedBy: null }
      ]
    });

    if (!history) {
      return res.status(404).json({ error: 'Oral history not found.' });
    }

    const updates = req.body;
    delete updates.recordedBy;
    delete updates.approved;
    delete updates.createdAt;

    Object.assign(history, updates);
    await history.save();

    res.json({
      message: 'Oral history updated',
      history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete oral history
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const history = await OralHistory.findOne({
      _id: req.params.id,
      $or: [
        { recordedBy: req.user._id },
        { recordedBy: null }
      ]
    });

    if (!history) {
      return res.status(404).json({ error: 'Oral history not found.' });
    }

    await history.deleteOne();

    res.json({ message: 'Oral history deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all (including unapproved)
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { approved, category, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (approved !== undefined) filter.approved = approved === 'true';
    if (category) filter.category = category;

    const histories = await OralHistory.find(filter)
      .populate('recordedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await OralHistory.countDocuments(filter);

    res.json({
      histories,
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

// Admin: Approve oral history
router.put('/admin/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const history = await OralHistory.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );

    if (!history) {
      return res.status(404).json({ error: 'Oral history not found.' });
    }

    res.json({
      message: 'Oral history approved',
      history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;