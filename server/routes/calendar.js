const router = require('express').Router();
const Event = require('../models/Event');

// Static festival data - these are recurring cultural events
const FESTIVALS = [
  {
    id: 'owu-aru-sun',
    title: 'Owu-Aru-Sun Alali',
    description: 'The grand masquerade festival - the most important cultural event in Kalabari. Held after all Ekine masquerades are performed.',
    type: 'festival',
    category: 'masquerade',
    startMonth: 1,
    startDay: 15,
    endDay: 20,
    location: 'Buguma (main), all Kalabari communities',
    significance: 'Highest cultural celebration',
    history: 'Historically held in 1908, 1927, 1973, 1991, 2013 - marks the completion of the Ekine masquerade cycle'
  },
  {
    id: 'kalabari-new-year',
    title: 'Kalabari New Year Festival',
    description: 'Celebration of the new year with traditional dances, canoe races, and community feasts.',
    type: 'festival',
    category: 'celebration',
    startMonth: 1,
    startDay: 1,
    endDay: 7,
    location: 'All Kalabari communities',
    significance: 'Marks the traditional new year'
  },
  {
    id: 'ekine-season',
    title: 'Ekine Masquerade Season',
    description: 'The dry season period when Ekine masquerades are performed across all Kalabari communities.',
    type: 'festival',
    category: 'masquerade',
    startMonth: 11,
    startDay: 1,
    endDay: 28,
    location: 'All Kalabari communities',
    significance: '15-20 year cycle of performances'
  },
  {
    id: 'alagba',
    title: 'Alagba Festival',
    description: 'The first masquerade played before Owu-Aru-Sun - must precede all others in the cycle.',
    type: 'festival',
    category: 'masquerade',
    startMonth: 12,
    startDay: 15,
    endDay: 25,
    location: 'Buguma',
    significance: 'Opening masquerade of the Owu-Aru-Sun cycle'
  },
  {
    id: 'canoe-regatta',
    title: 'Canoe Regatta',
    description: 'Traditional boat races and canoe competitions showcasing maritime heritage.',
    type: 'festival',
    category: 'sports',
    startMonth: 4,
    startDay: 1,
    endDay: 3,
    location: 'New Calabar River',
    significance: 'Celebrates maritime tradition'
  },
  {
    id: 'agiri',
    title: 'Agiri Festival',
    description: 'New year celebration in Degema LGA with traditional activities.',
    type: 'festival',
    category: 'celebration',
    startMonth: 1,
    startDay: 3,
    endDay: 5,
    location: 'Degema',
    significance: 'Local new year celebration'
  },
  {
    id: 'igugule',
    title: 'Igugule Festival',
    description: 'Traditional fishing and farming harvest festival.',
    type: 'festival',
    category: 'harvest',
    startMonth: 5,
    startDay: 10,
    endDay: 15,
    location: 'Degema LGA',
    significance: 'Harvest celebration'
  }
];

// Get calendar events (combines dynamic events + static festivals)
router.get('/', async (req, res) => {
  try {
    const { year, start, end, type, category } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    // Get date range
    const startDate = start ? new Date(start) : new Date(targetYear, 0, 1);
    const endDate = end ? new Date(end) : new Date(targetYear, 11, 31);

    // Get dynamic events from database
    const dbEvents = await Event.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'active'
    }).select('-description');

    // Transform festivals to calendar events
    const festivalEvents = FESTIVALS.map(festival => {
      const startDate = new Date(targetYear, festival.startMonth - 1, festival.startDay);
      const endDate = new Date(targetYear, festival.startMonth - 1, festival.endDay || festival.startDay);
      
      return {
        id: festival.id,
        title: festival.title,
        description: festival.description,
        type: 'festival',
        category: festival.category,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: festival.location,
        allDay: true,
        significance: festival.significance,
        isStatic: true
      };
    });

    // Transform DB events
    const calendarEvents = dbEvents.map(event => ({
      id: event._id,
      title: event.title,
      description: event.description,
      type: 'event',
      category: event.type,
      startDate: event.date.toISOString(),
      endDate: event.endDate?.toISOString() || event.date.toISOString(),
      location: event.location,
      allDay: event.allDay,
      isStatic: false
    }));

    // Combine and filter
    let allEvents = [...festivalEvents, ...calendarEvents];
    
    if (type) {
      allEvents = allEvents.filter(e => e.type === type);
    }
    if (category) {
      allEvents = allEvents.filter(e => e.category === category);
    }

    // Sort by date
    allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({
      year: targetYear,
      total: allEvents.length,
      events: allEvents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all festivals (static cultural events)
router.get('/festivals', async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const festivals = FESTIVALS.map(festival => {
      const startDate = new Date(targetYear, festival.startMonth - 1, festival.startDay);
      const endDate = new Date(targetYear, festival.startMonth - 1, festival.endDay || festival.startDay);
      
      return {
        ...festival,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currentYear: targetYear
      };
    });

    // Sort by date
    festivals.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({
      year: targetYear,
      total: festivals.length,
      festivals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get next upcoming events/festivals
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const now = new Date();
    const targetYear = now.getFullYear();

    // Get upcoming festivals
    const upcomingFestivals = FESTIVALS
      .map(festival => {
        let startDate = new Date(targetYear, festival.startMonth - 1, festival.startDay);
        if (startDate < now) {
          // Move to next year
          startDate = new Date(targetYear + 1, festival.startMonth - 1, festival.startDay);
        }
        return {
          ...festival,
          startDate: startDate.toISOString(),
          type: 'festival'
        };
      })
      .filter(f => new Date(f.startDate) >= now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, parseInt(limit));

    // Get upcoming DB events
    const upcomingDb = await Event.find({
      date: { $gte: now },
      status: 'active'
    })
    .sort({ date: 1 })
    .limit(parseInt(limit))
    .map(event => ({
      id: event._id,
      title: event.title,
      description: event.description,
      type: 'event',
      category: event.type,
      startDate: event.date.toISOString(),
      location: event.location
    }));

    // Combine, deduplicate, and sort
    const combined = [...upcomingFestivals, ...upcomingDb]
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, parseInt(limit));

    res.json({
      upcoming: combined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get best times to visit
router.get('/best-time-to-visit', async (req, res) => {
  try {
    const recommendations = [
      {
        period: 'November - January',
        reason: 'Dry season - Ekine masquerade season, ideal for cultural experiences',
        events: ['Ekine Season', 'Kalabari New Year', 'Alagba'],
        weather: 'Less rainfall, comfortable temperatures',
        rating: 5
      },
      {
        period: 'December',
        reason: 'Owu-Aru-Sun Alali often falls in this period - biggest cultural event',
        events: ['Alagba'],
        weather: 'Dry season',
        rating: 5
      },
      {
        period: 'April - May',
        reason: 'End of dry season, before heavy rains',
        events: ['Canoe Regatta', 'Igugule'],
        weather: 'Transitional, increasing humidity',
        rating: 3
      },
      {
        period: 'June - October',
        reason: 'Heavy rainy season - some activities limited',
        events: [],
        weather: 'Heavy rainfall, high humidity',
        rating: 2
      }
    ];

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get calendar meta (categories, types)
router.get('/meta', async (req, res) => {
  try {
    res.json({
      categories: [
        { id: 'masquerade', label: 'Masquerade' },
        { id: 'celebration', label: 'Celebration' },
        { id: 'harvest', label: 'Harvest' },
        { id: 'sports', label: 'Sports' },
        { id: 'cultural', label: 'Cultural' },
        { id: 'religious', label: 'Religious' },
        { id: 'community', label: 'Community' }
      ],
      types: [
        { id: 'festival', label: 'Festival' },
        { id: 'event', label: 'Event' },
        { id: 'ceremony', label: 'Ceremony' },
        { id: 'meeting', label: 'Meeting' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;