const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Activity = require('../models/Activity');

router.get('/following', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const following = user.following || [];
    
    const activities = await Activity.find({
      user: { $in: following },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
      .populate('user', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(activities);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/global', async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('user', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/follow/:userId', authenticate, async (req, res) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    const user = await User.findById(req.user.id);
    const isFollowing = user.following.includes(req.params.userId);
    
    if (isFollowing) {
      user.following = user.following.filter(id => id.toString() !== req.params.userId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user.id);
      await user.save();
      await targetUser.save();
      res.json({ following: false });
    } else {
      user.following.push(req.params.userId);
      targetUser.followers.push(req.user.id);
      await user.save();
      await targetUser.save();
      
      await Activity.create({
        user: req.user.id,
        type: 'follow',
        targetId: targetUser._id,
        targetType: 'user',
        description: 'started following you'
      });
      
      res.json({ following: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;