const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const Activity = require('../models/Activity');

// Get campaigns
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status = 'active' } = req.query;
    const skip = (page - 1) * limit;
    const filter = { status };
    
    if (category) filter.category = category;
    
    const campaigns = await Campaign.find(filter)
      .populate('organizer', 'fullName avatar')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Campaign.countDocuments(filter);
    res.json({ campaigns, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('organizer', 'fullName avatar');
    
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create campaign
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, targetAmount, image, beneficiary, expiresAt } = req.body;
    
    const campaign = await Campaign.create({
      organizer: req.user.id,
      title,
      description,
      category: category || 'other',
      targetAmount,
      image,
      beneficiary,
      expiresAt,
      status: 'active'
    });
    
    await Activity.create({
      user: req.user.id,
      type: 'campaign',
      targetId: campaign._id,
      targetType: 'campaign',
      description: `created fundraiser "${title}"`
    });
    
    const populated = await Campaign.findById(campaign._id)
      .populate('organizer', 'fullName avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Donate to campaign
router.post('/:id/donate', authenticate, async (req, res) => {
  try {
    const { amount, message, isAnonymous } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'active') return res.status(400).json({ error: 'Campaign not active' });
    
    campaign.donors.push({
      user: req.user.id,
      amount,
      message,
      isAnonymous: isAnonymous || false
    });
    campaign.raisedAmount += amount;
    
    if (campaign.raisedAmount >= campaign.targetAmount) {
      campaign.status = 'completed';
    }
    
    await campaign.save();
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Share campaign (increment share count)
router.post('/:id/share', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    
    campaign.shares += 1;
    await campaign.save();
    res.json({ shares: campaign.shares });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get featured campaigns
router.get('/featured', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ isFeatured: true, status: 'active' })
      .populate('organizer', 'fullName avatar')
      .limit(5);
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my campaigns
router.get('/my', authenticate, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ organizer: req.user.id })
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;