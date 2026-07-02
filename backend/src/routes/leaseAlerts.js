const express = require('express');
const { Op } = require('sequelize');
const { LeaseAlert, Lease } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validateAlert } = require('../middleware/validate');
const { recordAudit } = require('../utils/audit');
const router = express.Router();

// POST /api/lease-alerts — create a new alert for a lease event
router.post('/', authenticateToken, validateAlert, async (req, res) => {
  try {
    const { lease_id, alert_type, alert_date, message } = req.body;

    const lease = await Lease.findByPk(lease_id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    const alert = await LeaseAlert.create({
      leaseId: lease_id,
      userId: req.user.id,
      alertType: alert_type,
      alertDate: alert_date,
      message: message || null
    });

    await recordAudit(req, {
      action: 'create',
      entityType: 'alert',
      entityId: alert.id,
      title: `Created ${alert_type} alert for ${lease.tenantName}`,
      details: { leaseId: lease_id, alertDate: alert_date }
    });

    res.status(201).json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lease-alerts — list all alerts for the authenticated user (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await LeaseAlert.findAndCountAll({
      where: { userId: req.user.id },
      include: [{ model: Lease, attributes: ['id', 'tenantName', 'propertyAddress'] }],
      order: [['alertDate', 'ASC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lease-alerts/due — alerts due in next 90 days
router.get('/due', authenticateToken, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 90));
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const alerts = await LeaseAlert.findAll({
      where: {
        userId: req.user.id,
        alertDate: { [Op.between]: [today.toISOString().split('T')[0], cutoff.toISOString().split('T')[0]] },
        notified: false
      },
      include: [{ model: Lease, attributes: ['id', 'tenantName', 'propertyAddress', 'monthlyRent', 'endDate'] }],
      order: [['alertDate', 'ASC']]
    });

    res.json({
      success: true,
      dueWithinDays: days,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lease-alerts/:id — get single alert
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const alert = await LeaseAlert.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Lease, attributes: ['id', 'tenantName', 'propertyAddress'] }]
    });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/lease-alerts/:id — update alert (mark as notified, change date, etc.)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const alert = await LeaseAlert.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const { alert_date, message, notified } = req.body;
    const updates = {};
    if (alert_date) updates.alertDate = alert_date;
    if (message !== undefined) updates.message = message;
    if (notified !== undefined) {
      updates.notified = notified;
      if (notified) updates.notifiedAt = new Date();
    }

    await alert.update(updates);
    await recordAudit(req, {
      action: 'update',
      entityType: 'alert',
      entityId: alert.id,
      title: `Updated lease alert #${alert.id}`,
      details: { fields: Object.keys(updates) }
    });
    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/lease-alerts/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const alert = await LeaseAlert.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    const title = `Deleted lease alert #${alert.id}`;
    await alert.destroy();
    await recordAudit(req, { action: 'delete', entityType: 'alert', entityId: req.params.id, title });
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
