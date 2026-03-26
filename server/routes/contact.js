const router = require('express').Router();
const ContactMessage = require('../models/ContactMessage');
router.get('/', async (req, res) => { try { res.json(await ContactMessage.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await ContactMessage.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
router.put('/:id/read', async (req, res) => { try { res.json(await ContactMessage.findByIdAndUpdate(req.params.id, { read: true }, { new: true })); } catch (e) { res.status(400).json({ error: e.message }); } });
module.exports = router;
