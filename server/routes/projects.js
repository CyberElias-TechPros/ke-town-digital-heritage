const router = require('express').Router();
const Project = require('../models/Project');
router.get('/', async (req, res) => { try { res.json(await Project.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await Project.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
router.put('/:id', async (req, res) => { try { res.json(await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ error: e.message }); } });
module.exports = router;
