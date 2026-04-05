const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ElderStory = require('../models/ElderStory');

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.featured) filter.isFeatured = true;
    
    const stories = await ElderStory.find(filter).sort({ createdAt: -1 });
    res.json(stories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const story = await ElderStory.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const story = await ElderStory.create(req.body);
    res.status(201).json(story);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const story = await ElderStory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const story = await ElderStory.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json({ message: 'Story deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;