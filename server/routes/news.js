const router = require('express').Router();
const News = require('../models/News');
router.get('/', async (req, res) => { try { res.json(await News.find({ published: true }).sort({ createdAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await News.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
router.get('/:id', async (req, res) => { try { const d = await News.findById(req.params.id); d ? res.json(d) : res.status(404).json({ error: 'Not found' }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.put('/:id', async (req, res) => { try { res.json(await News.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/:id', async (req, res) => { try { await News.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (e) { res.status(500).json({ error: e.message }); } });
module.exports = router;
