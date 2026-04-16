// ============================================
// KE Town Digital Heritage - Database Seeder
// ============================================
// Run: cd server && node seed.js

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 
  'mongodb+srv://cybereliastk_db_user:3bBKj4DtLRh7DNd8@cea.rz1xdmd.mongodb.net/keKingdom?retryWrites=true&w=majority';

const User = require('./models/User');
const Event = require('./models/Event');
const News = require('./models/News');
const GalleryItem = require('./models/GalleryItem');
const DirectoryMember = require('./models/DirectoryMember');
const Project = require('./models/Project');
const Group = require('./models/Group');
const Product = require('./models/Product');
const Post = require('./models/Post');

const sampleUsers = [
  { fullName: 'Admin User', email: 'admin@ketown.com', password: 'admin123', role: 'admin', accountStatus: 'active', emailVerified: true, verified: true },
  { fullName: 'Content Manager', email: 'content@ketown.com', password: 'pass1234', role: 'content_manager', accountStatus: 'active', emailVerified: true },
  { fullName: 'Moderator', email: 'mod@ketown.com', password: 'pass1234', role: 'moderator', accountStatus: 'active', emailVerified: true },
  { fullName: 'John Doe', email: 'john@example.com', password: 'pass1234', bio: 'KE Town enthusiast and community builder', location: 'Lagos, Nigeria' },
  { fullName: 'Sarah Smith', email: 'sarah@example.com', password: 'pass1234', bio: 'Cultural preservation advocate', location: 'Abuja, Nigeria' },
  { fullName: 'Michael Okonkwo', email: 'michael@example.com', password: 'pass1234', bio: 'Heritage preservation volunteer', location: 'Port Harcourt' },
  { fullName: 'Grace Adeyemi', email: 'grace@example.com', password: 'pass1234', bio: 'Digital skills trainer', location: 'Ibadan' },
  { fullName: 'David Chen', email: 'david@example.com', password: 'pass1234', bio: 'Tour guide and history buff', location: 'Benin City' },
  { fullName: 'Amara Eze', email: 'amara@example.com', password: 'pass1234', bio: 'Environmental activist', location: 'Delta State' },
  { fullName: 'Robert Williams', email: 'robert@example.com', password: 'pass1234', isSeller: true, shopName: 'Heritage Crafts', shopDescription: 'Traditional crafts and artifacts', location: 'Lagos' },
  { fullName: 'Joyce Nigerian', email: 'joyce@example.com', password: 'pass1234', isSeller: true, shopName: 'Naija Delights', shopDescription: 'Local food and provisions', location: 'Abuja' },
  { fullName: 'Tomiwa Bakare', email: 'tomiwa@example.com', password: 'pass1234', bio: 'Event organizer', location: 'Lagos' }
];

const sampleEvents = [
  { title: 'KE Town Annual Cultural Festival', description: 'Join us for the biggest celebration of our heritage with traditional dances, food, and craft exhibitions.', date: new Date('2026-06-15'), location: 'KE Town Central Stadium', category: 'cultural', organizer: null },
  { title: 'Digital Skills Workshop', description: 'Learn essential digital skills including social media, e-commerce, and online business management.', date: new Date('2026-05-20'), location: 'Community Center', category: 'education', organizer: null },
  { title: 'War Canoe Race', description: 'Traditional canoe race along the river. Teams from all communities compete for the grand prize.', date: new Date('2026-07-01'), location: 'KE River', category: 'sports', organizer: null },
  { title: 'Heritage Exhibition', description: 'Display of historical artifacts, traditional clothing, and cultural documents.', date: new Date('2026-08-10'), location: 'Museum Grounds', category: 'cultural', organizer: null },
  { title: 'Environmental Cleanup Day', description: 'Community cleanup of the mangroves and riverside areas.', date: new Date('2026-05-05'), location: 'Riverside', category: 'environment', organizer: null },
  { title: 'Elder Stories Session', description: 'Monthly gathering where elders share oral histories and traditional tales.', date: new Date('2026-05-25'), location: 'Town Hall', category: 'culture', organizer: null },
  { title: 'Local Business Networking', description: 'Connect with local entrepreneurs and business owners.', date: new Date('2026-06-01'), location: 'Chamber of Commerce', category: 'business', organizer: null },
  { title: 'Youth Mentorship Program', description: 'Experienced professionals mentor young people on career and entrepreneurship.', date: new Date('2026-05-15'), location: 'Youth Center', category: 'education', organizer: null }
];

const sampleNews = [
  { title: 'KE Town Gets New Museum', excerpt: 'The long-awaited museum will open next month, featuring artifacts from the 18th century.', content: 'Construction of the KE Town Museum has been completed. The museum will house artifacts dating back to the 18th century, including traditional tools, clothing, and documents. Grand opening is scheduled for next month.', published: true, featured: true },
  { title: 'Road Network Expansion', excerpt: 'New roads connecting remote communities are now under construction.', content: 'The state government has approved the expansion of road networks to connect remote communities to the town center. The project is expected to be completed in 18 months.', published: true },
  { title: 'Youth Win Innovation Award', excerpt: 'Three young entrepreneurs from KE Town won the state innovation competition.', content: 'A team of young innovators from KE Town has won the state innovation award for their agricultural technology solution.', published: true },
  { title: 'Traditional Festival Returns', excerpt: 'After a 5-year hiatus, the annual festival will return this year.', content: 'The annual cultural festival is making a comeback this year with enhanced activities and more community participation.', published: true },
  { title: 'Medical Outreach Success', excerpt: 'Over 500 residents received free medical checks during the outreach.', content: 'The recent medical outreach was a huge success, with over 500 residents receiving free health checks and medications.', published: true }
];

const sampleGallery = [
  { title: 'Traditional Chief Attire', description: 'Full traditional attire worn by the community chief during ceremonies', category: 'culture', imageUrl: 'https://images.unsplash.com/photo-1531123897727-6f0192181a29?w=800', tags: ['culture', 'traditional', 'attire'], approved: true },
  { title: 'Historical Monument', description: 'The old monument built in 1920', category: 'history', imageUrl: 'https://images.unsplash.com/photo-1590739227076-5d6f0553f1c3?w=800', tags: ['history', 'monument'], approved: true },
  { title: 'River View at Sunset', description: 'Beautiful sunset view from the riverside', category: 'nature', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4dccdf4?w=800', tags: ['nature', 'river', 'sunset'], approved: true },
  { title: 'Traditional Weaving', description: 'Elder demonstrating traditional weaving techniques', category: 'crafts', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd48?w=800', tags: ['crafts', 'weaving'], approved: true },
  { title: 'Cultural Dance Performance', description: 'Traditional dance during the festival', category: 'culture', imageUrl: 'https://images.unsplash.com/photo-1547153760-18fc0d991e59?w=800', tags: ['culture', 'dance'], approved: true },
  { title: 'Local Market Scene', description: 'Busy market in the town square', category: 'daily-life', imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23a763e60cd?w=800', tags: ['market', 'daily'], approved: true }
];

const sampleDirectory = [
  { name: 'KE General Hospital', category: 'health', description: 'Primary healthcare facility', phone: '+234-800-123-4567', address: 'Hospital Road', email: 'info@ketownhospital.com' },
  { name: 'KE Town Police Station', category: 'security', description: 'Local police and emergency services', phone: '+234-800-123-4568', address: 'Police Station Road' },
  { name: 'Community Bank', category: 'finance', description: 'Microfinance bank for local businesses', phone: '+234-800-123-4569', address: 'Bank Street', email: 'contact@communitybank.com' },
  { name: 'Central Primary School', category: 'education', description: 'Government primary school', phone: '+234-800-123-4570', address: 'School Road' },
  { name: 'Local Market', category: 'commerce', description: 'Main market for daily provisions', phone: '+234-800-123-4571', address: 'Market Square' },
  { name: 'KE Town Fire Service', category: 'security', description: 'Fire and rescue services', phone: '+234-800-123-4572', address: 'Emergency Avenue' }
];

const sampleGroups = [
  { name: 'Cultural Preservation Group', description: 'Dedicated to preserving our heritage and traditions', privacy: 'public', category: 'culture', rules: ['Respect all members', 'No offensive language', 'Stay on topic'] },
  { name: 'KE Town Youth Network', description: 'Empowering youth through skills and opportunities', privacy: 'public', category: 'education', rules: ['Be supportive', 'Share opportunities', 'No spam'] },
  { name: 'Business Owners Association', description: 'Supporting local entrepreneurs and traders', privacy: 'private', category: 'business', rules: ['Business-related discussions only', 'No personal attacks'] },
  { name: 'Environmental Advocates', description: 'Protecting our environment and natural resources', privacy: 'public', category: 'environment', rules: ['Share environmental tips', 'Organize cleanup events'] },
  { name: 'Skills Exchange', description: 'Members share skills and teach each other', privacy: 'public', category: 'education', rules: ['Be willing to teach', 'Be respectful'] }
];

const sampleProducts = [
  { title: 'Traditional Woven Basket', description: 'Handcrafted basket using traditional weaving techniques', category: 'crafts', condition: 'used', price: 5000, seller: null, location: 'KE Town', images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd48?w=800'] },
  { title: 'Local Palm Oil (5L)', description: 'Fresh palm oil from local farmers', category: 'food', condition: 'new', price: 3500, seller: null, location: 'KE Town' },
  { title: 'Traditional Fabric (6 yards)', description: 'Quality local fabric perfect for traditional wear', category: 'fashion', condition: 'new', price: 8000, seller: null, location: 'Abuja' },
  { title: 'Handmade Clay Pot', description: 'Decorative clay pot for home decoration', category: 'home', condition: 'used', price: 2500, seller: null, location: 'KE Town' },
  { title: 'Local Palm Wine (1L)', description: 'Freshly tapped palm wine', category: 'food', condition: 'new', price: 1500, seller: null, location: 'KE Town' },
  { title: 'Traditional Chief Hat', description: 'Handcrafted traditional headgear', category: 'fashion', condition: 'new', price: 4500, seller: null, location: 'Delta State' }
];

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Event.deleteMany({});
    await News.deleteMany({});
    await GalleryItem.deleteMany({});
    await DirectoryMember.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await Product.deleteMany({});
    await Post.deleteMany({});

    console.log('Seeding users...');
    const createdUsers = await User.insertMany(sampleUsers);
    const adminUser = createdUsers[0];
    const user1 = createdUsers[3];
    const seller1 = createdUsers[9];
    const seller2 = createdUsers[10];

    console.log('Seeding events...');
    const eventsWithOrganizer = sampleEvents.map(event => ({
      ...event,
      organizer: adminUser._id,
      createdBy: adminUser._id
    }));
    await Event.insertMany(eventsWithOrganizer);

    console.log('Seeding news...');
    const newsWithAuthor = sampleNews.map(news => ({
      ...news,
      author: adminUser._id,
      createdBy: adminUser._id
    }));
    await News.insertMany(newsWithAuthor);

    console.log('Seeding gallery...');
    const galleryWithUser = sampleGallery.map(item => ({
      ...item,
      submittedBy: user1._id
    }));
    await GalleryItem.insertMany(galleryWithUser);

    console.log('Seeding directory...');
    await DirectoryMember.insertMany(sampleDirectory);

    console.log('Seeding groups...');
    const groupsWithCreator = sampleGroups.map((group, index) => ({
      ...group,
      creator: index === 0 ? adminUser._id : user1._id,
      admins: [index === 0 ? adminUser._id : user1._id],
      members: [{ user: index === 0 ? adminUser._id : user1._id, role: 'admin' }],
      memberCount: 1
    }));
    await Group.insertMany(groupsWithCreator);

    console.log('Seeding products...');
    const productsWithSeller = sampleProducts.map(product => ({
      ...product,
      seller: product.price > 4000 ? seller1._id : seller2._id,
      status: 'active'
    }));
    await Product.insertMany(productsWithSeller);

    console.log('Seeding sample posts...');
    const samplePosts = [
      { author: user1._id, content: 'Excited to join this community! Looking forward to connecting with everyone.', privacy: 'public' },
      { author: seller1._id, content: 'Check out my shop for authentic crafts and traditional items!', privacy: 'public' },
      { author: adminUser._id, content: 'Welcome to KE Town Digital Heritage platform! Let\'s preserve our culture together.', privacy: 'public' }
    ];
    await Post.insertMany(samplePosts);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('  Admin: admin@ketown.com / admin123');
    console.log('  Content Manager: content@ketown.com / pass1234');
    console.log('  Moderator: mod@ketown.com / pass1234');
    console.log('  Regular User: john@example.com / pass1234');
    console.log('  Seller: robert@example.com / pass1234');
    console.log('\nSample Data:');
    console.log(`  - ${createdUsers.length} Users`);
    console.log(`  - ${sampleEvents.length} Events`);
    console.log(`  - ${sampleNews.length} News articles`);
    console.log(`  - ${sampleGallery.length} Gallery items`);
    console.log(`  - ${sampleDirectory.length} Directory members`);
    console.log(`  - ${sampleGroups.length} Groups`);
    console.log(`  - ${sampleProducts.length} Products`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();