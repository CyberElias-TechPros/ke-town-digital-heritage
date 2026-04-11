const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const VolunteerOpportunity = require('../models/VolunteerOpportunity');
const Activity = require('../models/Activity');

// Get opportunities
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status = 'active' } = req.query;
    const skip = (page - 1) * limit;
    const filter = { status };
    
    if (category) filter.category = category;
    
    const opportunities = await VolunteerOpportunity.find(filter)
      .populate('organizer', 'fullName avatar')
      .sort({ isFeatured: -1, startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await VolunteerOpportunity.countDocuments(filter);
    res.json({ opportunities, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get opportunity by ID
router.get('/:id', async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id)
      .populate('organizer', 'fullName avatar');
    
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opportunity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create opportunity
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, location, startDate, endDate, commitment, spotsAvailable, image } = req.body;
    
    const opportunity = await VolunteerOpportunity.create({
      organizer: req.user.id,
      title,
      description,
      category: category || 'community',
      location,
      startDate,
      endDate,
      commitment: commitment || 'one-time',
      spotsAvailable: spotsAvailable || 10,
      image,
      status: 'active'
    });
    
    await Activity.create({
      user: req.user.id,
      type: 'volunteer',
      targetId: opportunity._id,
      targetType: 'volunteer',
      description: `posted volunteer opportunity "${title}"`
    });
    
    const populated = await VolunteerOpportunity.findById(opportunity._id)
      .populate('organizer', 'fullName avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Apply to volunteer
router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const opportunity = await VolunteerOpportunity.findById(req.params.id);
    
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    if (opportunity.status !== 'active') return res.status(400).json({ error: 'Opportunity not active' });
    
    // Check if already applied
    const alreadyApplied = opportunity.volunteers.some(
      v => v.user.toString() === req.user.id
    );
    if (alreadyApplied) return res.status(400).json({ error: 'Already applied' });
    
    if (opportunity.volunteers.length >= opportunity.spotsAvailable) {
      return res.status(400).json({ error: 'No spots available' });
    }
    
    opportunity.volunteers.push({
      user: req.user.id,
      status: 'applied'
    });
    
    await opportunity.save();
    res.json(opportunity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update volunteer status (organizer approves)
router.put('/:id/volunteer/:userId', authenticate, async (req, res) => {
  try {
    const { status, hoursLogged } = req.body;
    const opportunity = await VolunteerOpportunity.findById(req.params.id);
    
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    if (opportunity.organizer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only organizer can update status' });
    }
    
    const volunteer = opportunity.volunteers.find(
      v => v.user.toString() === req.params.userId
    );
    if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
    
    volunteer.status = status || volunteer.status;
    if (hoursLogged) volunteer.hoursLogged = hoursLogged;
    
    await opportunity.save();
    res.json(opportunity);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get my volunteer history
router.get('/my', authenticate, async (req, res) => {
  try {
    const opportunities = await VolunteerOpportunity.find({
      'volunteers.user': req.user.id
    })
      .populate('organizer', 'fullName avatar')
      .sort({ startDate: -1 });
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get featured opportunities
router.get('/featured', async (req, res) => {
  try {
    const opportunities = await VolunteerOpportunity.find({ isFeatured: true, status: 'active' })
      .populate('organizer', 'fullName avatar')
      .limit(5);
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;