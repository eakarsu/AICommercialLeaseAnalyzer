// Simple input validation middleware using plain JS (express-validator style but no extra dep)
// Validates that required fields are present and types are correct.

function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === '');
    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', fields: missing });
    }
    next();
  };
}

function validateLease(req, res, next) {
  const { tenantName, propertyAddress } = req.body;
  const errors = [];
  if (!tenantName || typeof tenantName !== 'string' || tenantName.trim().length === 0) {
    errors.push('tenantName is required and must be a non-empty string');
  }
  if (!propertyAddress || typeof propertyAddress !== 'string' || propertyAddress.trim().length === 0) {
    errors.push('propertyAddress is required and must be a non-empty string');
  }
  if (req.body.monthlyRent !== undefined && isNaN(Number(req.body.monthlyRent))) {
    errors.push('monthlyRent must be a number');
  }
  if (req.body.annualRent !== undefined && isNaN(Number(req.body.annualRent))) {
    errors.push('annualRent must be a number');
  }
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });
  next();
}

function validateExtractTerms(req, res, next) {
  if (!req.body.text || typeof req.body.text !== 'string' || req.body.text.trim().length < 10) {
    return res.status(400).json({ error: 'text is required and must be at least 10 characters' });
  }
  next();
}

function validateLeaseIds(req, res, next) {
  const { lease_ids } = req.body;
  if (!Array.isArray(lease_ids) || lease_ids.length < 2 || lease_ids.length > 3) {
    return res.status(400).json({ error: 'lease_ids must be an array of 2-3 lease IDs' });
  }
  next();
}

function validateLeaseId(req, res, next) {
  if (!req.body.lease_id) {
    return res.status(400).json({ error: 'lease_id is required' });
  }
  next();
}

function validateAlert(req, res, next) {
  const { lease_id, alert_type, alert_date } = req.body;
  const errors = [];
  const allowedTypes = [
    'expiration',
    'option_deadline',
    'rent_bump',
    'custom',
    'renewal',
    'rent_review',
    'escalation',
    'option_exercise',
    'market_threshold',
    'comparable_change',
    'tenant_credit'
  ];
  if (!lease_id) errors.push('lease_id is required');
  if (!alert_type || !allowedTypes.includes(alert_type)) {
    errors.push(`alert_type must be one of: ${allowedTypes.join(', ')}`);
  }
  if (!alert_date || isNaN(Date.parse(alert_date))) {
    errors.push('alert_date must be a valid date string');
  }
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });
  next();
}

module.exports = { requireFields, validateLease, validateExtractTerms, validateLeaseIds, validateLeaseId, validateAlert };
