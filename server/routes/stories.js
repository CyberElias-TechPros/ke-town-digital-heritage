const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Story = require('../models/Story');
const User = require('../models/User');

// Get stories feed (from people you follow)
router.get('/feed', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const following = user.following || [];
    
    const stories = await Story.find({
      user: { $in: [...following, req.user.id] },
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .populate('user', 'fullName avatar verified')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stories by user
router.get('/user/:userId', async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.params.userId,
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .populate('user', 'fullName avatar')
      .sort({ createdAt: -1 });
    
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View a story (mark as viewed)
router.post('/:id/view', authenticate, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    
    if (!story.views.includes(req.user.id)) {
      story.views.push(req.user.id);
      await story.save();
    }
    
    res.json({ success: true, viewCount: story.views.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// React to story
router.post('/:id/react', authenticate, async (req, res) => {
  try {
    const { reactionType } = req.body;
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    
    const existingIndex = story.reactions.findIndex(
      r => r.user.toString() === req.user.id
    );
    
    if (existingIndex >= 0) {
      story.reactions[existingIndex].type = reactionType;
    } else {
      story.reactions.push({ user: req.user.id, type: reactionType });
    }
    
    await story.save();
    res.json({ success: true, reactions: story.reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create story
router.post('/', authenticate, async (req, res) => {
  try {
    const { media, mediaType, caption, duration } = req.body;
    
    const story = await Story.create({
      user: req.user.id,
      media,
      mediaType: mediaType || 'image',
      caption,
      duration: duration || 24
    });
    
    const populated = await Story.findById(story._id)
      .populate('user', 'fullName avatar');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete story
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    
    if (story.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    story.isActive = false;
    await story.save();
    res.json({ message: 'Story deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;