const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Petition = require('../models/Petition');
const Activity = require('../models/Activity');

// Get petitions
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status = 'active' } = req.query;
    const skip = (page - 1) * limit;
    const filter = { status };
    
    if (category) filter.category = category;
    
    const petitions = await Petition.find(filter)
      .populate('creator', 'fullName avatar')
      .sort({ isFeatured: -1, signatureCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Petition.countDocuments(filter);
    res.json({ petitions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get petition by ID
router.get('/:id', async (req, res) => {
  try {
    const petition = await Petition.findById(req.params.id)
      .populate('creator', 'fullName avatar');
    
    if (!petition) return res.status(404).json({ error: 'Petition not found' });
    res.json(petition);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create petition
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, targetSignatures, image, deadline } = req.body;
    
    const petition = await Petition.create({
      creator: req.user.id,
      title,
      description,
      category: category || 'community',
      targetSignatures: targetSignatures || 100,
      image,
      deadline,
      status: 'active'
    });
    
    await Activity.create({
      user: req.user.id,
      type: 'petition',
      targetId: petition._id,
      targetType: 'petition',
      description: `created petition "${title}"`
    });
    
    const populated = await Petition.findById(petition._id)
      .populate('creator', 'fullName avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sign petition
router.post('/:id/sign', authenticate, async (req, res) => {
  try {
    const { isAnonymous } = req.body;
    const petition = await Petition.findById(req.params.id);
    
    if (!petition) return res.status(404).json({ error: 'Petition not found' });
    if (petition.status !== 'active') return res.status(400).json({ error: 'Petition not active' });
    
    // Check if already signed
    const alreadySigned = petition.signatures.some(
      s => s.user.toString() === req.user.id
    );
    if (alreadySigned) return res.status(400).json({ error: 'Already signed' });
    
    petition.signatures.push({
      user: req.user.id,
      isAnonymous: isAnonymous || false
    });
    petition.signatureCount += 1;
    
    if (petition.signatureCount >= petition.targetSignatures) {
      petition.status = 'achieved';
    }
    
    await petition.save();
    res.json(petition);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get featured petitions
router.get('/featured', async (req, res) => {
  try {
    const petitions = await Petition.find({ isFeatured: true, status: 'active' })
      .populate('creator', 'fullName avatar')
      .limit(5);
    res.json(petitions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my petitions
router.get('/my', authenticate, async (req, res) => {
  try {
    const petitions = await Petition.find({ creator: req.user.id })
      .sort({ createdAt: -1 });
    res.json(petitions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: respond to petition
router.post('/:id/respond', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { message } = req.body;
    const petition = await Petition.findById(req.params.id);
    
    if (!petition) return res.status(404).json({ error: 'Petition not found' });
    
    petition.response = {
      message,
      respondedBy: req.user.id,
      respondedAt: new Date()
    };
    
    await petition.save();
    res.json(petition);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;