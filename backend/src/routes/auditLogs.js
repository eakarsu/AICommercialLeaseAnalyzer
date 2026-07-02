const express = require('express');
const { AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const logs = await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: 'Audit log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { action, entityType, entityId, title, status, source, details } = req.body;
    if (!action || !entityType || !title) {
      return res.status(400).json({ error: 'action, entityType, and title are required' });
    }
    const log = await AuditLog.create({
      userId: req.user.id,
      action,
      entityType,
      entityId,
      title,
      status: status || 'completed',
      source: source || 'manual',
      details: details || {}
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: 'Audit log not found' });
    await log.update(req.body);
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: 'Audit log not found' });
    await log.destroy();
    res.json({ message: 'Audit log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
