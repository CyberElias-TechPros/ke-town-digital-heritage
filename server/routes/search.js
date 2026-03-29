const router = require('express').Router();
const Event = require('../models/Event');
const News = require('../models/News');
const GalleryItem = require('../models/GalleryItem');
const DirectoryMember = require('../models/DirectoryMember');
const EnvironmentReport = require('../models/EnvironmentReport');
const Project = require('../models/Project');

// Global search across all content
router.get('/', async (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const results = [];

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
          excerpt: event.description.substring(0, 150) + '...',
          date: event.date,
          url: `/events/${event._id}`
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
          excerpt: item.description?.substring(0, 150) + '...' || '',
          image: item.imageUrl,
          url: `/gallery/${item._id}`
        });
      });
    }

    // Search Directory
    if (!type || type === 'directory') {
      const members = await DirectoryMember.find({
        approved: true,
        isPublic: true,
        $or: [
          { fullName: searchRegex },
          { city: searchRegex },
          { country: searchRegex },
          { bio: searchRegex }
        ]
      }).select('-email').limit(parseInt(limit));
      
      members.forEach(member => {
        results.push({
          type: 'directory',
          id: member._id,
          title: member.fullName,
          excerpt: `${member.city}, ${member.country}`,
          url: `/diaspora#${member._id}`
        });
      });
    }

    // Search Environment Reports
    if (!type || type === 'environment') {
      const reports = await EnvironmentReport.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex }
        ]
      }).limit(parseInt(limit));
      
      reports.forEach(report => {
        results.push({
          type: 'environment',
          id: report._id,
          title: report.title,
          excerpt: report.description.substring(0, 150) + '...',
          date: report.createdAt,
          url: `/environment#${report._id}`
        });
      });
    }

    // Search Projects
    if (!type || type === 'projects') {
      const projects = await Project.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      }).limit(parseInt(limit));
      
      projects.forEach(project => {
        results.push({
          type: 'project',
          id: project._id,
          title: project.title,
          excerpt: project.description.substring(0, 150) + '...',
          status: project.status,
          url: `/diaspora#projects`
        });
      });
    }

    // Sort by relevance (title matches first)
    results.sort((a, b) => {
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

    // Get title suggestions from various collections
    const [events, news, gallery] = await Promise.all([
      Event.find({ title: searchRegex }).select('title').limit(5),
      News.find({ title: searchRegex, published: true }).select('title').limit(5),
      GalleryItem.find({ title: searchRegex, approved: true }).select('title').limit(5)
    ]);

    events.forEach(e => suggestions.push({ text: e.title, type: 'event' }));
    news.forEach(n => suggestions.push({ text: n.title, type: 'news' }));
    gallery.forEach(g => suggestions.push({ text: g.title, type: 'gallery' }));

    // Remove duplicates and limit
    const uniqueSuggestions = [...new Map(suggestions.map(item => [item.text, item])).values()];
    
    res.json(uniqueSuggestions.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
