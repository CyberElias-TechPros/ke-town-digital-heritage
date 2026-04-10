const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Post = require('../models/Post');
const Activity = require('../models/Activity');
const User = require('../models/User');

// Get community feed (authenticated users only - internal posts)
router.get('/feed', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get posts from: author's posts, following, community visibility
    const following = user.following || [];
    
    const posts = await Post.find({
      $or: [
        { author: req.user.id },
        { author: { $in: following } },
        { visibility: 'community' }
      ]
    })
      .populate('author', 'fullName avatar bio role')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(50);
    
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'fullName avatar bio role');
    
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    // Increment view count
    post.viewCount += 1;
    await post.save();
    
    res.json(post);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get my posts
router.get('/user/my', authenticate, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id })
      .populate('author', 'fullName avatar bio')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get posts by user
router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'fullName avatar bio')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create post (authenticated only - internal community)
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, media, location, feeling, privacy, mentions, hashtags, visibility } = req.body;
    
    // Extract hashtags from content
    const extractedHashtags = (content.match(/#\w+/g) || []).map(t => t.slice(1));
    const allHashtags = [...(hashtags || []), ...extractedHashtags];
    
    const post = await Post.create({
      author: req.user.id,
      content,
      media: media || [],
      location,
      feeling,
      privacy: privacy || 'public',
      mentions: mentions || [],
      hashtags: allHashtags,
      visibility: visibility || 'community',
      isPublic: privacy === 'public'
    });
    
    await Activity.create({
      user: req.user.id,
      type: 'post',
      targetId: post._id,
      targetType: 'post',
      description: 'shared a post'
    });
    
    const populated = await Post.findById(post._id)
      .populate('author', 'fullName avatar bio role');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update post
router.put('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    const { content, media, location, feeling, privacy, visibility } = req.body;
    
    if (content) post.content = content;
    if (media) post.media = media;
    if (location) post.location = location;
    if (feeling) post.feeling = feeling;
    if (privacy) post.privacy = privacy;
    if (visibility) post.visibility = visibility;
    
    await post.save();
    
    const populated = await Post.findById(post._id)
      .populate('author', 'fullName avatar bio');
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete post
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

// React to post
router.post('/:id/reaction', authenticate, async (req, res) => {
  try {
    const { reactionType } = req.body;
    const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'celebrate', 'support'];
    
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    // Remove existing reaction from this user
    post.reactions = post.reactions.filter(r => r.user.toString() !== req.user.id);
    
    // Add new reaction
    post.reactions.push({ user: req.user.id, type: reactionType });
    
    // Create activity if not own post
    if (post.author.toString() !== req.user.id) {
      await Activity.create({
        user: req.user.id,
        type: 'reaction',
        targetId: post._id,
        targetType: 'post',
        description: `reacted ${reactionType} to your post`
      });
    }
    
    await post.save();
    
    const reactionCounts = {};
    post.reactions.forEach(r => {
      reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
    });
    
    res.json({ success: true, reactions: post.reactions, reactionCounts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove reaction
router.delete('/:id/reaction', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    post.reactions = post.reactions.filter(r => r.user.toString() !== req.user.id);
    await post.save();
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add comment
router.post('/:id/comment', authenticate, async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const comment = {
      author: req.user.id,
      content,
      createdAt: new Date()
    };
    
    if (parentCommentId) {
      // Find parent comment and add reply
      const parentComment = post.comments.id(parentCommentId);
      if (parentComment) {
        parentComment.replies.push({
          author: req.user.id,
          content,
          createdAt: new Date()
        });
      }
    } else {
      post.comments.push(comment);
    }
    
    post.commentCount += 1;
    await post.save();
    
    // Create activity notification
    if (post.author.toString() !== req.user.id) {
      await Activity.create({
        user: req.user.id,
        type: 'comment',
        targetId: post._id,
        targetType: 'post',
        description: 'commented on your post'
      });
    }
    
    const populated = await Post.findById(post._id)
      .populate('author', 'fullName avatar bio')
      .populate('comments.author', 'fullName avatar');
    
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Pin/unpin post
router.post('/:id/pin', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    post.isPinned = !post.isPinned;
    await post.save();
    
    res.json({ isPinned: post.isPinned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;