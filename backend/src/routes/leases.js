const express = require('express');
const { Lease } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const leases = await Lease.findAll({ order: [['createdAt', 'DESC']] });
    res.json(leases);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const lease = await Lease.findByPk(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    res.json(lease);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const lease = await Lease.create(req.body);
    res.status(201).json(lease);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const lease = await Lease.findByPk(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    await lease.update(req.body);
    res.json(lease);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const lease = await Lease.findByPk(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    await lease.destroy();
    res.json({ message: 'Lease deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
