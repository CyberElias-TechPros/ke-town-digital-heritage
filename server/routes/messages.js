const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { Message, Conversation } = require('../models/Message');
const User = require('../models/User');

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'fullName avatar shopName isSeller')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });
    res.json(conversations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/conversations/:conversationId', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate('sender', 'fullName avatar')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { recipientId, productId, initialMessage } = req.body;
    
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, recipientId] },
      product: productId || null
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, recipientId],
        product: productId || null
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      recipient: recipientId,
      content: initialMessage
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json(message);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:conversationId', authenticate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const recipientId = conversation.participants.find(p => p.toString() !== req.user.id);

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      recipient: recipientId,
      content: req.body.content
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json(message);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:messageId/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    
    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    message.read = true;
    message.readAt = new Date();
    await message.save();
    
    res.json(message);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const count = await Message.countDocuments({ 
      recipient: req.user.id, 
      read: false 
    });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;