const router = require('express').Router();
const EnvironmentReport = require('../models/EnvironmentReport');
router.get('/', async (req, res) => { try { res.json(await EnvironmentReport.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
router.post('/', async (req, res) => { try { res.status(201).json(await EnvironmentReport.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
module.exports = router;
