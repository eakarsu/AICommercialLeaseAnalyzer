const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { validateLeaseIds, validateLeaseId } = require('../middleware/validate');
const { Lease } = require('../models');
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'anthropic/claude-3-5-sonnet-20241022';
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
      }
    }
  );
  return response.data.choices[0].message.content;
}

function parseAI(text) {
  try {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);
  } catch {
    return { analysis: text };
  }
}

// POST /api/ai/lease-comparison
// Body: { lease_ids: [id1, id2, ...] }  — side-by-side analysis of 2-3 leases
router.post('/lease-comparison', authenticateToken, aiRateLimiter, validateLeaseIds, async (req, res) => {
  try {
    const { lease_ids } = req.body;
    const leases = await Lease.findAll({ where: { id: lease_ids } });
    if (leases.length < 2) {
      return res.status(404).json({ error: 'Could not find enough leases with the provided IDs' });
    }

    const leasesSummary = leases.map((l, i) => `
Lease ${i + 1} (ID: ${l.id}):
  Tenant: ${l.tenantName}
  Property: ${l.propertyAddress}
  Type: ${l.leaseType || 'N/A'} | Property: ${l.propertyType || 'N/A'}
  Term: ${l.startDate} to ${l.endDate} (${l.leaseTermMonths || 'N/A'} months)
  Monthly Rent: $${l.monthlyRent || 'N/A'}
  Annual Rent: $${l.annualRent || 'N/A'}
  SF: ${l.squareFootage || 'N/A'}
  Rent/SF: $${l.rentPerSqFt || 'N/A'}
  Escalation: ${l.escalationClause || 'None'}
  Renewal Option: ${l.renewalOption || 'None'}
  Special Provisions: ${l.specialProvisions || 'None'}`
    ).join('\n');

    const prompt = `Perform a detailed side-by-side comparison of these ${leases.length} commercial leases:

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

    const aiText = await callOpenRouter(prompt);
    res.json({ success: true, comparison: parseAI(aiText), leaseCount: leases.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/sublease-analysis
// Body: { lease_id, sublease_terms }
router.post('/sublease-analysis', authenticateToken, aiRateLimiter, validateLeaseId, async (req, res) => {
  try {
    const { lease_id, sublease_terms } = req.body;
    if (!sublease_terms) return res.status(400).json({ error: 'sublease_terms is required' });

    const lease = await Lease.findByPk(lease_id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    const prompt = `Analyze the viability and legal risks of subleasing this commercial space:

MASTER LEASE:
  Tenant: ${lease.tenantName}
  Property: ${lease.propertyAddress}
  Type: ${lease.leaseType || 'N/A'}
  Term: ${lease.startDate} to ${lease.endDate}
  Monthly Rent: $${lease.monthlyRent}
  SF: ${lease.squareFootage || 'N/A'}
  Assignment/Subletting Clause: ${lease.specialProvisions || 'Not specified'}
  Special Provisions: ${lease.specialProvisions || 'None'}

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

    const aiText = await callOpenRouter(prompt);
    res.json({ success: true, analysis: parseAI(aiText), leaseId: lease_id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/early-termination
// Body: { lease_id, exit_scenario }
router.post('/early-termination', authenticateToken, aiRateLimiter, validateLeaseId, async (req, res) => {
  try {
    const { lease_id, exit_scenario } = req.body;
    if (!exit_scenario) return res.status(400).json({ error: 'exit_scenario is required' });

    const lease = await Lease.findByPk(lease_id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    const today = new Date();
    const endDate = lease.endDate ? new Date(lease.endDate) : null;
    const remainingMonths = endDate ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24 * 30))) : null;

    const prompt = `Calculate early termination costs and provide negotiation strategy for this commercial lease:

LEASE DETAILS:
  Tenant: ${lease.tenantName}
  Property: ${lease.propertyAddress}
  Monthly Rent: $${lease.monthlyRent}
  Annual Rent: $${lease.annualRent}
  Lease End Date: ${lease.endDate || 'N/A'}
  Remaining Term: ~${remainingMonths || 'unknown'} months
  Escalation: ${lease.escalationClause || 'None'}
  Renewal Option: ${lease.renewalOption || 'None'}
  Special/Termination Provisions: ${lease.specialProvisions || 'None specified'}

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

    const aiText = await callOpenRouter(prompt);
    res.json({ success: true, analysis: parseAI(aiText), leaseId: lease_id, remainingMonths });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/lease-audit
// Body: { lease_id }
router.post('/lease-audit', authenticateToken, aiRateLimiter, validateLeaseId, async (req, res) => {
  try {
    const { lease_id } = req.body;

    const lease = await Lease.findByPk(lease_id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });

    const prompt = `Perform a comprehensive audit of this commercial lease document to identify missing provisions and unfavorable clauses:

LEASE DETAILS:
  Tenant: ${lease.tenantName}
  Property: ${lease.propertyAddress}
  Property Type: ${lease.propertyType || 'N/A'}
  Lease Type: ${lease.leaseType || 'N/A'}
  Monthly Rent: $${lease.monthlyRent}
  Annual Rent: $${lease.annualRent}
  SF: ${lease.squareFootage || 'N/A'}
  Rent/SF: $${lease.rentPerSqFt || 'N/A'}
  Term: ${lease.startDate} to ${lease.endDate}
  Security Deposit: $${lease.securityDeposit || 'N/A'}
  Escalation: ${lease.escalationClause || 'None'}
  Renewal Option: ${lease.renewalOption || 'None'}
  Special Provisions: ${lease.specialProvisions || 'None'}
  AI Abstraction Notes: ${lease.aiAbstraction ? JSON.stringify(lease.aiAbstraction).substring(0, 500) : 'None'}

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

    const aiText = await callOpenRouter(prompt);
    res.json({ success: true, audit: parseAI(aiText), leaseId: lease_id });
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
    const { lease_id, document_text, focus } = req.body || {};
    if (!document_text || typeof document_text !== 'string' || document_text.trim().length < 50) {
      return res.status(400).json({ error: 'document_text (string ≥50 chars) is required' });
    }

    let leaseContext = '';
    if (lease_id) {
      const lease = await Lease.findByPk(lease_id);
      if (lease) {
        leaseContext = `\nKnown lease metadata (for cross-check):\n  Tenant: ${lease.tenantName}\n  Property: ${lease.propertyAddress}\n  Type: ${lease.leaseType || 'N/A'} | Property type: ${lease.propertyType || 'N/A'}\n  Monthly Rent: $${lease.monthlyRent || 'N/A'} | Annual Rent: $${lease.annualRent || 'N/A'}\n  Term: ${lease.startDate || 'N/A'} to ${lease.endDate || 'N/A'}\n  SF: ${lease.squareFootage || 'N/A'}`;
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

    const aiText = await callOpenRouter(prompt);
    res.json({ success: true, clauses: parseAI(aiText), leaseId: lease_id || null, documentChars: document_text.length });
  } catch (error) {
    if (error && error.code === 'NO_API_KEY') {
      return res.status(503).json({ success: false, error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
