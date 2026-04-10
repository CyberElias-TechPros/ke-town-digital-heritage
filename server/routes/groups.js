const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');
const Activity = require('../models/Activity');

// Get all groups
router.get('/', async (req, res) => {
  try {
    const { category, search, privacy, limit = 20, page = 1 } = req.query;
    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (privacy) filter.privacy = privacy;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const groups = await Group.find(filter)
      .populate('creator', 'fullName avatar')
      .sort({ memberCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Group.countDocuments(filter);
    res.json({ groups, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get my groups
router.get('/my', authenticate, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user.id
    }).populate('creator', 'fullName avatar')
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get suggested groups
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const myGroups = user.groups || [];
    
    // Get groups where user's interests might match
    const suggestions = await Group.find({
      _id: { $nin: myGroups },
      privacy: { $in: ['public', 'private'] },
      isActive: true
    })
      .populate('creator', 'fullName avatar')
      .sort({ memberCount: -1 })
      .limit(10);
    
    res.json(suggestions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single group
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'fullName avatar')
      .populate('admins', 'fullName avatar');
    
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create group
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, privacy, category, coverImage, joinMethod, allowPosts, rules } = req.body;
    
    const group = await Group.create({
      name,
      description,
      privacy: privacy || 'public',
      category: category || 'general',
      coverImage,
      creator: req.user.id,
      admins: [req.user.id],
      members: [{ user: req.user.id, role: 'admin' }],
      memberCount: 1,
      joinMethod: joinMethod || 'open',
      allowPosts: allowPosts || 'members',
      rules: rules || []
    });
    
    // Create activity
    await Activity.create({
      user: req.user.id,
      type: 'group',
      targetId: group._id,
      targetType: 'group',
      description: `created group "${name}"`
    });
    
    const populated = await Group.findById(group._id)
      .populate('creator', 'fullName avatar');
    res.status(201).json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update group
router.put('/:id', authenticate, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = group.admins.some(a => a.toString() === req.user.id);
    
    if (!isCreator && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { name, description, privacy, category, coverImage, joinMethod, allowPosts, rules } = req.body;
    
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (privacy) group.privacy = privacy;
    if (category) group.category = category;
    if (coverImage !== undefined) group.coverImage = coverImage;
    if (joinMethod) group.joinMethod = joinMethod;
    if (allowPosts) group.allowPosts = allowPosts;
    if (rules) group.rules = rules;
    
    await group.save();
    res.json(group);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete group
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    if (group.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    group.isActive = false;
    await group.save();
    res.json({ message: 'Group deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Join group
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    // Check if already member
    const existingMember = group.members.find(m => m.user.toString() === req.user.id);
    if (existingMember) return res.status(400).json({ error: 'Already a member' });
    
    // Check if pending
    if (group.pendingRequests.includes(req.user.id)) {
      return res.status(400).json({ error: 'Join request pending' });
    }
    
    if (group.joinMethod === 'approval') {
      group.pendingRequests.push(req.user.id);
      await group.save();
      return res.json({ message: 'Join request sent', status: 'pending' });
    }
    
    // Auto-join
    group.members.push({ user: req.user.id, role: 'member' });
    group.memberCount += 1;
    await group.save();
    
    // Create notification for group creator
    await Activity.create({
      user: req.user.id,
      type: 'group',
      targetId: group._id,
      targetType: 'group',
      description: `joined group "${group.name}"`
    });
    
    res.json({ message: 'Joined successfully', status: 'joined' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Leave group
router.delete('/:id/leave', authenticate, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const memberIndex = group.members.findIndex(m => m.user.toString() === req.user.id);
    if (memberIndex === -1) return res.status(400).json({ error: 'Not a member' });
    
    // Cannot leave if creator
    if (group.creator.toString() === req.user.id) {
      return res.status(400).json({ error: 'Creator cannot leave. Transfer ownership first.' });
    }
    
    group.members.splice(memberIndex, 1);
    group.memberCount = Math.max(0, group.memberCount - 1);
    await group.save();
    
    res.json({ message: 'Left group successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Approve join request
router.post('/:id/approve', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = group.admins.some(a => a.toString() === req.user.id);
    
    if (!isCreator && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const requestIndex = group.pendingRequests.indexOf(userId);
    if (requestIndex === -1) return res.status(400).json({ error: 'No pending request' });
    
    group.pendingRequests.splice(requestIndex, 1);
    group.members.push({ user: userId, role: 'member' });
    group.memberCount += 1;
    await group.save();
    
    res.json({ message: 'User approved' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Reject join request
router.post('/:id/reject', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = group.admins.some(a => a.toString() === req.user.id);
    
    if (!isCreator && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const requestIndex = group.pendingRequests.indexOf(userId);
    if (requestIndex === -1) return res.status(400).json({ error: 'No pending request' });
    
    group.pendingRequests.splice(requestIndex, 1);
    await group.save();
    
    res.json({ message: 'User rejected' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Add admin
router.post('/:id/admins', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    if (group.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (!group.admins.includes(userId)) {
      group.admins.push(userId);
      await group.save();
    }
    
    // Update member role
    const member = group.members.find(m => m.user.toString() === userId);
    if (member) member.role = 'moderator';
    await group.save();
    
    res.json({ message: 'Admin added' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get group posts
router.get('/:id/posts', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const skip = (page - 1) * limit;
    const posts = group.posts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parseInt(limit));
    
    // Populate authors
    const userIds = [...new Set(posts.map(p => p.author))];
    const users = await User.find({ _id: { $in: userIds } }).select('fullName avatar');
    const userMap = {};
    users.forEach(u => userMap[u._id] = u);
    
    const populatedPosts = posts.map(p => ({
      ...p.toObject(),
      author: userMap[p.author]
    }));
    
    res.json(populatedPosts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Post in group
router.post('/:id/posts', authenticate, async (req, res) => {
  try {
    const { content, media } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    // Check if can post
    const member = group.members.find(m => m.user.toString() === req.user.id);
    if (!member) return res.status(403).json({ error: 'Must be a member to post' });
    
    const isAdmin = group.admins.includes(req.user.id);
    if (group.allowPosts === 'admins' && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can post' });
    }
    
    const post = {
      author: req.user.id,
      content,
      media: media || [],
      createdAt: new Date()
    };
    
    group.posts.unshift(post);
    group.posts = group.posts.slice(0, 100); // Keep last 100 posts
    await group.save();
    
    // Populate author for response
    const author = await User.findById(req.user.id).select('fullName avatar');
    
    res.status(201).json({ ...post, author });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// React to group post
router.post('/:id/posts/:postId/react', authenticate, async (req, res) => {
  try {
    const { reactionType } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const post = group.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    // Remove existing reaction
    post.reactions = post.reactions.filter(r => r.user.toString() !== req.user.id);
    
    // Add new reaction
    if (reactionType) {
      post.reactions.push({ user: req.user.id, type: reactionType });
    }
    
    await group.save();
    res.json({ success: true, reactions: post.reactions });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get group members
router.get('/:id/members', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const userIds = group.members.map(m => m.user);
    const users = await User.find({ _id: { $in: userIds } })
      .select('fullName avatar bio')
      .lean();
    
    const memberMap = {};
    group.members.forEach(m => memberMap[m.user] = m);
    
    const members = users.map(u => ({
      user: u,
      role: memberMap[u._id]?.role || 'member'
    }));
    
    res.json(members);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get pending requests
router.get('/:id/requests', authenticate, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = group.admins.some(a => a.toString() === req.user.id);
    
    if (!isCreator && !isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const users = await User.find({ _id: { $in: group.pendingRequests } })
      .select('fullName avatar');
    
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;