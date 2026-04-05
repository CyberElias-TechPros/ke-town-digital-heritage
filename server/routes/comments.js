const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const GalleryItem = require('../models/GalleryItem');
const Activity = require('../models/Activity');

router.get('/:targetType/:targetId', async (req, res) => {
  try {
    const comments = await Comment.find({
      targetType: req.params.targetType,
      targetId: req.params.targetId
    })
      .populate('user', 'fullName avatar')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const comment = await Comment.create({
      user: req.user.id,
      content: req.body.content,
      targetType: req.body.targetType,
      targetId: req.body.targetId
    });
    
    let targetModel = req.body.targetType === 'post' ? Post : GalleryItem;
    await targetModel.findByIdAndUpdate(req.body.targetId, { $inc: { commentCount: 1 } });
    
    const targetDoc = await targetModel.findById(req.body.targetId);
    if (targetDoc.author && targetDoc.author.toString() !== req.user.id) {
      await Activity.create({
        user: req.user.id,
        type: 'comment',
        targetId: targetDoc._id,
        targetType: req.body.targetType,
        description: 'commented on your ' + req.body.targetType
      });
    }
    
    const populated = await Comment.findById(comment._id).populate('user', 'fullName avatar');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;