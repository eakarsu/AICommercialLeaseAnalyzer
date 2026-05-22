const express = require('express');
const router = express.Router();

let rows = [
  { id: 1, lease: 'LEASE-2201', anchorTenant: 'FreshMart', trigger: 'anchor closure > 90 days', remedy: 'rent abatement', status: 'watch' },
  { id: 2, lease: 'LEASE-2209', anchorTenant: 'CinemaMax', trigger: 'occupancy below 70%', remedy: 'termination right', status: 'review' },
  { id: 3, lease: 'LEASE-2212', anchorTenant: 'GymCo', trigger: 'none active', remedy: 'none', status: 'clear' }
];

router.get('/', (_req, res) => res.json({ rows, summary: { total: rows.length, review: rows.filter(r => r.status === 'review').length, watch: rows.filter(r => r.status === 'watch').length } }));
router.post('/', (req, res) => { const item = { id: Date.now(), lease: req.body.lease || 'LEASE-pending', anchorTenant: req.body.anchorTenant || 'Anchor TBD', trigger: req.body.trigger || 'pending', remedy: req.body.remedy || 'pending', status: req.body.status || 'watch' }; rows = [item, ...rows]; res.status(201).json(item); });

module.exports = router;
