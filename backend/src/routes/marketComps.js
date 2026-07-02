const express = require('express');
const { MarketComp } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await MarketComp.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await MarketComp.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Market comp not found' });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const item = await MarketComp.create(req.body);
    await recordAudit(req, {
      action: 'create',
      entityType: 'marketComp',
      entityId: item.id,
      title: `Created market comp for ${item.propertyAddress}`,
      details: { propertyAddress: item.propertyAddress, market: item.market }
    });
    res.status(201).json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await MarketComp.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Market comp not found' });
    await item.update(req.body);
    await recordAudit(req, {
      action: 'update',
      entityType: 'marketComp',
      entityId: item.id,
      title: `Updated market comp for ${item.propertyAddress}`,
      details: { fields: Object.keys(req.body || {}) }
    });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await MarketComp.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Market comp not found' });
    const title = `Deleted market comp for ${item.propertyAddress}`;
    await item.destroy();
    await recordAudit(req, { action: 'delete', entityType: 'marketComp', entityId: req.params.id, title });
    res.json({ message: 'Market comp deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
