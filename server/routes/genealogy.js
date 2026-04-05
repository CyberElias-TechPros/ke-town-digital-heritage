const router = require('express').Router();
const WarCanoeHouse = require('../models/WarCanoeHouse');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Pre-populate with known Kalabari War Canoe Houses
const DEFAULT_HOUSES = [
  {
    name: 'Kemsaipruye-Igbo',
    kalabariName: 'Kem-sai-pruye-Igbo',
    description: 'One of the historic war canoe house lineages of Ke Kingdom, known for maritime prowess and fishing traditions.',
    foundingStory: 'Founded as one of the original house groups when Ke Kingdom was established as an indigenous Kalabari-speaking community.',
    foundingYear: 'Pre-16th century',
    founder: { name: 'Unknown', title: 'Founding Patriarch' },
    community: 'Ke Kingdom',
    currentLeader: { name: 'TBD', title: 'Head of House' },
    achievements: ['Traditional fishing', 'Maritime trade', 'Festival participation'],
    ceremonies: ['Ekine', 'New Year', 'Owu-Aru-Sun'],
    crest: 'Canoe with fishing net',
    colors: ['Green', 'Gold'],
    location: 'Ke Kingdom',
    status: 'active'
  },
  {
    name: 'Kalaekuleama',
    kalabariName: 'Kala-ekule-ama',
    description: 'One of the internal communities of Ke Kingdom, historically significant as a constituent community.',
    foundingStory: 'Confirmed as a constituent community of Ke Kingdom in oral histories.',
    foundingYear: 'Pre-colonial',
    founder: { name: 'Unknown', title: 'Founding Patriarch' },
    community: 'Ke Kingdom',
    currentLeader: { name: 'TBD', title: 'Community Head' },
    achievements: ['Community governance', 'Cultural preservation'],
    ceremonies: ['Ekine', 'Community gatherings'],
    crest: 'Traditional emblem',
    colors: ['Green', 'White'],
    location: 'Ke Kingdom',
    status: 'active'
  },
  {
    name: 'Duke Monmouth',
    kalabariName: 'Duke Monmouth',
    description: 'One of the oldest trading houses in Kalabari, established during the Atlantic trade era.',
    foundingStory: 'The Duke Monmouth and Duke Africa trading houses were established by King Owerri Daba before 1699.',
    foundingYear: 'Before 1699',
    founder: { name: 'King Owerri Daba', title: 'King of Kalabari' },
    community: 'Elem Kalabari (Old Shipping)',
    currentLeader: { name: 'TBD', title: 'Trading House Head' },
    achievements: ['Atlantic trade', 'Diplomatic relations with Europeans'],
    ceremonies: ['Trade ceremonies', 'New Year'],
    crest: 'Trading ship',
    colors: ['Red', 'Gold'],
    location: 'Elem Kalabari',
    status: 'active'
  },
  {
    name: 'Duke Africa',
    kalabariName: 'Duke Africa',
    description: 'Major trading house established during the Atlantic trade era.',
    foundingStory: 'One of the two primary trading houses (with Duke Monmouth) during the slave and palm oil trade.',
    foundingYear: 'Before 1699',
    founder: { name: 'King Owerri Daba', title: 'King of Kalabari' },
    community: 'Elem Kalabari (Old Shipping)',
    currentLeader: { name: 'TBD', title: 'Trading House Head' },
    achievements: ['Palm oil trade', 'European relations'],
    ceremonies: ['Trade ceremonies'],
    crest: 'African continent',
    colors: ['Green', 'Red'],
    location: 'Elem Kalabari',
    status: 'active'
  },
  {
    name: 'Abi Royal Family',
    kalabariName: 'Abi',
    description: 'The royal family lineage of Kalabari Kingdom, directly descended from the Amachree dynasty.',
    foundingStory: 'Descendants of Amachree I, the empire builder who formalized Ke Kingdom integration in ~1765.',
    foundingYear: '1669-1757',
    founder: { name: 'Dabaye Amakiri (Amachree I)', title: 'First Amachree' },
    community: 'Kalabari Kingdom',
    currentLeader: { name: 'Dabaye Amakiri I', title: 'Amanyanabo (Asari Dokubo)' },
    achievements: ['Kingdom governance', 'Cultural integration', 'Diplomacy'],
    ceremonies: ['Coronation', 'Kingship rituals', 'Royal gatherings'],
    crest: 'Crown and spear',
    colors: ['Gold', 'Red'],
    location: 'Elem Kalabari',
    status: 'active'
  },
  {
    name: 'Awo-Barboy',
    kalabariName: 'Awo-Barboy',
    description: 'Major faction house involved in the Great Dispersal that founded Buguma, Abonnema, and Bakana.',
    foundingStory: 'Led the migration from Elem Kalabari (Old Shipping) in 1881-1884 to establish new communities.',
    foundingYear: '1881-1884',
    founder: { name: 'Awo-Barboy', title: 'House Leader' },
    community: 'Buguma',
    currentLeader: { name: 'TBD', title: 'Head of House' },
    achievements: ['Community founding', 'Development'],
    ceremonies: ['New Year', 'Festival'],
    crest: 'House symbol',
    colors: ['Blue', 'Gold'],
    location: 'Buguma',
    status: 'active'
  }
];

// Get all war canoe houses
router.get('/houses', async (req, res) => {
  try {
    const { community, status } = req.query;
    const filter = {};
    
    if (community) filter.community = community;
    if (status) filter.status = status;

    let houses = await WarCanoeHouse.find(filter).sort({ name: 1 });

    // If no houses in DB, return defaults
    if (houses.length === 0) {
      houses = DEFAULT_HOUSES;
    }

    res.json({
      total: houses.length,
      houses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single house
router.get('/houses/:id', async (req, res) => {
  try {
    let house = await WarCanoeHouse.findById(req.params.id);
    
    if (!house) {
      // CheckDefaults
      house = DEFAULT_HOUSES.find(h => h.name.toLowerCase().replace(/[^a-z]/g, '-') === req.params.id.toLowerCase());
      if (!house) {
        return res.status(404).json({ error: 'House not found.' });
      }
    }

    res.json(house);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new house (admin)
router.post('/houses', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      kalabariName,
      description,
      foundingStory,
      foundingYear,
      founder,
      community,
      currentLeader,
      members,
      achievements,
      ceremonies,
      crest,
      colors,
      location,
      status,
      imageUrl
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required.' });
    }

    // Check if exists
    const existing = await WarCanoeHouse.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: 'House already exists.' });
    }

    const house = await WarCanoeHouse.create({
      name,
      kalabariName,
      description,
      foundingStory,
      foundingYear,
      founder,
      community,
      currentLeader,
      members: members || [],
      achievements: achievements || [],
      ceremonies: ceremonies || [],
      crest,
      colors: colors || [],
      location,
      status: status || 'active',
      imageUrl
    });

    res.status(201).json({
      message: 'War Canoe House created',
      house
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update house (admin)
router.put('/houses/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const house = await WarCanoeHouse.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!house) {
      return res.status(404).json({ error: 'House not found.' });
    }

    res.json({
      message: 'House updated',
      house
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get genealogy tree structure
router.get('/tree', async (req, res) => {
  try {
    const tree = {
      name: 'Kalabari Kingdom',
      communities: [
        {
          name: 'Ke Kingdom',
          type: 'kingdom',
          status: 'active',
          houses: DEFAULT_HOUSES.filter(h => h.community === 'Ke Kingdom').map(h => ({
            name: h.name,
            type: 'house',
            status: h.status
          }))
        },
        {
          name: 'Elem Kalabari',
          type: 'kingdom',
          status: 'active',
          houses: DEFAULT_HOUSES.filter(h => h.community === 'Elem Kalabari (Old Shipping)').map(h => ({
            name: h.name,
            type: 'house',
            status: h.status
          }))
        },
        {
          name: 'Buguma',
          type: 'city',
          status: 'active',
          houses: DEFAULT_HOUSES.filter(h => h.community === 'Buguma').map(h => ({
            name: h.name,
            type: 'house',
            status: h.status
          }))
        },
        {
          name: 'Abonnema',
          type: 'city',
          status: 'active',
          houses: []
        },
        {
          name: 'Bakana',
          type: 'city',
          status: 'active',
          houses: []
        },
        {
          name: 'Degema',
          type: 'city',
          status: 'active',
          houses: []
        }
      ],
      legend: {
        kingdom: 'Independent traditional state',
        city: 'Major settlement',
        house: 'War Canoe House / Lineage'
      }
    };

    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize default houses (admin)
router.post('/init', authenticate, requireAdmin, async (req, res) => {
  try {
    // Clear and recreate
    await WarCanoeHouse.deleteMany({});
    
    const houses = await WarCanoeHouse.insertMany(DEFAULT_HOUSES);

    res.json({
      message: 'War Canoe Houses initialized',
      count: houses.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;