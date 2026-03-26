const router = require('express').Router();
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
router.post('/', async (req, res) => { try { res.status(201).json(await NewsletterSubscriber.create({ email: req.body.email })); } catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'Already subscribed' }); res.status(400).json({ error: e.message }); } });
router.delete('/:email', async (req, res) => { try { await NewsletterSubscriber.findOneAndUpdate({ email: req.params.email }, { active: false }); res.json({ message: 'Unsubscribed' }); } catch (e) { res.status(500).json({ error: e.message }); } });
module.exports = router;
