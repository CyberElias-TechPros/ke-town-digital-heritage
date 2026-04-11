const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');
const Activity = require('../models/Activity');

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, upcoming } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (upcoming === 'true') {
      filter.date = { $gte: new Date() };
    }
    
    const skip = (page - 1) * limit;
    const events = await Event.find(filter)
      .populate('organizer', 'fullName avatar')
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(filter);
    res.json({ events, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my-rsvps', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const events = await Event.find({ _id: { $in: user.rsvpedEvents || [] } })
      .populate('organizer', 'fullName avatar')
      .sort({ date: 1 });
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, date, endDate, location, isVirtual, virtualLink, maxAttendees, category, coverImage } = req.body;
    
    const event = await Event.create({
      title,
      description,
      date,
      endDate,
      location,
      isVirtual: isVirtual || false,
      virtualLink,
      maxAttendees,
      category: category || 'general',
      coverImage,
      organizer: req.user.id,
      rsvps: []
    });
    
    await Activity.create({
      user: req.user.id,
      type: 'event',
      targetId: event._id,
      targetType: 'event',
      description: `created event "${title}"`
    });
    
    const populated = await Event.findById(event._id)
      .populate('organizer', 'fullName avatar');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'fullName avatar bio');
    
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Populate RSVP users
    if (event.rsvps && event.rsvps.length > 0) {
      const rsvpUsers = await User.find({ _id: { $in: event.rsvps } })
        .select('fullName avatar');
      event.rsvpUsers = rsvpUsers;
    }
    
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { title, description, date, endDate, location, isVirtual, virtualLink, maxAttendees, category, coverImage } = req.body;
    
    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = date;
    if (endDate) event.endDate = endDate;
    if (location) event.location = location;
    if (isVirtual !== undefined) event.isVirtual = isVirtual;
    if (virtualLink) event.virtualLink = virtualLink;
    if (maxAttendees) event.maxAttendees = maxAttendees;
    if (category) event.category = category;
    if (coverImage) event.coverImage = coverImage;
    
    await event.save();
    
    const populated = await Event.findById(event._id)
      .populate('organizer', 'fullName avatar');
    res.json(populated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/rsvp', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    const user = await User.findById(req.user.id);
    user.rsvpedEvents = user.rsvpedEvents || [];
    
    if (user.rsvpedEvents.includes(event._id)) {
      return res.status(400).json({ error: 'Already RSVPed' });
    }
    
    if (event.maxAttendees && event.rsvps.length >= event.maxAttendees) {
      return res.status(400).json({ error: 'Event is full' });
    }
    
    user.rsvpedEvents.push(event._id);
    event.rsvps.push(req.user.id);
    
    await user.save();
    await event.save();
    
    if (event.organizer.toString() !== req.user.id) {
      await Activity.create({
        user: req.user.id,
        type: 'event',
        targetId: event._id,
        targetType: 'event',
        description: `RSVPed to "${event.title}"`
      });
    }
    
    res.json({ success: true, rsvpCount: event.rsvps.length });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id/rsvp', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    const user = await User.findById(req.user.id);
    user.rsvpedEvents = (user.rsvpedEvents || []).filter(id => id.toString() !== event._id.toString());
    event.rsvps = event.rsvps.filter(id => id.toString() !== req.user.id);
    
    await user.save();
    await event.save();
    
    res.json({ success: true, rsvpCount: event.rsvps.length });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;