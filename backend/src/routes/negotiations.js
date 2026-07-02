const express = require('express');
const { Negotiation } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await Negotiation.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Negotiation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Negotiation not found' });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const item = await Negotiation.create(req.body);
    await recordAudit(req, {
      action: 'create',
      entityType: 'negotiation',
      entityId: item.id,
      title: `Created negotiation for ${item.tenantName}`,
      details: { tenantName: item.tenantName, status: item.negotiationStatus }
    });
    res.status(201).json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Negotiation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Negotiation not found' });
    await item.update(req.body);
    await recordAudit(req, {
      action: 'update',
      entityType: 'negotiation',
      entityId: item.id,
      title: `Updated negotiation for ${item.tenantName}`,
      details: { fields: Object.keys(req.body || {}) }
    });
    res.json(item);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Negotiation.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Negotiation not found' });
    const title = `Deleted negotiation for ${item.tenantName}`;
    await item.destroy();
    await recordAudit(req, { action: 'delete', entityType: 'negotiation', entityId: req.params.id, title });
    res.json({ message: 'Negotiation deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
