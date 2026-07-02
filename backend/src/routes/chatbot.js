const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');
const { Lease, Escalation, Negotiation, Portfolio, MarketComp, LeaseAlert, ChatMessage } = require('../models');
const { recordAudit } = require('../utils/audit');

const router = express.Router();

router.use(authenticateToken);

async function saveExchange(req, prompt, response, status = 'completed') {
  try {
    if (!prompt) return null;
    return await ChatMessage.create({
      userId: req.user.id,
      prompt,
      response,
      status,
      source: 'floating_chatbot'
    });
  } catch (error) {
    console.warn('Chat history skipped:', error.message);
    return null;
  }
}

const modelMap = {
  lease: {
    label: 'Lease',
    plural: 'leases',
    model: Lease,
    route: '/leases',
    required: ['tenantName', 'propertyAddress'],
    defaults: () => ({
      tenantName: 'New Tenant',
      propertyAddress: 'Address to confirm',
      propertyType: 'Office',
      leaseType: 'Full Service Gross',
      status: 'Active'
    })
  },
  escalation: {
    label: 'Escalation',
    plural: 'escalations',
    model: Escalation,
    route: '/escalations',
    required: ['tenantName', 'currentRent', 'escalationType'],
    defaults: () => ({
      tenantName: 'Tenant to confirm',
      currentRent: 0,
      escalationType: 'Fixed Percentage',
      escalationSchedule: 'Annual',
      escalationRate: 3,
      status: 'Active'
    })
  },
  negotiation: {
    label: 'Negotiation',
    plural: 'negotiations',
    model: Negotiation,
    route: '/negotiations',
    required: ['tenantName'],
    defaults: () => ({
      tenantName: 'Tenant to confirm',
      renewalType: 'Renewal',
      proposedTermMonths: 60,
      negotiationStatus: 'Pending'
    })
  },
  portfolio: {
    label: 'Portfolio property',
    plural: 'portfolio properties',
    model: Portfolio,
    route: '/portfolio',
    required: ['propertyName', 'propertyAddress'],
    defaults: () => ({
      propertyName: 'New Property',
      propertyAddress: 'Address to confirm',
      propertyType: 'Office',
      occupancyRate: 90,
      status: 'Active'
    })
  },
  marketComp: {
    label: 'Market comp',
    plural: 'market comps',
    model: MarketComp,
    route: '/market-comps',
    required: ['propertyAddress'],
    defaults: () => ({
      propertyAddress: 'Comparable address to confirm',
      propertyType: 'Office',
      market: 'Market to confirm',
      leaseType: 'Comparable lease'
    })
  },
  alert: {
    label: 'Lease alert',
    plural: 'lease alerts',
    model: LeaseAlert,
    route: '/alerts',
    required: ['leaseId', 'alertType', 'alertDate'],
    defaults: () => ({
      leaseId: 1,
      alertType: 'custom',
      alertDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      message: 'Chatbot-created lease alert'
    })
  }
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return normalizeText(value)
    .replace(/[_-]/g, ' ')
    .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1));
}

function toNumber(value, fallback = undefined) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractNumber(text, patterns, fallback) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return toNumber(match[1], fallback);
  }
  return fallback;
}

function extractText(text, patterns, fallback) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return normalizeText(match[1].replace(/[.;]$/, ''));
  }
  return fallback;
}

function extractDate(text, patterns, fallback) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return fallback;
}

function detectTarget(text) {
  const explicit = [
    [/\b(?:create|add|new|insert|make|update|edit|delete|remove|list|show|view)\s+(?:a\s+|an\s+)?(?:commercial\s+)?leases?\b/i, 'lease'],
    [/\b(?:create|add|new|insert|make|update|edit|delete|remove|list|show|view)\s+(?:a\s+|an\s+)?(?:rent\s+)?escalations?\b/i, 'escalation'],
    [/\b(?:create|add|new|insert|make|update|edit|delete|remove|list|show|view)\s+(?:a\s+|an\s+)?negotiations?\b/i, 'negotiation'],
    [/\b(?:create|add|new|insert|make|update|edit|delete|remove|list|show|view)\s+(?:a\s+|an\s+)?(?:portfolio|property|asset)\b/i, 'portfolio'],
    [/\b(?:create|add|new|insert|make|update|edit|delete|remove|list|show|view)\s+(?:a\s+|an\s+)?(?:market\s*)?comps?\b/i, 'marketComp'],
    [/\b(?:create|add|new|insert|make|update|edit|delete|remove|list|show|view)\s+(?:a\s+|an\s+)?(?:lease\s+)?alerts?\b/i, 'alert']
  ];
  const hit = explicit.find(([pattern]) => pattern.test(text));
  if (hit) return hit[1];

  if (/\b(market\s*comps?|comparables?|comps?)\b/i.test(text)) return 'marketComp';
  if (/\b(portfolios?|properties|property|assets?|buildings?)\b/i.test(text)) return 'portfolio';
  if (/\b(escalations?|rent bumps?|increases?)\b/i.test(text)) return 'escalation';
  if (/\b(negotiations?|renewals?|counteroffers?|counter offers?|term sheets?)\b/i.test(text)) return 'negotiation';
  if (/\b(alerts?|reminders?|deadlines?|calendar)\b/i.test(text)) return 'alert';
  if (/\b(leases?|tenants?)\b/i.test(text)) return 'lease';
  return null;
}

function detectAIWorkflow(text) {
  if (/\b(ai lab|run ai|analy[sz]e|analysis|audit|comparison|compare|sublease|early termination|termination|extract clauses?|stress test|stress)\b/i.test(text)) {
    if (/\b(compare|comparison)\b/i.test(text)) return 'leaseComparison';
    if (/\bsublease\b/i.test(text)) return 'sublease';
    if (/\b(early termination|termination|exit)\b/i.test(text)) return 'earlyTermination';
    if (/\b(audit|missing provisions?|unfavorable clauses?)\b/i.test(text)) return 'leaseAudit';
    if (/\b(extract clauses?|clause extraction|clauses?)\b/i.test(text)) return 'extractClauses';
    if (/\b(stress test|stress|vacancy shock|rent shock)\b/i.test(text)) return 'stressTest';
  }
  return null;
}

function detectAction(text) {
  if (/\b(delete|remove|destroy)\b/i.test(text)) return 'delete';
  if (/\b(update|edit|change|set)\b/i.test(text)) return 'update';
  if (/\b(list|show|display|open|view)\b/i.test(text)) return 'list';
  if (/\b(create|add|new|insert|make)\b/i.test(text)) return 'create';
  return 'help';
}

function extractId(text) {
  return extractNumber(text, [
    /\b(?:id|record)\s*#?\s*(\d+)\b/i,
    /#(\d+)\b/
  ]);
}

function extractIds(text) {
  const explicit = [...String(text).matchAll(/\b(?:id|lease)\s*#?\s*(\d+)\b/gi)].map((match) => Number(match[1]));
  const commaList = String(text).match(/\bids?\s+([\d,\s]+)/i);
  const fromList = commaList ? commaList[1].split(/[\s,]+/).map(Number).filter(Number.isFinite) : [];
  return [...new Set([...explicit, ...fromList])].filter(Boolean);
}

function parseLease(text, payload = {}) {
  const tenantName = extractText(text, [
    /\b(?:tenant|for)\s+["']([^"']+)["']/i,
    /\b(?:tenant|for)\s+(.+?)\s+\bat\b/i,
    /\bcreate\s+lease\s+for\s+(.+?)(?:\s+at\b|,|$)/i
  ]);
  const propertyAddress = extractText(text, [
    /\bat\s+["']([^"']+)["']/i,
    /\bat\s+(.+?)(?:\s+(?:monthly|rent|for|from|starting|ending|with)\b|$)/i,
    /\baddress\s+(.+?)(?:,|$)/i
  ]);
  const monthlyRent = extractNumber(text, [
    /\bmonthly\s+rent\s+\$?([\d,]+(?:\.\d+)?)/i,
    /\brent\s+\$?([\d,]+(?:\.\d+)?)\s*(?:\/?\s*mo|per month|monthly)?/i
  ]);
  const squareFootage = extractNumber(text, [
    /\b([\d,]+)\s*(?:sf|sq\s*ft|square feet)\b/i,
    /\bsquare\s+footage\s+([\d,]+)/i
  ]);
  const startDate = extractDate(text, [/\b(?:start|starts|commencement)\s+(\d{4}-\d{2}-\d{2})/i]);
  const endDate = extractDate(text, [/\b(?:end|ends|expires|expiration)\s+(\d{4}-\d{2}-\d{2})/i]);
  const leaseType = extractText(text, [/\b(?:lease type|type)\s+([a-z ]+?)(?:,|$)/i]);
  const propertyType = extractText(text, [/\b(?:property type|asset type)\s+([a-z ]+?)(?:,|$)/i]);
  const escalationClause = extractText(text, [/\b(?:escalation|increase)\s+(.+?)(?:,|$)/i]);
  const renewalOption = extractText(text, [/\brenewal\s+(.+?)(?:,|$)/i]);

  const data = {
    tenantName,
    propertyAddress,
    monthlyRent,
    annualRent: monthlyRent ? monthlyRent * 12 : undefined,
    squareFootage,
    rentPerSqFt: monthlyRent && squareFootage ? ((monthlyRent * 12) / squareFootage).toFixed(2) : undefined,
    startDate,
    endDate,
    leaseType: leaseType ? titleCase(leaseType) : undefined,
    propertyType: propertyType ? titleCase(propertyType) : undefined,
    escalationClause,
    renewalOption,
    specialProvisions: extractText(text, [/\b(?:notes|special provisions)\s+(.+)$/i])
  };
  return { ...data, ...payload };
}

function parseEscalation(text, payload = {}) {
  const currentRent = extractNumber(text, [
    /\bcurrent\s+rent\s+\$?([\d,]+(?:\.\d+)?)/i,
    /\brent\s+\$?([\d,]+(?:\.\d+)?)/i
  ]);
  const escalationRate = extractNumber(text, [
    /\brate\s+([\d.]+)\s*%/i,
    /\b([\d.]+)\s*%\s+(?:annual|fixed|increase|escalation)/i
  ]);
  return {
    tenantName: extractText(text, [/\b(?:tenant|for)\s+(.+?)(?:\s+(?:current|rent|rate|at)\b|,|$)/i]),
    propertyAddress: extractText(text, [/\bat\s+(.+?)(?:\s+(?:current|rent|rate)\b|,|$)/i]),
    currentRent,
    escalationType: /cpi/i.test(text) ? 'CPI' : 'Fixed Percentage',
    escalationRate,
    escalationSchedule: /monthly/i.test(text) ? 'Monthly' : 'Annual',
    startDate: extractDate(text, [/\b(?:start|starts)\s+(\d{4}-\d{2}-\d{2})/i]),
    endDate: extractDate(text, [/\b(?:end|ends)\s+(\d{4}-\d{2}-\d{2})/i]),
    notes: extractText(text, [/\bnotes?\s+(.+)$/i]),
    ...payload
  };
}

function parseNegotiation(text, payload = {}) {
  return {
    tenantName: extractText(text, [/\b(?:tenant|for)\s+(.+?)(?:\s+(?:current|proposed|market|renewal|at)\b|,|$)/i]),
    propertyAddress: extractText(text, [/\bat\s+(.+?)(?:\s+(?:current|proposed|market|renewal)\b|,|$)/i]),
    currentRent: extractNumber(text, [/\bcurrent\s+rent\s+\$?([\d,]+(?:\.\d+)?)/i]),
    proposedRent: extractNumber(text, [/\bproposed\s+rent\s+\$?([\d,]+(?:\.\d+)?)/i]),
    marketRent: extractNumber(text, [/\bmarket\s+rent\s+\$?([\d,]+(?:\.\d+)?)/i]),
    proposedTermMonths: extractNumber(text, [/\b(?:term|proposed term)\s+(\d+)\s*(?:months|mo)/i]),
    tenantImprovementAllowance: extractNumber(text, [/\b(?:ti|tenant improvement)\s+\$?([\d,]+(?:\.\d+)?)/i]),
    freeRentMonths: extractNumber(text, [/\bfree\s+rent\s+(\d+)\s*(?:months|mo)/i]),
    landlordPriorities: extractText(text, [/\blandlord priorities\s+(.+?)(?:;|$)/i]),
    tenantPriorities: extractText(text, [/\btenant priorities\s+(.+?)(?:;|$)/i]),
    notes: extractText(text, [/\bnotes?\s+(.+)$/i]),
    ...payload
  };
}

function parsePortfolio(text, payload = {}) {
  const propertyName = extractText(text, [
    /\b(?:property|asset)\s+["']([^"']+)["']/i,
    /\b(?:property|asset)\s+(.+?)\s+\bat\b/i
  ]);
  return {
    propertyName,
    propertyAddress: extractText(text, [/\bat\s+(.+?)(?:\s+(?:value|noi|occupancy|market|type)\b|,|$)/i]),
    propertyType: titleCase(extractText(text, [/\btype\s+([a-z ]+?)(?:,|$)/i], 'Office')),
    totalSquareFootage: extractNumber(text, [/\b([\d,]+)\s*(?:sf|sq\s*ft|square feet)\b/i]),
    occupancyRate: extractNumber(text, [/\boccupancy\s+([\d.]+)\s*%/i]),
    annualNOI: extractNumber(text, [/\b(?:noi|annual noi)\s+\$?([\d,]+(?:\.\d+)?)/i]),
    propertyValue: extractNumber(text, [/\bvalue\s+\$?([\d,]+(?:\.\d+)?)/i]),
    capRate: extractNumber(text, [/\bcap\s+rate\s+([\d.]+)\s*%/i]),
    market: extractText(text, [/\bmarket\s+(.+?)(?:,|$)/i]),
    riskScore: extractNumber(text, [/\brisk\s+score\s+([\d.]+)/i]),
    ...payload
  };
}

function parseMarketComp(text, payload = {}) {
  const askingRentPerSqFt = extractNumber(text, [
    /\basking\s+rent\s+\$?([\d.]+)\s*(?:\/?\s*sf|per sf)?/i,
    /\brent\s+\$?([\d.]+)\s*(?:\/?\s*sf|per sf)/i
  ]);
  return {
    propertyAddress: extractText(text, [/\bat\s+(.+?)(?:\s+(?:asking|effective|market|submarket|class|type)\b|,|$)/i]),
    propertyType: titleCase(extractText(text, [/\btype\s+([a-z ]+?)(?:,|$)/i], 'Office')),
    submarket: extractText(text, [/\bsubmarket\s+(.+?)(?:,|$)/i]),
    market: extractText(text, [/\bmarket\s+(.+?)(?:,|$)/i]),
    squareFootage: extractNumber(text, [/\b([\d,]+)\s*(?:sf|sq\s*ft|square feet)\b/i]),
    askingRentPerSqFt,
    effectiveRentPerSqFt: extractNumber(text, [/\beffective\s+rent\s+\$?([\d.]+)/i], askingRentPerSqFt),
    occupancyRate: extractNumber(text, [/\boccupancy\s+([\d.]+)\s*%/i]),
    buildingClass: extractText(text, [/\bclass\s+([abc])\b/i]),
    source: 'Chatbot',
    ...payload
  };
}

function parseAlert(text, payload = {}) {
  return {
    leaseId: extractNumber(text, [/\blease\s+(?:id\s*)?#?\s*(\d+)/i], 1),
    alertType: /expir/i.test(text) ? 'expiration' : /option/i.test(text) ? 'option_deadline' : /rent|bump/i.test(text) ? 'rent_bump' : 'custom',
    alertDate: extractDate(text, [/\b(?:on|date|for)\s+(\d{4}-\d{2}-\d{2})/i]),
    message: normalizeText(text) || 'Chatbot-created lease alert',
    ...payload
  };
}

const parsers = {
  lease: parseLease,
  escalation: parseEscalation,
  negotiation: parseNegotiation,
  portfolio: parsePortfolio,
  marketComp: parseMarketComp,
  alert: parseAlert
};

function cleanPayload(target, data) {
  const defaults = modelMap[target].defaults();
  const merged = { ...defaults, ...data };
  Object.keys(merged).forEach((key) => {
    if (merged[key] === undefined || merged[key] === null || merged[key] === '') delete merged[key];
  });
  return merged;
}

async function listRecords(target) {
  const config = modelMap[target];
  const rows = await config.model.findAll({ order: [['createdAt', 'DESC']], limit: 8 });
  return rows.map((row) => row.toJSON());
}

function summarizeRecord(target, record) {
  const item = typeof record.toJSON === 'function' ? record.toJSON() : record;
  const title = item.tenantName || item.propertyName || item.propertyAddress || `${modelMap[target].label} #${item.id}`;
  return {
    id: item.id,
    title,
    route: `${modelMap[target].route}`,
    record: item
  };
}

function helpResponse() {
  return {
    action: 'help',
    message: 'I can create, list, update, and delete lease records, and I can run AI Lab workflows from chat.',
    examples: [
      'Create lease for Acme Corp at 100 Market St monthly rent 45000 12000 sf start 2026-01-01 end 2031-12-31.',
      'Add escalation for Acme Corp current rent 45000 rate 3% annual.',
      'Create portfolio property Market Tower at 100 Market St value 12000000 NOI 850000 occupancy 92%.',
      'List market comps.',
      'Update lease id 3 monthly rent 52000.',
      'Delete alert id 8.',
      'Run lease comparison for ids 1, 2, 3.',
      'Run lease audit for lease id 1.',
      'Analyze sublease for lease id 2.',
      'Run portfolio stress test.'
    ],
    supportedTables: Object.values(modelMap).map((config) => config.plural),
    supportedAIWorkflows: ['lease comparison', 'sublease analysis', 'early termination', 'lease audit', 'clause extraction', 'portfolio stress test']
  };
}

async function postInternal(req, path, body) {
  const port = process.env.BACKEND_PORT || 4001;
  const response = await axios.post(`http://localhost:${port}/api${path}`, body, {
    headers: {
      Authorization: req.headers.authorization || '',
      'Content-Type': 'application/json'
    },
    timeout: Number(process.env.CHATBOT_INTERNAL_TIMEOUT_MS || 45000)
  });
  return response.data;
}

function summarizeAIValue(value) {
  if (!value) return 'AI workflow completed.';
  if (value.summary) return value.summary;
  if (value.executiveSummary) return value.executiveSummary;
  if (value.viabilitySummary) return value.viabilitySummary;
  if (value.performanceSummary) return value.performanceSummary;
  if (value.recommendations) {
    if (Array.isArray(value.recommendations)) return `AI workflow completed with ${value.recommendations.length} recommendations.`;
    if (value.recommendations.rationale) return value.recommendations.rationale;
  }
  return 'AI workflow completed and returned structured analysis.';
}

async function runAIWorkflow(req, message, workflow, payload = {}) {
  const ids = payload.lease_ids || extractIds(message);
  const firstLease = await Lease.findByPk(payload.lease_id || ids[0] || 1);
  const leases = ids.length >= 2
    ? await Lease.findAll({ where: { id: ids.slice(0, 3) } })
    : await Lease.findAll({ order: [['monthlyRent', 'DESC']], limit: 3 });
  const portfolios = await Portfolio.findAll({ order: [['riskScore', 'DESC']], limit: 1 });
  const leaseSnapshot = firstLease?.toJSON ? firstLease.toJSON() : firstLease;

  let endpoint;
  let body;
  let label;

  if (workflow === 'leaseComparison') {
    endpoint = '/ai/lease-comparison';
    label = 'Lease comparison';
    body = {
      lease_ids: leases.map((lease) => lease.id),
      lease_snapshots: leases.map((lease) => lease.toJSON())
    };
  } else if (workflow === 'sublease') {
    endpoint = '/ai/sublease-analysis';
    label = 'Sublease analysis';
    body = {
      lease_id: firstLease?.id || 1,
      lease_snapshot: leaseSnapshot,
      sublease_terms: payload.sublease_terms || 'Evaluate landlord consent, recapture, economics, use restrictions, insurance, assignment/sublease flow-down obligations, and required draft provisions.'
    };
  } else if (workflow === 'earlyTermination') {
    endpoint = '/ai/early-termination';
    label = 'Early termination analysis';
    body = {
      lease_id: firstLease?.id || 1,
      lease_snapshot: leaseSnapshot,
      exit_scenario: payload.exit_scenario || 'Tenant wants to evaluate early exit, remaining rent exposure, mitigation strategy, termination fee, landlord negotiation points, and risk timeline.'
    };
  } else if (workflow === 'leaseAudit') {
    endpoint = '/ai/lease-audit';
    label = 'Lease audit';
    body = { lease_id: firstLease?.id || 1, lease_snapshot: leaseSnapshot };
  } else if (workflow === 'extractClauses') {
    endpoint = '/ai/extract-clauses';
    label = 'Clause extraction';
    body = {
      lease_id: firstLease?.id || 1,
      lease_snapshot: leaseSnapshot,
      focus: payload.focus || 'CAM, operating expenses, tax pass-throughs, assignment/subletting, renewal, termination, default, insurance, audit rights',
      document_text: payload.document_text || JSON.stringify(leaseSnapshot || {}, null, 2)
    };
  } else if (workflow === 'stressTest') {
    endpoint = '/ai/analyze-portfolio';
    label = 'Portfolio stress test';
    const portfolio = portfolios[0]?.toJSON ? portfolios[0].toJSON() : {};
    body = {
      ...portfolio,
      scenario: payload.scenario || 'Model downside stress from 10% rent decline, 15% vacancy, cap rate expansion, debt service pressure, and delayed renewals.'
    };
  }

  if (!endpoint) return helpResponse();

  const result = await postInternal(req, endpoint, body);
  const value = result.analysis || result.comparison || result.audit || result.clauses || result;
  await recordAudit(req, {
    action: 'run_ai',
    entityType: 'chatbot',
    entityId: workflow,
    title: `Chatbot ran ${label}`,
    source: 'chatbot',
    details: { workflow, endpoint, provider: result.provider || value.provider || 'openrouter' }
  });

  return {
    action: 'run_ai',
    target: 'aiLab',
    workflow,
    message: `${label} completed. ${summarizeAIValue(value)}`,
    provider: result.provider || value.provider || 'openrouter',
    result: value
  };
}

router.post('/message', async (req, res) => {
  try {
    const message = normalizeText(req.body.message);
    const payload = req.body.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    const aiWorkflow = req.body.workflow || detectAIWorkflow(message);
    if (aiWorkflow) {
      const response = await runAIWorkflow(req, message, aiWorkflow, payload);
      await saveExchange(req, message, response);
      return res.json(response);
    }

    const explicitTarget = req.body.target;
    const target = modelMap[explicitTarget] ? explicitTarget : detectTarget(message);
    const action = req.body.action || detectAction(message);

    if (!message && !Object.keys(payload).length) {
      return res.status(400).json({ error: 'message or payload is required' });
    }
    if (!target || !modelMap[target]) {
      const response = helpResponse();
      await saveExchange(req, message, response);
      return res.json(response);
    }

    const config = modelMap[target];
    const parser = parsers[target];
    const parsed = parser ? parser(message, payload) : payload;

    if (action === 'list') {
      const rows = await listRecords(target);
      const response = {
        action,
        target,
        message: `Showing the latest ${rows.length} ${config.plural}.`,
        items: rows.map((row) => summarizeRecord(target, row))
      };
      await saveExchange(req, message, response);
      return res.json(response);
    }

    if (action === 'delete') {
      const id = req.body.id || extractId(message);
      if (!id) return res.status(400).json({ error: `Tell me which ${config.label.toLowerCase()} id to delete.` });
      const row = await config.model.findByPk(id);
      if (!row) return res.status(404).json({ error: `${config.label} not found` });
      await row.destroy();
      await recordAudit(req, {
        action: 'delete',
        entityType: target,
        entityId: id,
        title: `Chatbot deleted ${config.label.toLowerCase()} #${id}`,
        source: 'chatbot'
      });
      const response = {
        action,
        target,
        message: `${config.label} #${id} was deleted.`,
        deletedId: Number(id)
      };
      await saveExchange(req, message, response);
      return res.json(response);
    }

    if (action === 'update') {
      const id = req.body.id || extractId(message);
      if (!id) return res.status(400).json({ error: `Tell me which ${config.label.toLowerCase()} id to update.` });
      const row = await config.model.findByPk(id);
      if (!row) return res.status(404).json({ error: `${config.label} not found` });
      const updateData = cleanPayload(target, parsed);
      config.required.forEach((key) => {
        if (updateData[key] === config.defaults()[key]) delete updateData[key];
      });
      await row.update(updateData);
      await recordAudit(req, {
        action: 'update',
        entityType: target,
        entityId: id,
        title: `Chatbot updated ${config.label.toLowerCase()} #${id}`,
        source: 'chatbot',
        details: { fields: Object.keys(updateData) }
      });
      const response = {
        action,
        target,
        message: `${config.label} #${id} was updated.`,
        item: summarizeRecord(target, row)
      };
      await saveExchange(req, message, response);
      return res.json(response);
    }

    if (action === 'create') {
      const data = cleanPayload(target, parsed);
      const missing = config.required.filter((key) => data[key] === undefined || data[key] === null || data[key] === '');
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missing.join(', ')}`,
          parsed: data
        });
      }
      const row = await config.model.create(data);
      await recordAudit(req, {
        action: 'create',
        entityType: target,
        entityId: row.id,
        title: `Chatbot created ${config.label.toLowerCase()} #${row.id}`,
        source: 'chatbot',
        details: { fields: Object.keys(data) }
      });
      const response = {
        action,
        target,
        message: `${config.label} was created and added to ${config.plural}.`,
        item: summarizeRecord(target, row)
      };
      await saveExchange(req, message, response);
      return res.status(201).json(response);
    }

    const response = helpResponse();
    await saveExchange(req, message, response);
    return res.json(response);
  } catch (error) {
    await saveExchange(req, normalizeText(req.body.message), { action: 'error', message: error.message }, 'failed');
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const rows = await ChatMessage.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/history', async (req, res) => {
  try {
    const deleted = await ChatMessage.destroy({ where: { userId: req.user.id } });
    await recordAudit(req, {
      action: 'delete',
      entityType: 'chatbot',
      entityId: 'history',
      title: 'Cleared chatbot conversation history',
      source: 'chatbot',
      details: { deleted }
    });
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
