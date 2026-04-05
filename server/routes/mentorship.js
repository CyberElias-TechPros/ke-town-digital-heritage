const router = require('express').Router();
const Mentorship = require('../models/Mentorship');
const { authenticate } = require('../middleware/auth');

// Register as mentor
router.post('/register', authenticate, async (req, res) => {
  try {
    const { skills, bio, expertise, experience, availability } = req.body;

    const existing = await Mentorship.findOne({ mentorId: req.user._id });
    if (existing) {
      return res.status(400).json({ error: 'You are already registered as a mentor.' });
    }

    const mentorship = await Mentorship.create({
      mentorId: req.user._id,
      skills: skills || [],
      bio,
      expertise: expertise || [],
      experience,
      availability
    });

    res.status(201).json({
      message: 'Registered as mentor successfully',
      mentorship
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available mentors
router.get('/mentors', async (req, res) => {
  try {
    const { skill, limit = 20, page = 1 } = req.query;
    const filter = { status: 'available' };
    
    if (skill) {
      filter.skills = { $in: [new RegExp(skill, 'i')] };
    }

    const mentors = await Mentorship.find(filter)
      .populate('mentorId', 'fullName bio avatar location')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Mentorship.countDocuments(filter);

    res.json({
      mentors,
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

// Get all mentees seeking mentors
router.get('/mentees', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const mentees = await Mentorship.find({ status: 'available' })
      .populate('menteeId', 'fullName bio avatar location')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Mentorship.countDocuments({ status: 'available' });

    res.json({
      mentees,
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

// Request mentorship
router.post('/request', authenticate, async (req, res) => {
  try {
    const { mentorId, note } = req.body;

    const mentorship = await Mentorship.findOne({
      _id: mentorId,
      status: 'available'
    }).populate('mentorId', 'fullName');

    if (!mentorship) {
      return res.status(404).json({ error: 'Mentor not found or unavailable.' });
    }

    // Create a new mentorship record for the mentee
    const newMentorship = await Mentorship.create({
      mentorId: req.user._id,
      menteeId: mentorship.mentorId._id,
      status: 'matched',
      skills: mentorship.skills,
      matchedAt: new Date()
    });

    res.status(201).json({
      message: 'Mentorship request sent',
      mentorship: newMentorship
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my mentorship status
router.get('/my', authenticate, async (req, res) => {
  try {
    const myMentorship = await Mentorship.find({
      $or: [
        { mentorId: req.user._id },
        { menteeId: req.user._id }
      ]
    })
    .populate('mentorId', 'fullName email avatar')
    .populate('menteeId', 'fullName email avatar')
    .sort({ updatedAt: -1 });

    res.json(myMentorship);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update mentorship (availability, notes)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status, note, skills, bio, expertise, experience, availability } = req.body;

    const mentorship = await Mentorship.findOne({
      _id: req.params.id,
      $or: [
        { mentorId: req.user._id },
        { menteeId: req.user._id }
      ]
    });

    if (!mentorship) {
      return res.status(404).json({ error: 'Mentorship not found.' });
    }

    if (status) {
      mentorship.status = status;
      if (status === 'completed') {
        mentorship.completedAt = new Date();
      }
    }

    if (note) {
      mentorship.notes.push({ text: note });
    }

    if (skills) mentorship.skills = skills;
    if (bio) mentorship.bio = bio;
    if (expertise) mentorship.expertise = expertise;
    if (experience) mentorship.experience = experience;
    if (availability) mentorship.availability = availability;

    await mentorship.save();

    res.json({
      message: 'Mentorship updated',
      mentorship
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all mentorships
router.get('/admin/all', authenticate, require('../middleware/auth').requireAdmin, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const mentorships = await Mentorship.find(filter)
      .populate('mentorId', 'fullName email')
      .populate('menteeId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Mentorship.countDocuments(filter);

    res.json({
      mentorships,
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

module.exports = router;