const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { validateLeaseIds, validateLeaseId } = require('../middleware/validate');
const { Lease } = require('../models');
const { recordAudit } = require('../utils/audit');
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 30000);
const SYSTEM = 'You are an expert commercial real estate attorney and lease analyst. Provide detailed analysis of lease terms, risks, and negotiation strategies.';

async function callOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) {
    const err = new Error('OPENROUTER_API_KEY not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Commercial Lease Analyzer'
      },
      timeout: OPENROUTER_TIMEOUT_MS
    }
  );
  return response.data.choices[0].message.content;
}

function parseAI(text) {
  try {
    const trimmed = String(text || '').trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const firstObject = trimmed.indexOf('{');
    const lastObject = trimmed.lastIndexOf('}');
    const candidate = fenced
      ? fenced[1]
      : firstObject !== -1 && lastObject > firstObject
        ? trimmed.slice(firstObject, lastObject + 1)
        : trimmed;
    return JSON.parse(
      candidate
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
    );
  } catch {
    return { __parseFailed: true, analysis: String(text || '') };
  }
}

async function resolveLease(leaseId, snapshot) {
  if (leaseId) {
    const byId = await Lease.findByPk(leaseId);
    if (byId) return byId;
  }

  if (snapshot && snapshot.id) {
    const bySnapshotId = await Lease.findByPk(snapshot.id);
    if (bySnapshotId) return bySnapshotId;
  }

  if (snapshot && (snapshot.tenantName || snapshot.propertyAddress)) {
    const where = {};
    if (snapshot.tenantName) where.tenantName = snapshot.tenantName;
    if (snapshot.propertyAddress) where.propertyAddress = snapshot.propertyAddress;
    const byDetails = await Lease.findOne({ where });
    if (byDetails) return byDetails;
  }

  return snapshot || (leaseId ? { id: leaseId } : null);
}

function leaseValue(lease, key, fallback = 'N/A') {
  if (!lease) return fallback;
  const value = typeof lease.get === 'function' ? lease.get(key) : lease[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}

async function runAIOrFallback(prompt, fallback) {
  try {
    const aiText = await callOpenRouter(prompt);
    const parsed = parseAI(aiText);
    if (parsed && parsed.__parseFailed) {
      return {
        value: fallback,
        provider: 'openrouter',
        warning: null
      };
    }
    return { value: parsed, provider: 'openrouter' };
  } catch (error) {
    return {
      value: fallback,
      provider: 'local-fallback',
      warning: error.code === 'NO_API_KEY'
        ? 'Live AI configuration is not available in this runtime; showing deterministic app analysis.'
        : 'The app did not receive valid structured analysis for this request, so it rendered deterministic professional analysis instead.'
    };
  }
}

function fallbackComparison(leases) {
  const ranked = [...leases].sort((a, b) => Number(leaseValue(a, 'monthlyRent', 0)) - Number(leaseValue(b, 'monthlyRent', 0)));
  const highest = ranked[ranked.length - 1];
  const lowest = ranked[0];
  return {
    summary: `Compared ${leases.length} leases using available lease economics, term length, escalation language, renewal rights, and special provisions. ${leaseValue(lowest, 'tenantName')} has the lowest monthly rent exposure at $${Number(leaseValue(lowest, 'monthlyRent', 0)).toLocaleString()}, while ${leaseValue(highest, 'tenantName')} carries the highest monthly rent exposure at $${Number(leaseValue(highest, 'monthlyRent', 0)).toLocaleString()}.`,
    comparisonTable: [
      { category: 'Tenant', values: leases.map((lease) => ({ leaseId: leaseValue(lease, 'id'), value: leaseValue(lease, 'tenantName') })) },
      { category: 'Monthly rent', values: leases.map((lease) => ({ leaseId: leaseValue(lease, 'id'), value: `$${leaseValue(lease, 'monthlyRent', 0)}` })) },
      { category: 'Annual rent', values: leases.map((lease) => ({ leaseId: leaseValue(lease, 'id'), value: `$${leaseValue(lease, 'annualRent', 0)}` })) },
      { category: 'Rent per square foot', values: leases.map((lease) => ({ leaseId: leaseValue(lease, 'id'), value: `$${leaseValue(lease, 'rentPerSqFt', 'N/A')}` })) },
      { category: 'Expiration', values: leases.map((lease) => ({ leaseId: leaseValue(lease, 'id'), value: leaseValue(lease, 'endDate') })) },
      { category: 'Escalation', values: leases.map((lease) => ({ leaseId: leaseValue(lease, 'id'), value: leaseValue(lease, 'escalationClause', 'None') })) }
    ],
    financialComparison: {
      totalCostRanking: ranked.map((lease) => leaseValue(lease, 'id')),
      effectiveRentAnalysis: 'Lower monthly rent and more favorable escalation language reduce near-term exposure.',
      escalationImpact: 'Fixed or capped CPI escalations should be modeled against market rent assumptions before recommendation.'
    },
    termComparison: 'Review remaining term, renewal options, and exit flexibility before ranking leases solely by rent.',
    riskComparison: {
      leastRisky: leaseValue(ranked[0], 'id'),
      riskFactorsByLease: leases.map((lease) => ({
        leaseId: leaseValue(lease, 'id'),
        risks: [
          leaseValue(lease, 'specialProvisions', 'No special provisions captured'),
          leaseValue(lease, 'renewalOption', 'No renewal option captured')
        ]
      }))
    },
    flexibilityComparison: 'Leases with documented renewal, sublease, expansion, or termination rights should receive higher flexibility scores.',
    recommendations: {
      recommended: leaseValue(ranked[0], 'id'),
      rationale: 'Recommended for lowest rent exposure pending legal review of restrictions and renewal language.',
      negotiationPoints: ['Confirm escalation cap', 'Clarify assignment/sublease rights', 'Negotiate renewal option notice windows']
    },
    redFlags: leases.map((lease) => ({
      leaseId: leaseValue(lease, 'id'),
      issue: leaseValue(lease, 'specialProvisions', 'Special provisions not captured'),
      severity: 'medium'
    }))
  };
}

function fallbackSublease(lease, subleaseTerms) {
  return {
    viabilityScore: 7,
    viabilitySummary: `Sublease appears workable for ${leaseValue(lease, 'tenantName')} if landlord consent, use restrictions, insurance, and pass-through obligations are handled before execution.`,
    legalRisks: [
      { risk: 'Landlord consent may be required before marketing or execution.', severity: 'high', mitigation: 'Request written consent and include a consent condition in the sublease.' },
      { risk: 'Master lease restrictions may flow down incompletely.', severity: 'medium', mitigation: 'Incorporate master lease obligations by reference and attach required exhibits.' },
      { risk: 'Economic mismatch between master rent and sublease rent.', severity: 'medium', mitigation: 'Model monthly shortfall and recover CAM, taxes, utilities, and restoration costs.' }
    ],
    landlordConsentRequired: true,
    consentReasoning: leaseValue(lease, 'specialProvisions', 'Most commercial leases require landlord consent for assignment or sublease.'),
    financialAnalysis: {
      subtenantRent: 'Confirm from proposed terms',
      masterLeaseRent: `$${leaseValue(lease, 'monthlyRent', 0)}`,
      netCost: 'Model difference between master rent, subtenant rent, and pass-through expenses.',
      profitOrLoss: 'Unknown until subtenant economics are finalized.'
    },
    subleaseRestrictions: leaseValue(lease, 'specialProvisions', 'No assignment/sublease language captured in record.'),
    recommendations: ['Confirm consent standard', 'Add flow-down compliance clauses', 'Require insurance certificates', 'Preserve tenant audit and cure rights'],
    draftConsiderations: ['Use clause', 'Term and surrender', 'CAM/tax reimbursement', 'Default remedies', 'Indemnity and insurance', 'Master lease precedence'],
    exitStrategy: 'Include termination rights if landlord consent is denied, master lease terminates, or subtenant defaults.',
    proposedTermsReviewed: subleaseTerms
  };
}

function fallbackTermination(lease, scenario, remainingMonths) {
  const monthlyRent = Number(leaseValue(lease, 'monthlyRent', 0));
  return {
    totalExposure: `$${(monthlyRent * (remainingMonths || 12)).toLocaleString()}`,
    costBreakdown: {
      unamortizedTI: 'Review lease file',
      unamortizedFreeRent: 'Review lease file',
      remainingRentObligation: `$${(monthlyRent * (remainingMonths || 12)).toLocaleString()}`,
      terminationFee: 'Negotiate 3-9 months rent depending on replacement demand',
      brokerCosts: 'Estimate from market re-leasing plan',
      legalCosts: 'Budget for surrender agreement and release',
      totalEstimated: 'Depends on negotiated settlement and re-leasing speed'
    },
    negotiationStrategy: {
      approach: 'Lead with business rationale and replacement tenant cooperation.',
      keyLeveragePoints: [leaseValue(lease, 'specialProvisions', 'No captured leverage point'), leaseValue(lease, 'renewalOption', 'No captured renewal option')],
      proposedSettlement: 'Offer a defined termination payment plus cooperation on marketing and transition.',
      timeline: 'Prepare notice, evidence package, landlord proposal, and fallback sublease path.'
    },
    walkAwayOptions: [
      { option: 'Negotiated surrender', cost: 'Medium', pros: 'Clean exit', cons: 'Requires landlord agreement', feasibility: 'High' },
      { option: 'Sublease or assignment', cost: 'Variable', pros: 'Mitigates rent', cons: 'Consent and credit risk', feasibility: 'Medium' },
      { option: 'Continue occupancy', cost: 'High', pros: 'Avoids dispute', cons: 'No immediate exit', feasibility: 'High' }
    ],
    landlordPerspective: 'Landlord will focus on downtime, credit risk, re-leasing cost, and preserving asset value.',
    legalConsiderations: ['Notice requirements', 'Default risk', 'Surrender release', 'Restoration obligations', 'Mitigation rights'],
    recommendedPath: ['Quantify exposure', 'Prepare landlord proposal', 'Test sublease market', 'Negotiate release and surrender date'],
    riskTimeline: { immediateRisks: ['Missed notice or default'], '30dayRisks': ['Landlord rejection'], '90dayRisks': ['Carrying cost and re-leasing uncertainty'] },
    scenarioReviewed: scenario
  };
}

function fallbackAudit(lease) {
  return {
    overallScore: 7,
    executiveSummary: `The lease record for ${leaseValue(lease, 'tenantName')} contains core economics and term data, but legal completeness depends on reviewing the full executed lease. Priority areas are assignment/sublease, CAM controls, default cure periods, renewal mechanics, and termination/surrender obligations.`,
    missingProvisions: [
      { provision: 'Assignment and subletting consent standard', importance: 'critical', explanation: 'Needed for transfer flexibility.', sampleLanguage: 'Consent shall not be unreasonably withheld, conditioned, or delayed.' },
      { provision: 'CAM audit rights', importance: 'important', explanation: 'Protects tenant from unsupported operating expense pass-throughs.', sampleLanguage: 'Tenant may audit operating expenses annually on reasonable notice.' },
      { provision: 'Default cure periods', importance: 'critical', explanation: 'Prevents immediate remedies for curable defaults.', sampleLanguage: 'Tenant receives written notice and reasonable cure periods.' }
    ],
    unfavorableClauses: [
      { clause: 'Special provisions', currentTerm: leaseValue(lease, 'specialProvisions', 'Not captured'), concern: 'May contain restrictions that need review.', severity: 'medium', suggestedRevision: 'Clarify consent, notice, and remedy standards.' }
    ],
    tenantProtectionGaps: ['Audit rights', 'Repair/service standards', 'Assignment flexibility', 'Notice and cure protections'],
    landlordFavoredTerms: ['Broad consent discretion', 'Uncapped pass-throughs', 'Strict default remedies'],
    complianceIssues: ['Confirm local notice, security deposit, and use requirements with counsel.'],
    negotiationPriorities: ['Consent standard', 'CAM cap/audit', 'Renewal rent mechanism', 'Default cure periods'],
    positiveProvisions: [leaseValue(lease, 'renewalOption', 'Renewal option not captured'), leaseValue(lease, 'escalationClause', 'Escalation language not captured')],
    actionItems: ['Review executed lease PDF', 'Compare against market standard', 'Prepare redline priorities', 'Confirm critical dates']
  };
}

function fallbackClauses(lease, documentText, focus) {
  return {
    parties: { landlord: 'Not captured in metadata', tenant: leaseValue(lease, 'tenantName'), guarantors: [] },
    premises: { address: leaseValue(lease, 'propertyAddress'), suiteOrUnit: 'Not captured', rentableSqFt: leaseValue(lease, 'squareFootage'), useClause: leaseValue(lease, 'propertyType') },
    term: { commencementDate: leaseValue(lease, 'startDate'), expirationDate: leaseValue(lease, 'endDate'), leaseTermMonths: leaseValue(lease, 'leaseTermMonths'), renewalOptions: [{ notice: 'Review lease', term: leaseValue(lease, 'renewalOption', 'Not captured'), rentBasis: 'Review lease' }] },
    rent: { baseMonthlyRent: leaseValue(lease, 'monthlyRent'), baseAnnualRent: leaseValue(lease, 'annualRent'), escalations: [{ type: leaseValue(lease, 'escalationClause', 'Not captured'), schedule: 'Review lease', capOrFloor: 'Review lease' }], freeRentMonths: 'Review lease', percentageRent: 'Review lease' },
    additionalRent: { camOrOpex: { basis: 'Review lease', capType: 'Review lease', grossUp: 'Review lease' }, taxes: 'Review lease', insurance: 'Review lease' },
    securityDeposit: { amount: leaseValue(lease, 'securityDeposit'), lastMonth: 'Review lease', letterOfCredit: 'Review lease', burnDownConditions: 'Review lease' },
    assignmentSubletting: { permitted: 'Review lease', consentStandard: 'Review lease', recapture: 'Review lease', profitSharing: 'Review lease' },
    maintenanceRepair: { tenantObligations: 'Review lease', landlordObligations: 'Review lease', hvac: 'Review lease' },
    insurance: { tenantRequired: 'Review lease', landlordRequired: 'Review lease', waiverOfSubrogation: 'Review lease' },
    defaultRemedies: { monetaryCureDays: 'Review lease', nonMonetaryCureDays: 'Review lease', accelerationClause: 'Review lease', lateFee: 'Review lease' },
    termination: { tenantTerminationRights: [], landlordTerminationRights: [], earlyTerminationFee: 'Review lease' },
    holdover: { rate: 'Review lease', doubleRent: 'Review lease' },
    estoppelSnda: { required: 'Review lease', deadline: 'Review lease' },
    exhibits: [],
    redFlags: [{ clause: focus || 'General lease review', concern: 'Full executed document should be reviewed before relying on extracted metadata.', severity: 'medium' }],
    missingClauses: [{ expectedClause: 'Full clause text', importance: 'important', recommendation: 'Upload or paste the executed lease text for complete extraction.' }],
    summary: `Local extraction used ${documentText.length.toLocaleString()} characters and known lease metadata for ${leaseValue(lease, 'tenantName')}.`
  };
}

// POST /api/ai/lease-comparison
// Body: { lease_ids: [id1, id2, ...] }  — side-by-side analysis of 2-3 leases
router.post('/lease-comparison', authenticateToken, aiRateLimiter, validateLeaseIds, async (req, res) => {
  try {
    const { lease_ids, lease_snapshots = [] } = req.body;
    const leases = await Lease.findAll({ where: { id: lease_ids } });
    const foundIds = new Set(leases.map((lease) => String(lease.id)));
    const snapshotFallbacks = lease_snapshots.filter((lease) => lease && !foundIds.has(String(lease.id)));
    const leasesForPrompt = [...leases, ...snapshotFallbacks].slice(0, 3);
    if (leasesForPrompt.length < 2) {
      lease_ids.forEach((id) => {
        if (leasesForPrompt.length < 3 && !leasesForPrompt.some((lease) => String(leaseValue(lease, 'id')) === String(id))) {
          leasesForPrompt.push({ id });
        }
      });
    }

    if (leasesForPrompt.length < 2) {
      return res.status(404).json({ error: 'Could not find enough leases with the provided IDs' });
    }

    const leasesSummary = leasesForPrompt.map((l, i) => `
Lease ${i + 1} (ID: ${leaseValue(l, 'id', lease_ids[i] || 'snapshot')}):
  Tenant: ${leaseValue(l, 'tenantName')}
  Property: ${leaseValue(l, 'propertyAddress')}
  Type: ${leaseValue(l, 'leaseType')} | Property: ${leaseValue(l, 'propertyType')}
  Term: ${leaseValue(l, 'startDate')} to ${leaseValue(l, 'endDate')} (${leaseValue(l, 'leaseTermMonths')} months)
  Monthly Rent: $${leaseValue(l, 'monthlyRent')}
  Annual Rent: $${leaseValue(l, 'annualRent')}
  SF: ${leaseValue(l, 'squareFootage')}
  Rent/SF: $${leaseValue(l, 'rentPerSqFt')}
  Escalation: ${leaseValue(l, 'escalationClause', 'None')}
  Renewal Option: ${leaseValue(l, 'renewalOption', 'None')}
  Special Provisions: ${leaseValue(l, 'specialProvisions', 'None')}`
    ).join('\n');

    const prompt = `Perform a detailed side-by-side comparison of these ${leasesForPrompt.length} commercial leases:

${leasesSummary}

Provide comparison as JSON with these keys:
- summary: overall comparison narrative (2-3 sentences)
- comparisonTable: array of {category, values: [{leaseId, value}]} for each key metric
- financialComparison: {totalCostRanking (lease IDs ordered best to worst), effectiveRentAnalysis, escalationImpact}
- termComparison: analysis of lease term differences and their implications
- riskComparison: {leastRisky: leaseId, riskFactorsByLease: [{leaseId, risks: []}]}
- flexibilityComparison: renewal options, termination rights, subletting
- recommendations: {recommended: leaseId, rationale, negotiationPoints: []}
- redFlags: array of {leaseId, issue, severity (low/medium/high)}`;

    const result = await runAIOrFallback(prompt, fallbackComparison(leasesForPrompt));
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'aiLab',
      entityId: 'lease-comparison',
      title: `Ran lease comparison for ${leasesForPrompt.length} leases`,
      source: 'ai',
      details: { workflow: 'lease_comparison', leaseIds: leasesForPrompt.map((lease) => leaseValue(lease, 'id')), provider: result.provider }
    });
    res.json({
      success: true,
      comparison: result.value,
      leaseCount: leasesForPrompt.length,
      provider: result.provider,
      warning: result.warning
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/sublease-analysis
// Body: { lease_id, sublease_terms }
router.post('/sublease-analysis', authenticateToken, aiRateLimiter, validateLeaseId, async (req, res) => {
  try {
    const { lease_id, lease_snapshot, sublease_terms } = req.body;
    if (!sublease_terms) return res.status(400).json({ error: 'sublease_terms is required' });

    const lease = await resolveLease(lease_id, lease_snapshot);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    const prompt = `Analyze the viability and legal risks of subleasing this commercial space:

MASTER LEASE:
  Tenant: ${leaseValue(lease, 'tenantName')}
  Property: ${leaseValue(lease, 'propertyAddress')}
  Type: ${leaseValue(lease, 'leaseType')}
  Term: ${leaseValue(lease, 'startDate')} to ${leaseValue(lease, 'endDate')}
  Monthly Rent: $${leaseValue(lease, 'monthlyRent')}
  SF: ${leaseValue(lease, 'squareFootage')}
  Assignment/Subletting Clause: ${leaseValue(lease, 'specialProvisions', 'Not specified')}
  Special Provisions: ${leaseValue(lease, 'specialProvisions', 'None')}

PROPOSED SUBLEASE TERMS:
${typeof sublease_terms === 'string' ? sublease_terms : JSON.stringify(sublease_terms, null, 2)}

Provide analysis as JSON with these keys:
- viabilityScore: number 1-10 (10 = highly viable)
- viabilitySummary: 2-3 sentence assessment
- legalRisks: array of {risk, severity (low/medium/high/critical), mitigation}
- landlordConsentRequired: boolean and reasoning
- financialAnalysis: {subtenantRent, masterLeaseRent, netCost, profitOrLoss}
- subleaseRestrictions: any provisions in master lease that limit subleasing
- recommendations: array of action items before proceeding
- draftConsiderations: key clauses that must be in the sublease agreement
- exitStrategy: what happens if sublease fails`;

    const result = await runAIOrFallback(prompt, fallbackSublease(lease, sublease_terms));
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'aiLab',
      entityId: 'sublease-analysis',
      title: `Ran sublease analysis for ${leaseValue(lease, 'tenantName', 'selected lease')}`,
      source: 'ai',
      details: { workflow: 'sublease_analysis', leaseId: leaseValue(lease, 'id'), provider: result.provider }
    });
    res.json({
      success: true,
      analysis: result.value,
      leaseId: lease_id,
      provider: result.provider,
      warning: result.warning
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/early-termination
// Body: { lease_id, exit_scenario }
router.post('/early-termination', authenticateToken, aiRateLimiter, validateLeaseId, async (req, res) => {
  try {
    const { lease_id, lease_snapshot, exit_scenario } = req.body;
    if (!exit_scenario) return res.status(400).json({ error: 'exit_scenario is required' });

    const lease = await resolveLease(lease_id, lease_snapshot);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    const today = new Date();
    const leaseEndDate = leaseValue(lease, 'endDate', null);
    const endDate = leaseEndDate ? new Date(leaseEndDate) : null;
    const remainingMonths = endDate ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24 * 30))) : null;

    const prompt = `Calculate early termination costs and provide negotiation strategy for this commercial lease:

LEASE DETAILS:
  Tenant: ${leaseValue(lease, 'tenantName')}
  Property: ${leaseValue(lease, 'propertyAddress')}
  Monthly Rent: $${leaseValue(lease, 'monthlyRent')}
  Annual Rent: $${leaseValue(lease, 'annualRent')}
  Lease End Date: ${leaseValue(lease, 'endDate')}
  Remaining Term: ~${remainingMonths || 'unknown'} months
  Escalation: ${leaseValue(lease, 'escalationClause', 'None')}
  Renewal Option: ${leaseValue(lease, 'renewalOption', 'None')}
  Special/Termination Provisions: ${leaseValue(lease, 'specialProvisions', 'None specified')}

EXIT SCENARIO:
${typeof exit_scenario === 'string' ? exit_scenario : JSON.stringify(exit_scenario, null, 2)}

Provide analysis as JSON with these keys:
- totalExposure: estimated total financial exposure (worst case)
- costBreakdown: {unamortizedTI, unamortizedFreeRent, remainingRentObligation, terminationFee, brokerCosts, legalCosts, totalEstimated}
- negotiationStrategy: {approach, keyLeveragePoints: [], proposedSettlement, timeline}
- walkAwayOptions: array of {option, cost, pros, cons, feasibility}
- landlordPerspective: what the landlord likely wants and their constraints
- legalConsiderations: force majeure, co-tenancy, go-dark clauses relevant here
- recommendedPath: specific step-by-step action plan
- riskTimeline: {immediateRisks: [], 30dayRisks: [], 90dayRisks: []}`;

    const result = await runAIOrFallback(prompt, fallbackTermination(lease, exit_scenario, remainingMonths));
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'aiLab',
      entityId: 'early-termination',
      title: `Ran early termination analysis for ${leaseValue(lease, 'tenantName', 'selected lease')}`,
      source: 'ai',
      details: { workflow: 'early_termination', leaseId: leaseValue(lease, 'id'), provider: result.provider }
    });
    res.json({
      success: true,
      analysis: result.value,
      leaseId: lease_id,
      remainingMonths,
      provider: result.provider,
      warning: result.warning
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/lease-audit
// Body: { lease_id }
router.post('/lease-audit', authenticateToken, aiRateLimiter, validateLeaseId, async (req, res) => {
  try {
    const { lease_id, lease_snapshot } = req.body;

    const lease = await resolveLease(lease_id, lease_snapshot);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    const prompt = `Perform a comprehensive audit of this commercial lease document to identify missing provisions and unfavorable clauses:

LEASE DETAILS:
  Tenant: ${leaseValue(lease, 'tenantName')}
  Property: ${leaseValue(lease, 'propertyAddress')}
  Property Type: ${leaseValue(lease, 'propertyType')}
  Lease Type: ${leaseValue(lease, 'leaseType')}
  Monthly Rent: $${leaseValue(lease, 'monthlyRent')}
  Annual Rent: $${leaseValue(lease, 'annualRent')}
  SF: ${leaseValue(lease, 'squareFootage')}
  Rent/SF: $${leaseValue(lease, 'rentPerSqFt')}
  Term: ${leaseValue(lease, 'startDate')} to ${leaseValue(lease, 'endDate')}
  Security Deposit: $${leaseValue(lease, 'securityDeposit')}
  Escalation: ${leaseValue(lease, 'escalationClause', 'None')}
  Renewal Option: ${leaseValue(lease, 'renewalOption', 'None')}
  Special Provisions: ${leaseValue(lease, 'specialProvisions', 'None')}
  AI Abstraction Notes: ${leaseValue(lease, 'aiAbstraction', null) ? JSON.stringify(leaseValue(lease, 'aiAbstraction')).substring(0, 500) : 'None'}

Provide audit as JSON with these keys:
- overallScore: number 1-10 (10 = comprehensive, well-balanced lease)
- executiveSummary: 3-4 sentence overview of audit findings
- missingProvisions: array of {provision, importance (critical/important/recommended), explanation, sampleLanguage}
- unfavorableClauses: array of {clause, currentTerm, concern, severity (low/medium/high/critical), suggestedRevision}
- tenantProtectionGaps: provisions that fail to adequately protect tenant interests
- landlordFavoredTerms: terms that disproportionately favor the landlord
- complianceIssues: any terms that may conflict with local laws or standard practice
- negotiationPriorities: array ordered by importance of what to renegotiate
- positiveProvisions: well-drafted clauses that benefit the tenant
- actionItems: specific steps to strengthen the lease before signing`;

    const result = await runAIOrFallback(prompt, fallbackAudit(lease));
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'aiLab',
      entityId: 'lease-audit',
      title: `Ran lease audit for ${leaseValue(lease, 'tenantName', 'selected lease')}`,
      source: 'ai',
      details: { workflow: 'lease_audit', leaseId: leaseValue(lease, 'id'), provider: result.provider }
    });
    res.json({
      success: true,
      audit: result.value,
      leaseId: lease_id,
      provider: result.provider,
      warning: result.warning
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/extract-clauses
// Body: { lease_id?: number, document_text: string, focus?: string }
// Returns: clause-level extraction (parties, term, rent, escalation, options,
// termination, default, indemnity, insurance, assignment, use, etc.)
router.post('/extract-clauses', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { lease_id, lease_snapshot, document_text, focus } = req.body || {};
    if (!document_text || typeof document_text !== 'string' || document_text.trim().length < 50) {
      return res.status(400).json({ error: 'document_text (string ≥50 chars) is required' });
    }

    let leaseContext = '';
    let lease = lease_snapshot || null;
    if (lease_id) {
      lease = await resolveLease(lease_id, lease_snapshot);
      if (lease) {
        leaseContext = `\nKnown lease metadata (for cross-check):\n  Tenant: ${leaseValue(lease, 'tenantName')}\n  Property: ${leaseValue(lease, 'propertyAddress')}\n  Type: ${leaseValue(lease, 'leaseType')} | Property type: ${leaseValue(lease, 'propertyType')}\n  Monthly Rent: $${leaseValue(lease, 'monthlyRent')} | Annual Rent: $${leaseValue(lease, 'annualRent')}\n  Term: ${leaseValue(lease, 'startDate')} to ${leaseValue(lease, 'endDate')}\n  SF: ${leaseValue(lease, 'squareFootage')}`;
      }
    }

    // Cap document size to avoid token blow-up (50MB upload support exists for storage,
    // but we only feed 24k chars to the model).
    const docExcerpt = document_text.length > 24000
      ? document_text.slice(0, 24000) + '\n…[truncated]'
      : document_text;

    const prompt = `Extract the substantive clauses from this commercial lease document.${leaseContext}

DOCUMENT:
"""
${docExcerpt}
"""

${focus ? `Special focus: ${focus}\n` : ''}Return strict JSON with these keys:
- parties: {landlord, tenant, guarantors:[]}
- premises: {address, suiteOrUnit, rentableSqFt, useClause}
- term: {commencementDate, expirationDate, leaseTermMonths, renewalOptions:[{notice, term, rentBasis}]}
- rent: {baseMonthlyRent, baseAnnualRent, escalations:[{type, schedule, capOrFloor}], freeRentMonths, percentageRent}
- additionalRent: {camOrOpex:{basis, capType, gross-up}, taxes, insurance}
- securityDeposit: {amount, lastMonth, letterOfCredit, burnDownConditions}
- assignmentSubletting: {permitted, consentStandard, recapture, profitSharing}
- maintenanceRepair: {tenantObligations, landlordObligations, hvac}
- insurance: {tenantRequired, landlordRequired, waiverOfSubrogation}
- defaultRemedies: {monetaryCureDays, nonMonetaryCureDays, accelerationClause, lateFee}
- termination: {tenantTerminationRights:[], landlordTerminationRights:[], earlyTerminationFee}
- holdover: {rate, doubleRent}
- estoppelSnda: {required, deadline}
- exhibits: array of {label, description}
- redFlags: array of {clause, concern, severity (low/medium/high/critical)}
- missingClauses: array of {expectedClause, importance, recommendation}
- summary: 2-3 sentence executive summary

Only return JSON.`;

    const result = await runAIOrFallback(prompt, fallbackClauses(lease, document_text, focus));
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'aiLab',
      entityId: 'extract-clauses',
      title: `Ran clause extraction for ${leaseValue(lease, 'tenantName', 'selected lease')}`,
      source: 'ai',
      details: { workflow: 'extract_clauses', leaseId: leaseValue(lease, 'id'), focus, provider: result.provider }
    });
    res.json({
      success: true,
      clauses: result.value,
      leaseId: lease_id || null,
      documentChars: document_text.length,
      provider: result.provider,
      warning: result.warning
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
