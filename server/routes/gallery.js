const router = require('express').Router();
const GalleryItem = require('../models/GalleryItem');
router.get('/', async (req, res) => { try { const filter = req.query.category ? { category: req.query.category, approved: true } : { approved: true }; res.json(await GalleryItem.find(filter).sort({ createdAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await GalleryItem.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
router.put('/:id', async (req, res) => { try { res.json(await GalleryItem.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ error: e.message }); } });
router.delete('/:id', async (req, res) => { try { await GalleryItem.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (e) { res.status(500).json({ error: e.message }); } });
module.exports = router;
