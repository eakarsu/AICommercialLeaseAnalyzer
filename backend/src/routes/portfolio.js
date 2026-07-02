const express = require('express');
const { Portfolio } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await Portfolio.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Portfolio.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Portfolio item not found' });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const item = await Portfolio.create(req.body);
    await recordAudit(req, {
      action: 'create',
      entityType: 'portfolio',
      entityId: item.id,
      title: `Created portfolio property ${item.propertyName}`,
      details: { propertyName: item.propertyName, propertyAddress: item.propertyAddress }
    });
    res.status(201).json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Portfolio.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Portfolio item not found' });
    await item.update(req.body);
    await recordAudit(req, {
      action: 'update',
      entityType: 'portfolio',
      entityId: item.id,
      title: `Updated portfolio property ${item.propertyName}`,
      details: { fields: Object.keys(req.body || {}) }
    });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Portfolio.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Portfolio item not found' });
    const title = `Deleted portfolio property ${item.propertyName}`;
    await item.destroy();
    await recordAudit(req, { action: 'delete', entityType: 'portfolio', entityId: req.params.id, title });
    res.json({ message: 'Portfolio item deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
