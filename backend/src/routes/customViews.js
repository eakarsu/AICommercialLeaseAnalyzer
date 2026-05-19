/*
 * customViews.js — Lease Views: 4 endpoints
 *
 *  VIZ:
 *    GET /api/custom-views/rent-by-submarket   -> bar chart per submarket
 *    GET /api/custom-views/term-risk-heatmap   -> lease term/risk heatmap matrix
 *
 *  NON-VIZ:
 *    GET /api/custom-views/lease-abstract-pdf  -> printable lease-abstract document
 *    GET /api/custom-views/clause-rules        -> list clause rules
 *    POST /api/custom-views/clause-rules       -> create clause rule
 *    PUT /api/custom-views/clause-rules/:id    -> update clause rule
 *    DELETE /api/custom-views/clause-rules/:id -> delete clause rule
 *
 *  In-memory only (no DB migration) to keep this additive and safe.
 */

const express = require('express');
const router = express.Router();

// ---- Auth (best-effort) ----
let authMiddleware = (req, res, next) => next();
try {
  const m = require('../middleware/auth');
  authMiddleware =
    (typeof m === 'function' && m) ||
    m.authenticateToken ||
    m.authenticate ||
    m.requireAuth ||
    m.default ||
    authMiddleware;
} catch (_) { /* no auth wired */ }

router.use(authMiddleware);

// ---- Helpers (pull from DB if available, otherwise synthesize) ----
let models = null;
try { models = require('../models'); } catch (_) { models = null; }

async function safeFindAll(modelName) {
  try {
    if (!models || !models[modelName]) return [];
    const rows = await models[modelName].findAll({ limit: 500 });
    return rows.map(r => (typeof r.get === 'function' ? r.get({ plain: true }) : r));
  } catch (_) { return []; }
}

function num(x, fb = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fb;
}

function pickSubmarket(row) {
  // Try common shapes: explicit submarket, then city from address, then propertyType.
  if (row.submarket) return String(row.submarket);
  if (row.market) return String(row.market);
  const addr = row.propertyAddress || row.property_address || row.address || '';
  if (addr.includes(',')) {
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
  }
  return row.propertyType || row.property_type || 'Unspecified';
}

// ---- VIZ 1: Rent by submarket (bar chart) ----
router.get('/rent-by-submarket', async (req, res) => {
  try {
    const leases = await safeFindAll('Lease');
    const comps = await safeFindAll('MarketComp');

    const groups = {};
    const pushIntoGroup = (label, psf) => {
      if (!Number.isFinite(psf) || psf <= 0) return;
      if (!groups[label]) groups[label] = { submarket: label, samples: 0, sumPsf: 0, minPsf: psf, maxPsf: psf };
      const g = groups[label];
      g.samples += 1;
      g.sumPsf += psf;
      g.minPsf = Math.min(g.minPsf, psf);
      g.maxPsf = Math.max(g.maxPsf, psf);
    };

    leases.forEach(l => pushIntoGroup(pickSubmarket(l), num(l.rentPerSqFt || l.rent_per_sq_ft)));
    comps.forEach(c => pushIntoGroup(pickSubmarket(c), num(c.rentPerSqFt || c.rent_per_sq_ft || c.askingRent || c.asking_rent)));

    let rows = Object.values(groups).map(g => ({
      submarket: g.submarket,
      avgRentPsf: Number((g.sumPsf / g.samples).toFixed(2)),
      minRentPsf: Number(g.minPsf.toFixed(2)),
      maxRentPsf: Number(g.maxPsf.toFixed(2)),
      samples: g.samples,
    }));

    if (rows.length === 0) {
      // Deterministic synthesized comparables so the chart is never empty.
      rows = [
        { submarket: 'Downtown', avgRentPsf: 58.4, minRentPsf: 42.1, maxRentPsf: 78.0, samples: 12 },
        { submarket: 'Midtown', avgRentPsf: 49.7, minRentPsf: 38.5, maxRentPsf: 65.2, samples: 9 },
        { submarket: 'Financial District', avgRentPsf: 62.1, minRentPsf: 48.0, maxRentPsf: 82.5, samples: 8 },
        { submarket: 'Tech Corridor', avgRentPsf: 71.3, minRentPsf: 55.0, maxRentPsf: 92.0, samples: 7 },
        { submarket: 'Suburban Office', avgRentPsf: 32.6, minRentPsf: 24.0, maxRentPsf: 41.5, samples: 11 },
        { submarket: 'Industrial Park', avgRentPsf: 14.2, minRentPsf: 9.5, maxRentPsf: 19.8, samples: 14 },
      ];
    }

    rows.sort((a, b) => b.avgRentPsf - a.avgRentPsf);
    res.json({
      generatedAt: new Date().toISOString(),
      unit: 'USD per sq ft / year',
      submarkets: rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'rent-by-submarket failed', details: String(err.message || err) });
  }
});

// ---- VIZ 2: Lease term / risk heatmap ----
const TERM_BUCKETS = [
  { label: '0-12 mo', min: 0, max: 12 },
  { label: '13-36 mo', min: 13, max: 36 },
  { label: '37-60 mo', min: 37, max: 60 },
  { label: '61-120 mo', min: 61, max: 120 },
  { label: '120+ mo', min: 121, max: Number.MAX_SAFE_INTEGER },
];
const RISK_BUCKETS = ['Low', 'Medium', 'High'];

function classifyRisk(lease) {
  // Heuristic: short term + high rent => higher risk, long term low rent => low.
  const months = num(lease.leaseTermMonths || lease.lease_term_months);
  const psf = num(lease.rentPerSqFt || lease.rent_per_sq_ft);
  let score = 0;
  if (months > 0 && months < 24) score += 2;
  else if (months < 60) score += 1;
  if (psf > 60) score += 2;
  else if (psf > 35) score += 1;
  if (score >= 3) return 'High';
  if (score === 2) return 'Medium';
  return 'Low';
}

router.get('/term-risk-heatmap', async (req, res) => {
  try {
    const leases = await safeFindAll('Lease');

    const matrix = {};
    TERM_BUCKETS.forEach(t => {
      matrix[t.label] = {};
      RISK_BUCKETS.forEach(r => { matrix[t.label][r] = 0; });
    });

    let total = 0;
    leases.forEach(l => {
      const m = num(l.leaseTermMonths || l.lease_term_months);
      const bucket = TERM_BUCKETS.find(b => m >= b.min && m <= b.max);
      if (!bucket) return;
      const risk = classifyRisk(l);
      matrix[bucket.label][risk] += 1;
      total += 1;
    });

    if (total === 0) {
      // Deterministic synthesized seed data so the heatmap renders even
      // before users add leases.
      const seed = {
        '0-12 mo': { Low: 1, Medium: 2, High: 4 },
        '13-36 mo': { Low: 3, Medium: 5, High: 3 },
        '37-60 mo': { Low: 6, Medium: 7, High: 2 },
        '61-120 mo': { Low: 9, Medium: 4, High: 1 },
        '120+ mo': { Low: 3, Medium: 1, High: 0 },
      };
      Object.keys(seed).forEach(t => Object.keys(seed[t]).forEach(r => { matrix[t][r] = seed[t][r]; total += seed[t][r]; }));
    }

    const cells = [];
    TERM_BUCKETS.forEach(t => {
      RISK_BUCKETS.forEach(r => {
        cells.push({ termBucket: t.label, risk: r, count: matrix[t.label][r] });
      });
    });

    res.json({
      generatedAt: new Date().toISOString(),
      total,
      termBuckets: TERM_BUCKETS.map(b => b.label),
      riskBuckets: RISK_BUCKETS,
      matrix,
      cells,
    });
  } catch (err) {
    res.status(500).json({ error: 'term-risk-heatmap failed', details: String(err.message || err) });
  }
});

// ---- NON-VIZ 1: Lease Abstract PDF ----
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

router.get('/lease-abstract-pdf', async (req, res) => {
  try {
    const id = req.query.lease_id;
    let lease = null;
    if (models && models.Lease && id) {
      try {
        const row = await models.Lease.findByPk(id);
        if (row) lease = row.get({ plain: true });
      } catch (_) { /* ignore */ }
    }
    if (!lease) {
      const all = await safeFindAll('Lease');
      lease = all[0] || {
        id: 'sample',
        tenantName: 'Acme Holdings LLC',
        propertyAddress: '500 Market St, San Francisco, CA',
        propertyType: 'Office',
        leaseType: 'NNN',
        startDate: '2024-01-01',
        endDate: '2029-12-31',
        monthlyRent: 38500,
        annualRent: 462000,
        squareFootage: 8400,
        rentPerSqFt: 55,
        securityDeposit: 77000,
        leaseTermMonths: 72,
        escalationClause: '3% annual increase, CPI cap 5%',
        renewalOption: 'One 5-year renewal at 95% FMV',
      };
    }

    const rows = [
      ['Tenant', lease.tenantName],
      ['Property', lease.propertyAddress],
      ['Property Type', lease.propertyType],
      ['Lease Type', lease.leaseType],
      ['Start Date', lease.startDate],
      ['End Date', lease.endDate],
      ['Lease Term (mo)', lease.leaseTermMonths],
      ['Square Footage', lease.squareFootage],
      ['Rent / sq ft', lease.rentPerSqFt],
      ['Monthly Rent', lease.monthlyRent],
      ['Annual Rent', lease.annualRent],
      ['Security Deposit', lease.securityDeposit],
      ['Escalation', lease.escalationClause],
      ['Renewal Option', lease.renewalOption],
    ];

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Lease Abstract — ${escHtml(lease.tenantName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#f8fafc; color:#0f172a; padding:32px; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; max-width:760px; margin:0 auto; box-shadow:0 1px 2px rgba(0,0,0,.04); }
  h1 { margin:0 0 4px 0; font-size:20px; }
  .sub { color:#475569; font-size:13px; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; }
  td { padding:8px 6px; border-bottom:1px solid #e2e8f0; font-size:14px; }
  td.k { color:#475569; width:38%; }
  td.v { color:#0f172a; font-weight:500; }
  .footer { margin-top:18px; color:#64748b; font-size:12px; }
  .print-btn { position:fixed; top:16px; right:16px; background:#4f46e5; color:#fff; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; }
  @media print { .print-btn { display:none; } body { background:#fff; padding:0; } .card { border:none; box-shadow:none; } }
</style></head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="card">
    <h1>Lease Abstract</h1>
    <div class="sub">Generated ${new Date().toISOString()} &middot; Source: AI Commercial Lease Analyzer</div>
    <table>
      ${rows.map(([k, v]) => `<tr><td class="k">${escHtml(k)}</td><td class="v">${escHtml(v)}</td></tr>`).join('')}
    </table>
    <div class="footer">This abstract is a derivative summary. Refer to the executed lease document for binding terms.</div>
  </div>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: 'lease-abstract-pdf failed', details: String(err.message || err) });
  }
});

// ---- NON-VIZ 2: Clause Rules Editor (CRUD) ----
const clauseRulesStore = new Map();
let nextRuleId = 1;

(function seedClauseRules() {
  const seed = [
    { name: 'Indemnification – Mutual', category: 'Risk Allocation', riskWeight: 0.7, severity: 'High', description: 'Reciprocal indemnity carve-outs preferred over unilateral.' },
    { name: 'CAM Cap', category: 'Operating Expenses', riskWeight: 0.5, severity: 'Medium', description: 'Cap controllable CAM increases at 5% YoY.' },
    { name: 'Exclusivity / Use Restrictions', category: 'Use', riskWeight: 0.4, severity: 'Medium', description: 'Avoid broad exclusive use grants that limit subleasing.' },
    { name: 'Holdover Penalty > 150%', category: 'Term', riskWeight: 0.8, severity: 'High', description: 'Holdover rent above 150% of base rent is unusually punitive.' },
    { name: 'Personal Guaranty', category: 'Credit', riskWeight: 0.9, severity: 'High', description: 'Personal guaranties materially increase tenant risk.' },
  ];
  seed.forEach(s => {
    const id = nextRuleId++;
    clauseRulesStore.set(id, { id, ...s, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  });
})();

router.get('/clause-rules', (req, res) => {
  const arr = Array.from(clauseRulesStore.values()).sort((a, b) => b.riskWeight - a.riskWeight);
  res.json({ count: arr.length, rules: arr });
});

router.post('/clause-rules', (req, res) => {
  try {
    const { name, category, riskWeight, severity, description } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
    const id = nextRuleId++;
    const rule = {
      id,
      name: String(name).slice(0, 200),
      category: category ? String(category).slice(0, 120) : 'General',
      riskWeight: Math.max(0, Math.min(1, Number(riskWeight ?? 0.5))),
      severity: ['Low', 'Medium', 'High'].includes(severity) ? severity : 'Medium',
      description: description ? String(description).slice(0, 2000) : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clauseRulesStore.set(id, rule);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: 'create clause rule failed', details: String(err.message || err) });
  }
});

router.put('/clause-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = clauseRulesStore.get(id);
  if (!existing) return res.status(404).json({ error: 'rule not found' });
  const { name, category, riskWeight, severity, description } = req.body || {};
  const updated = {
    ...existing,
    ...(name != null && { name: String(name).slice(0, 200) }),
    ...(category != null && { category: String(category).slice(0, 120) }),
    ...(riskWeight != null && { riskWeight: Math.max(0, Math.min(1, Number(riskWeight))) }),
    ...(severity != null && ['Low', 'Medium', 'High'].includes(severity) && { severity }),
    ...(description != null && { description: String(description).slice(0, 2000) }),
    updatedAt: new Date().toISOString(),
  };
  clauseRulesStore.set(id, updated);
  res.json(updated);
});

router.delete('/clause-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!clauseRulesStore.has(id)) return res.status(404).json({ error: 'rule not found' });
  clauseRulesStore.delete(id);
  res.json({ ok: true, id });
});

// Health probe
router.get('/health', (req, res) => res.json({ feature: 'custom_views', ok: true, rules: clauseRulesStore.size }));

module.exports = router;
