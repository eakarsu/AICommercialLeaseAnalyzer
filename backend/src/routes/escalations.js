const express = require('express');
const { Escalation } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await Escalation.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Escalation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Escalation not found' });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const item = await Escalation.create(req.body);
    res.status(201).json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Escalation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Escalation not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Escalation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Escalation not found' });
    await item.destroy();
    res.json({ message: 'Escalation deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
