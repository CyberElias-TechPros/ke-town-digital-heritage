const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Poll = require('../models/Poll');
const Activity = require('../models/Activity');

// Get polls feed
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const polls = await Poll.find({ status: 'active' })
      .populate('user', 'fullName avatar verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Poll.countDocuments({ status: 'active' });
    res.json({ polls, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get poll by ID
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('user', 'fullName avatar');
    
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    
    poll.viewCount += 1;
    await poll.save();
    
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote on poll
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);
    
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.status === 'closed') return res.status(400).json({ error: 'Poll closed' });
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      poll.status = 'closed';
      await poll.save();
      return res.status(400).json({ error: 'Poll expired' });
    }
    
    const option = poll.options[optionIndex];
    if (!option) return res.status(400).json({ error: 'Invalid option' });
    
    // Check if already voted
    const alreadyVoted = option.votes.includes(req.user.id);
    if (!poll.isMultiple && alreadyVoted) {
      return res.status(400).json({ error: 'Already voted' });
    }
    
    if (!alreadyVoted) {
      option.votes.push(req.user.id);
      poll.totalVotes += 1;
      
      await Activity.create({
        user: req.user.id,
        type: 'poll',
        targetId: poll._id,
        targetType: 'poll',
        description: 'voted on a poll'
      });
    }
    
    // Close if single vote and expiry
    if (!poll.isMultiple) {
      poll.status = 'closed';
    }
    
    await poll.save();
    res.json(poll);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create poll
router.post('/', authenticate, async (req, res) => {
  try {
    const { question, options, isMultiple, expiresAt } = req.body;
    
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options required' });
    }
    
    const poll = await Poll.create({
      user: req.user.id,
      question,
      options: options.map(text => ({ text, votes: [] })),
      isMultiple: isMultiple || false,
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    const populated = await Poll.findById(poll._id)
      .populate('user', 'fullName avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Close poll
router.post('/:id/close', authenticate, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    poll.status = 'closed';
    await poll.save();
    res.json(poll);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;