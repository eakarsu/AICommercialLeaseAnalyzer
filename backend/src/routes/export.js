const express = require('express');
const { Lease, Escalation, Negotiation, Portfolio, MarketComp } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const toCSV = (data, columns) => {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(item =>
    columns.map(c => {
      let val = item[c.key];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
      return val;
    }).join(',')
  );
  return [header, ...rows].join('\n');
};

router.get('/leases', authenticateToken, async (req, res) => {
  try {
    const leases = await Lease.findAll({ order: [['createdAt', 'DESC']] });
    const columns = [
      { key: 'tenantName', label: 'Tenant Name' },
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'propertyType', label: 'Property Type' },
      { key: 'leaseType', label: 'Lease Type' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'monthlyRent', label: 'Monthly Rent' },
      { key: 'annualRent', label: 'Annual Rent' },
      { key: 'squareFootage', label: 'Square Footage' },
      { key: 'rentPerSqFt', label: 'Rent Per Sq Ft' },
      { key: 'securityDeposit', label: 'Security Deposit' },
      { key: 'leaseTermMonths', label: 'Lease Term (Months)' },
      { key: 'status', label: 'Status' },
      { key: 'escalationClause', label: 'Escalation Clause' },
      { key: 'renewalOption', label: 'Renewal Option' },
    ];
    const csv = toCSV(leases.map(l => l.toJSON()), columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leases_export.csv');
    res.send(csv);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/escalations', authenticateToken, async (req, res) => {
  try {
    const items = await Escalation.findAll({ order: [['createdAt', 'DESC']] });
    const columns = [
      { key: 'tenantName', label: 'Tenant Name' },
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'currentRent', label: 'Current Rent' },
      { key: 'escalationType', label: 'Escalation Type' },
      { key: 'escalationRate', label: 'Escalation Rate' },
      { key: 'escalationSchedule', label: 'Schedule' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'capRate', label: 'Cap Rate' },
      { key: 'floorRate', label: 'Floor Rate' },
      { key: 'status', label: 'Status' },
    ];
    const csv = toCSV(items.map(i => i.toJSON()), columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=escalations_export.csv');
    res.send(csv);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/negotiations', authenticateToken, async (req, res) => {
  try {
    const items = await Negotiation.findAll({ order: [['createdAt', 'DESC']] });
    const columns = [
      { key: 'tenantName', label: 'Tenant Name' },
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'currentTermEnd', label: 'Current Term End' },
      { key: 'renewalType', label: 'Renewal Type' },
      { key: 'proposedTermMonths', label: 'Proposed Term (Months)' },
      { key: 'currentRent', label: 'Current Rent' },
      { key: 'proposedRent', label: 'Proposed Rent' },
      { key: 'marketRent', label: 'Market Rent' },
      { key: 'tenantImprovementAllowance', label: 'TI Allowance' },
      { key: 'freeRentMonths', label: 'Free Rent Months' },
      { key: 'negotiationStatus', label: 'Status' },
    ];
    const csv = toCSV(items.map(i => i.toJSON()), columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=negotiations_export.csv');
    res.send(csv);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/portfolio', authenticateToken, async (req, res) => {
  try {
    const items = await Portfolio.findAll({ order: [['createdAt', 'DESC']] });
    const columns = [
      { key: 'propertyName', label: 'Property Name' },
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'propertyType', label: 'Property Type' },
      { key: 'totalSquareFootage', label: 'Total Sq Ft' },
      { key: 'occupancyRate', label: 'Occupancy Rate' },
      { key: 'totalUnits', label: 'Total Units' },
      { key: 'occupiedUnits', label: 'Occupied Units' },
      { key: 'annualNOI', label: 'Annual NOI' },
      { key: 'propertyValue', label: 'Property Value' },
      { key: 'capRate', label: 'Cap Rate' },
      { key: 'debtService', label: 'Debt Service' },
      { key: 'dscr', label: 'DSCR' },
      { key: 'market', label: 'Market' },
      { key: 'riskScore', label: 'Risk Score' },
      { key: 'status', label: 'Status' },
    ];
    const csv = toCSV(items.map(i => i.toJSON()), columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=portfolio_export.csv');
    res.send(csv);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/market-comps', authenticateToken, async (req, res) => {
  try {
    const items = await MarketComp.findAll({ order: [['createdAt', 'DESC']] });
    const columns = [
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'propertyType', label: 'Property Type' },
      { key: 'submarket', label: 'Submarket' },
      { key: 'market', label: 'Market' },
      { key: 'squareFootage', label: 'Square Footage' },
      { key: 'askingRentPerSqFt', label: 'Asking Rent/SF' },
      { key: 'effectiveRentPerSqFt', label: 'Effective Rent/SF' },
      { key: 'occupancyRate', label: 'Occupancy Rate' },
      { key: 'buildingClass', label: 'Building Class' },
      { key: 'tenantName', label: 'Tenant' },
      { key: 'transactionDate', label: 'Transaction Date' },
    ];
    const csv = toCSV(items.map(i => i.toJSON()), columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=market_comps_export.csv');
    res.send(csv);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
