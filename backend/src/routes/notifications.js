/**
 * Notifications subsystem (audit gap: missing notifications/limited AI coverage).
 *
 * Distinct from lease-alerts (domain-scoped to leases). Notifications is a
 * generic per-user inbox. In-memory store; promote to a sequelize model later.
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const memStore = new Map();
let nextMemId = 1;

router.get('/', (req, res) => {
  res.json(memStore.get(req.user.id) || []);
});

router.get('/unread-count', (req, res) => {
  const list = memStore.get(req.user.id) || [];
  res.json({ unread: list.filter(n => !n.read).length });
});

router.post('/', (req, res) => {
  try {
    const { user_id, message, type } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const target = user_id || req.user.id;
    const item = { id: nextMemId++, user_id: target, message, type: type || 'info', read: false, created_at: new Date().toISOString() };
    if (!memStore.has(target)) memStore.set(target, []);
    memStore.get(target).unshift(item);
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', (req, res) => {
  const list = memStore.get(req.user.id) || [];
  const item = list.find(n => String(n.id) === String(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.read = true;
  res.json(item);
});

router.post('/mark-all-read', (req, res) => {
  (memStore.get(req.user.id) || []).forEach(n => { n.read = true; });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const list = memStore.get(req.user.id) || [];
  const idx = list.findIndex(n => String(n.id) === String(req.params.id));
  if (idx >= 0) list.splice(idx, 1);
  res.json({ success: true });
});

module.exports = router;
