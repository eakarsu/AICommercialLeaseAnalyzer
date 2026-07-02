/**
 * Notifications subsystem (audit gap: missing notifications/limited AI coverage).
 *
 * Distinct from lease-alerts (domain-scoped to leases). Notifications is a
 * generic per-user inbox. In-memory store; promote to a sequelize model later.
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const router = express.Router();

router.use(authenticateToken);

const memStore = new Map();
let nextMemId = 1;

function defaultNotifications(userId) {
  const now = new Date();
  const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

  const templates = [
    ['AI lease audit ready', 'Run Lease Audit from AI Lab for leases with missing renewal or assignment language.', 'info', false],
    ['Critical dates loaded', 'Seeded lease alerts are available in Alerts & Calendar for expiration, option, and rent bump tracking.', 'success', false],
    ['Portfolio stress test suggested', 'Run the rent and vacancy shock scenario against high-risk portfolio assets.', 'warning', true],
    ['Comparison report queue', 'Compare the highest-rent leases to identify variance in rent, escalation, and renewal flexibility.', 'info', false],
    ['Sublease review recommended', 'TechVenture Labs has sublease provisions that should be checked before any partial transfer.', 'warning', false],
    ['Market comps refreshed', 'Market comparable rows are seeded and ready for Reports, exports, and AI context.', 'success', true],
    ['Rent bump window open', 'DataCore Analytics has an escalation alert in the next 60 days.', 'warning', false],
    ['Export package available', 'Reports & Export can download seeded leases, escalations, negotiations, portfolio, and market comps.', 'info', true],
    ['Clause extraction ready', 'Use selected lease data in AI Lab to fill clause extraction context before running OpenRouter.', 'info', false],
    ['Renewal planning task', 'MedTech Solutions renewal planning should include TI allowance and medical waste provisions.', 'warning', false],
    ['Portfolio risk signal', 'Peachtree Retail Center has elevated risk and should be included in stress testing.', 'warning', true],
    ['Negotiation data seeded', 'Negotiation records are available for renewal, expansion, modification, and early renewal workflows.', 'success', true],
    ['Calendar export reminder', 'Export the alert calendar to iCal after reviewing due-soon items.', 'info', false],
    ['Tenant credit review', 'FirstBank Financial and National Insurance rows are ready for tenant credit review alerts.', 'info', true],
    ['AI output QA task', 'Review AI Lab templates and verify optional fields are filled before submitting analysis.', 'warning', false]
  ];

  return templates.map(([title, message, type, read], index) => ({
    id: nextMemId++,
    user_id: userId,
    title,
    message,
    type,
    read,
    created_at: minutesAgo(12 + index * 17)
  }));
}

function ensureUserStore(userId) {
  if (!memStore.has(userId)) {
    memStore.set(userId, defaultNotifications(userId));
  }
  return memStore.get(userId);
}

router.get('/', (req, res) => {
  res.json(ensureUserStore(req.user.id));
});

router.get('/unread-count', (req, res) => {
  const list = ensureUserStore(req.user.id);
  res.json({ unread: list.filter(n => !n.read).length });
});

router.post('/', async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const target = user_id || req.user.id;
    const item = {
      id: nextMemId++,
      user_id: target,
      title: title || 'Notification',
      message,
      type: type || 'info',
      read: false,
      created_at: new Date().toISOString()
    };
    ensureUserStore(target).unshift(item);
    await recordAudit(req, {
      action: 'create',
      entityType: 'notification',
      entityId: item.id,
      title: `Created notification: ${item.title}`,
      details: { type: item.type, target }
    });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', async (req, res) => {
  const list = memStore.get(req.user.id) || [];
  const item = list.find(n => String(n.id) === String(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.read = true;
  await recordAudit(req, {
    action: 'update',
    entityType: 'notification',
    entityId: item.id,
    title: `Marked notification read: ${item.title}`,
    details: { read: true }
  });
  res.json(item);
});

router.post('/mark-all-read', async (req, res) => {
  (memStore.get(req.user.id) || []).forEach(n => { n.read = true; });
  await recordAudit(req, {
    action: 'update',
    entityType: 'notification',
    entityId: 'all',
    title: 'Marked all notifications read',
    details: { read: true }
  });
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const list = memStore.get(req.user.id) || [];
  const idx = list.findIndex(n => String(n.id) === String(req.params.id));
  const item = idx >= 0 ? list[idx] : null;
  if (idx >= 0) list.splice(idx, 1);
  await recordAudit(req, {
    action: 'delete',
    entityType: 'notification',
    entityId: req.params.id,
    title: `Deleted notification${item?.title ? `: ${item.title}` : ''}`
  });
  res.json({ success: true });
});

module.exports = router;
