const router = require('express').Router();
const DirectoryMember = require('../models/DirectoryMember');
router.get('/', async (req, res) => { try { res.json(await DirectoryMember.find({ approved: true, isPublic: true }).select('-email').sort({ createdAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await DirectoryMember.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
module.exports = router;
