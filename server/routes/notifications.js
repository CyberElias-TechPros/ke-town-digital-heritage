const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('notifications unreadCount')
      .populate('notifications.from', 'fullName avatar');
    res.json(user.notifications);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('unreadCount');
    res.json({ count: user.unreadCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/mark-read', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.notifications.forEach(n => n.read = true);
    user.unreadCount = 0;
    await user.save();
    res.json({ message: 'All notifications marked as read' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const notification = user.notifications.id(req.params.notificationId);
    if (notification) {
      notification.read = true;
      user.unreadCount = Math.max(0, user.unreadCount - 1);
      await user.save();
    }
    res.json(notification);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;