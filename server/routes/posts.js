const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Post = require('../models/Post');
const Activity = require('../models/Activity');

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({ isPublic: true })
      .populate('author', 'fullName avatar bio')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id })
      .populate('author', 'fullName avatar bio')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId, isPublic: true })
      .populate('author', 'fullName avatar bio')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const post = await Post.create({
      author: req.user.id,
      content: req.body.content,
      imageUrl: req.body.imageUrl,
      isPublic: req.body.isPublic !== false
    });
    
    await Activity.create({
      user: req.user.id,
      type: 'post',
      targetId: post._id,
      targetType: 'post',
      description: 'created a new post'
    });
    
    const populated = await Post.findById(post._id).populate('author', 'fullName avatar bio');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    post.content = req.body.content || post.content;
    post.imageUrl = req.body.imageUrl || post.imageUrl;
    post.isPublic = req.body.isPublic !== undefined ? req.body.isPublic : post.isPublic;
    await post.save();
    
    res.json(post);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const likeIndex = post.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likes.push(req.user.id);
      post.likeCount += 1;
      
      if (post.author.toString() !== req.user.id) {
        await Activity.create({
          user: req.user.id,
          type: 'like',
          targetId: post._id,
          targetType: 'post',
          description: 'liked your post'
        });
      }
    }
    await post.save();
    
    res.json({ liked: likeIndex === -1, likeCount: post.likeCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;