const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Event = require('../models/Event');
const News = require('../models/News');
const GalleryItem = require('../models/GalleryItem');
const DirectoryMember = require('../models/DirectoryMember');
const EnvironmentReport = require('../models/EnvironmentReport');
const Project = require('../models/Project');
const User = require('../models/User');
const Group = require('../models/Group');
const Post = require('../models/Post');

// Global search across all content
router.get('/', async (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const results = [];

    // Search Users (authenticated)
    if (!type || type === 'users') {
      const users = await User.find({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex }
        ]
      }).select('fullName avatar bio').limit(parseInt(limit));
      
      users.forEach(user => {
        results.push({
          type: 'user',
          id: user._id,
          title: user.fullName,
          excerpt: user.bio?.substring(0, 100) || '',
          image: user.avatar,
          url: `/profile/${user._id}`
        });
      });
    }

    // Search Groups
    if (!type || type === 'groups') {
      const groups = await Group.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ],
        isActive: true
      }).limit(parseInt(limit));
      
      groups.forEach(group => {
        results.push({
          type: 'group',
          id: group._id,
          title: group.name,
          excerpt: group.description?.substring(0, 100) || '',
          url: `/groups/${group._id}`
        });
      });
    }

    // Search Posts (authenticated)
    if (!type || type === 'posts') {
      const posts = await Post.find({
        $or: [
          { content: searchRegex },
          { hashtags: searchRegex }
        ]
      }).populate('author', 'fullName avatar').limit(parseInt(limit));
      
      posts.forEach(post => {
        results.push({
          type: 'post',
          id: post._id,
          title: post.author?.fullName || 'Anonymous',
          excerpt: post.content.substring(0, 100) + '...',
          image: post.author?.avatar,
          url: `/posts`
        });
      });
    }

    // Search Events
    if (!type || type === 'events') {
      const events = await Event.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex }
        ]
      }).limit(parseInt(limit));
      
      events.forEach(event => {
        results.push({
          type: 'event',
          id: event._id,
          title: event.title,
          excerpt: event.description?.substring(0, 150) || '',
          date: event.date,
          url: `/events`
        });
      });
    }

    // Search News
    if (!type || type === 'news') {
      const news = await News.find({
        published: true,
        $or: [
          { title: searchRegex },
          { excerpt: searchRegex },
          { content: searchRegex }
        ]
      }).limit(parseInt(limit));
      
      news.forEach(item => {
        results.push({
          type: 'news',
          id: item._id,
          title: item.title,
          excerpt: item.excerpt,
          date: item.createdAt,
          url: `/news/${item._id}`
        });
      });
    }

    // Search Gallery
    if (!type || type === 'gallery') {
      const gallery = await GalleryItem.find({
        approved: true,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      }).limit(parseInt(limit));
      
      gallery.forEach(item => {
        results.push({
          type: 'gallery',
          id: item._id,
          title: item.title,
          excerpt: item.description?.substring(0, 150) || '',
          image: item.imageUrl,
          url: `/gallery/${item._id}`
        });
      });
    }

    // Sort by relevance (users/groups first, then title matches)
    results.sort((a, b) => {
      const typeOrder = { user: 0, group: 1, post: 2, event: 3, news: 4, gallery: 5 };
      const aType = typeOrder[a.type as keyof typeof typeOrder] ?? 10;
      const bType = typeOrder[b.type as keyof typeof typeOrder] ?? 10;
      if (aType !== bType) return aType - bType;
      const aTitle = a.title.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
      const bTitle = b.title.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
      return bTitle - aTitle;
    });

    res.json({
      query: q,
      total: results.length,
      results: results.slice(0, parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search suggestions (for autocomplete)
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const suggestions = [];

    // Get suggestions from various collections
    const [events, news, gallery, users, groups] = await Promise.all([
      Event.find({ title: searchRegex }).select('title').limit(3),
      News.find({ title: searchRegex, published: true }).select('title').limit(3),
      GalleryItem.find({ title: searchRegex, approved: true }).select('title').limit(3),
      User.find({ fullName: searchRegex }).select('fullName').limit(3),
      Group.find({ name: searchRegex, isActive: true }).select('name').limit(3)
    ]);

    events.forEach(e => suggestions.push({ text: e.title, type: 'event' }));
    news.forEach(n => suggestions.push({ text: n.title, type: 'news' }));
    gallery.forEach(g => suggestions.push({ text: g.title, type: 'gallery' }));
    users.forEach(u => suggestions.push({ text: u.fullName, type: 'user' }));
    groups.forEach(g => suggestions.push({ text: g.name, type: 'group' }));

    res.json(suggestions.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
