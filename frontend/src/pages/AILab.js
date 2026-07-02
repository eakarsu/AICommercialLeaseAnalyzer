import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import AIResultDisplay from '../components/AIResultDisplay';
import { leaseAPI, portfolioAPI, advancedAI, marketCompAPI } from '../services/api';

const Tab = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
      active ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' : 'text-dark-400 hover:text-white hover:bg-dark-700/40'
    }`}
  >
    <span className="mr-2">{icon}</span>{label}
  </button>
);

const SubmitBtn = ({ onClick, loading, children }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50"
  >
    {loading ? <><span className="animate-spin">@</span>Analyzing...</> : <>{children}</>}
  </button>
);

const FieldLabel = ({ children }) => (
  <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">{children}</label>
);

const inp = 'w-full bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
const smallBtn = 'rounded-lg border border-dark-700 bg-dark-900/70 px-3 py-2 text-xs font-semibold text-dark-200 transition hover:border-primary-500/60 hover:bg-primary-500/10 hover:text-primary-200';

const FillButton = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className={smallBtn}>
    {children}
  </button>
);

const FieldTools = ({ children }) => (
  <div className="mb-3 flex flex-wrap gap-2">
    {children}
  </div>
);

const getId = (item) => String(item?.id || item?._id || '');
const money = (value) => value ? `$${Number(value).toLocaleString()}` : 'not specified';
const leaseLabel = (lease) => lease ? `${lease.tenantName || 'Tenant'} - ${lease.propertyAddress || 'Address not set'}` : '';
const portfolioLabel = (item) => item ? `${item.propertyName || 'Property'} - ${item.market || 'Market not set'}` : '';

const focusOptions = [
  { label: 'Co-tenancy and exclusive use', value: 'co-tenancy, exclusive use, anchor tenant obligations, remedies, and operating restrictions' },
  { label: 'CAM, taxes, insurance', value: 'CAM, operating expenses, tax pass-throughs, gross-up, caps, audit rights, and insurance obligations' },
  { label: 'Assignment and sublease', value: 'assignment, subletting, consent standards, recapture rights, profit sharing, and transfer restrictions' },
  { label: 'Default and remedies', value: 'monetary default, non-monetary default, cure periods, acceleration, late fees, remedies, and waiver provisions' },
  { label: 'Renewal and termination', value: 'renewal options, notice deadlines, extension rent, early termination rights, holdover, and surrender obligations' }
];

const subleaseTemplates = [
  {
    label: 'Market-rate office sublease',
    build: (lease) => `Proposed subtenant will occupy the full premises at ${money(lease?.monthlyRent)} per month or current market rent, whichever is lower. The sublease term should run through the remaining master lease term with no renewal rights unless landlord consents. Subtenant will use the premises for standard office use, maintain required insurance, reimburse pass-through expenses, and comply with all master lease restrictions. Please evaluate consent requirements, recapture risk, economics, and provisions needed in the sublease.`
  },
  {
    label: 'Partial premises sublease',
    build: (lease) => `Proposed sublease covers part of the premises at ${lease?.propertyAddress || 'the leased premises'}. Subtenant will share common areas, utilities, and services with the existing tenant. Rent should be allocated by rentable square footage and include a proportionate share of CAM, taxes, insurance, and utilities. Please assess whether partial subleasing is permitted, landlord consent requirements, access/control issues, risk allocation, and drafting protections.`
  },
  {
    label: 'Below-market mitigation deal',
    build: (lease) => `Tenant wants to sublease quickly to reduce losses, even if rent is below the master lease rent of ${money(lease?.monthlyRent)} per month. Proposed subtenant is creditworthy but requests flexible commencement and limited restoration obligations. Please analyze loss mitigation, landlord approval strategy, likely objections, financial exposure, and recommended deal terms.`
  }
];

const terminationTemplates = [
  {
    label: 'Business downsizing',
    build: (lease) => `Tenant is downsizing and wants to exit ${leaseLabel(lease) || 'the lease'} as soon as practical. Target exit date is within 90 days. Tenant is willing to pay a negotiated termination fee but wants to avoid paying all remaining rent through ${lease?.endDate || 'lease expiration'}. Evaluate exposure, settlement range, landlord leverage, replacement tenant strategy, and documents needed.`
  },
  {
    label: 'Relocation to better site',
    build: (lease) => `Tenant plans to relocate to a better site before the current lease expires on ${lease?.endDate || 'the lease end date'}. Tenant wants to negotiate an early surrender, possibly offer marketing cooperation, assignment, or sublease as alternatives. Please model financial exposure, practical negotiation strategy, timing risks, and preferred path.`
  },
  {
    label: 'Landlord default leverage',
    build: (lease) => `Tenant believes landlord performance issues may support early exit leverage at ${lease?.propertyAddress || 'the property'}. Issues may include maintenance failures, access disruption, CAM disputes, or service interruptions. Please identify legal and business arguments, evidence needed, settlement options, and risk of wrongful abandonment.`
  }
];

const stressTemplates = [
  {
    label: 'Rent and vacancy shock',
    build: (item) => `Model a 10% rent drop with a 5% vacancy increase for ${portfolioLabel(item) || 'this portfolio asset'}. Estimate NOI impact, value impact at current cap rate, DSCR pressure, tenant retention risk, and recommended mitigation actions.`
  },
  {
    label: 'Rate and refinance pressure',
    build: (item) => `Model a 150 basis point interest-rate increase at refinance for ${portfolioLabel(item) || 'this portfolio asset'}. Assess debt service coverage, valuation impact, hold/sell implications, leasing strategy, and capital plan recommendations.`
  },
  {
    label: 'Capex and occupancy stress',
    build: (item) => `Model a major capital expense event combined with a 7% occupancy drop for ${portfolioLabel(item) || 'this portfolio asset'}. Evaluate cash flow, reserves, DSCR, tenant risk, value preservation options, and recommended action plan.`
  }
];

const AILab = () => {
  const [tab, setTab] = useState('comparison');
  const [leases, setLeases] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [comps, setComps] = useState([]);
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [l, p, m] = await Promise.all([leaseAPI.getAll(), portfolioAPI.getAll(), marketCompAPI.getAll()]);
        setLeases(Array.isArray(l.data) ? l.data : []);
        setPortfolio(Array.isArray(p.data) ? p.data : []);
        setComps(Array.isArray(m.data) ? m.data : []);
      } catch {}
    })();
  }, []);

  // Comparison
  const [cmpIds, setCmpIds] = useState([]);
  const [cmpResult, setCmpResult] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const toggleCmp = (id) => {
    setCmpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };
  const selectFirstLeases = (count) => setCmpIds(leases.slice(0, count).map(getId).filter(Boolean));
  const selectHighestRentLeases = () => {
    const selected = [...leases]
      .sort((a, b) => Number(b.monthlyRent || 0) - Number(a.monthlyRent || 0))
      .slice(0, 3)
      .map(getId)
      .filter(Boolean);
    setCmpIds(selected);
  };
  const selectExpiringLeases = () => {
    const selected = [...leases]
      .filter((lease) => lease.endDate)
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
      .slice(0, 3)
      .map(getId)
      .filter(Boolean);
    setCmpIds(selected);
  };
  const runCmp = async () => {
    if (cmpIds.length < 2) return alert('Select 2-3 leases');
    setCmpLoading(true); setCmpResult(null);
    try {
      const snapshots = leases.filter((lease) => cmpIds.includes(getId(lease)));
      const { data } = await advancedAI.leaseComparisonReport(cmpIds, snapshots);
      setCmpResult(data);
    } catch (e) {
      setCmpResult({ error: e.response?.data?.error || e.message });
    } finally { setCmpLoading(false); }
  };

  // Sublease
  const [subLease, setSubLease] = useState('');
  const [subTerms, setSubTerms] = useState('');
  const [subResult, setSubResult] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const selectedSubLease = leases.find(l => getId(l) === subLease);
  const fillSubleaseFields = (lease = selectedSubLease, template = subleaseTemplates[0]) => {
    if (!lease) return;
    setSubLease(getId(lease));
    setSubTerms(template.build(lease));
  };
  const runSub = async () => {
    if (!subLease || !subTerms) return alert('Lease and terms required');
    setSubLoading(true); setSubResult(null);
    try {
      const { data } = await advancedAI.subleaseAnalysis(subLease, subTerms, selectedSubLease);
      setSubResult(data);
    } catch (e) {
      setSubResult({ error: e.response?.data?.error || e.message });
    } finally { setSubLoading(false); }
  };

  // Early termination
  const [termLease, setTermLease] = useState('');
  const [termScenario, setTermScenario] = useState('');
  const [termResult, setTermResult] = useState(null);
  const [termLoading, setTermLoading] = useState(false);
  const selectedTermLease = leases.find(l => getId(l) === termLease);
  const fillTerminationFields = (lease = selectedTermLease, template = terminationTemplates[0]) => {
    if (!lease) return;
    setTermLease(getId(lease));
    setTermScenario(template.build(lease));
  };
  const runTerm = async () => {
    if (!termLease || !termScenario) return alert('Lease and scenario required');
    setTermLoading(true); setTermResult(null);
    try {
      const { data } = await advancedAI.earlyTermination(termLease, termScenario, selectedTermLease);
      setTermResult(data);
    } catch (e) {
      setTermResult({ error: e.response?.data?.error || e.message });
    } finally { setTermLoading(false); }
  };

  // Lease audit
  const [auditLease, setAuditLease] = useState('');
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const fillAuditFields = (lease = leases[0]) => {
    if (!lease) return;
    setAuditLease(getId(lease));
  };
  const runAudit = async () => {
    if (!auditLease) return alert('Select lease');
    setAuditLoading(true); setAuditResult(null);
    try {
      const selectedAuditLease = leases.find(l => getId(l) === auditLease);
      const { data } = await advancedAI.leaseAudit(auditLease, selectedAuditLease);
      setAuditResult(data);
    } catch (e) {
      setAuditResult({ error: e.response?.data?.error || e.message });
    } finally { setAuditLoading(false); }
  };

  // Extract Clauses
  const [clauseLease, setClauseLease] = useState('');
  const [clauseDoc, setClauseDoc] = useState('');
  const [clauseFocus, setClauseFocus] = useState('');
  const [clauseResult, setClauseResult] = useState(null);
  const [clauseLoading, setClauseLoading] = useState(false);
  const selectedClauseLease = leases.find(l => getId(l) === clauseLease);
  const buildLeaseDocumentText = (lease) => {
    if (!lease) return '';
    return `COMMERCIAL LEASE METADATA FOR CLAUSE EXTRACTION

Tenant: ${lease.tenantName || 'Not specified'}
Property Address: ${lease.propertyAddress || 'Not specified'}
Property Type: ${lease.propertyType || 'Not specified'}
Lease Type: ${lease.leaseType || 'Not specified'}
Term: ${lease.startDate || 'Not specified'} to ${lease.endDate || 'Not specified'} (${lease.leaseTermMonths || 'not specified'} months)
Monthly Rent: ${money(lease.monthlyRent)}
Annual Rent: ${money(lease.annualRent)}
Square Footage: ${lease.squareFootage || 'Not specified'}
Rent Per Sq Ft: ${money(lease.rentPerSqFt)}
Security Deposit: ${money(lease.securityDeposit)}
Escalation Clause: ${lease.escalationClause || 'Not specified'}
Renewal Option: ${lease.renewalOption || 'Not specified'}
Special Provisions: ${lease.specialProvisions || 'Not specified'}
Status: ${lease.status || 'Not specified'}

Please extract and cross-check clauses from the known metadata above. Treat missing provisions as gaps that require source-document review.`;
  };
  const fillClauseFields = (lease = selectedClauseLease, focus = focusOptions[0].value) => {
    if (!lease) return;
    setClauseLease(getId(lease));
    setClauseDoc(buildLeaseDocumentText(lease));
    setClauseFocus(focus);
  };
  const runClauses = async () => {
    if (!clauseDoc || clauseDoc.trim().length < 50) return alert('Paste lease document text (≥50 chars)');
    setClauseLoading(true); setClauseResult(null);
    try {
      const { data } = await advancedAI.extractClauses(clauseDoc, clauseLease || undefined, clauseFocus || undefined, selectedClauseLease);
      setClauseResult(data);
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.error || e.message;
      setClauseResult({ error: status === 503 ? `AI service unavailable: ${msg}` : msg });
    } finally { setClauseLoading(false); }
  };

  // Stress Test (uses portfolio.analyze)
  const [stressPortfolio, setStressPortfolio] = useState('');
  const [stressScenario, setStressScenario] = useState('10% rent drop with 5% vacancy increase across portfolio');
  const [stressResult, setStressResult] = useState(null);
  const [stressLoading, setStressLoading] = useState(false);
  const selectedStressPortfolio = portfolio.find(p => getId(p) === stressPortfolio);
  const fillStressFields = (item = selectedStressPortfolio, template = stressTemplates[0]) => {
    if (!item) return;
    setStressPortfolio(getId(item));
    setStressScenario(template.build(item));
  };
  const runStress = async () => {
    if (!stressPortfolio) return alert('Select portfolio entry');
    setStressLoading(true); setStressResult(null);
    try {
      const { data } = await portfolioAPI.analyze({ ...(selectedStressPortfolio || {}), portfolioId: stressPortfolio, scenario: stressScenario });
      setStressResult(data);
    } catch (e) {
      setStressResult({ error: e.response?.data?.error || e.message });
    } finally { setStressLoading(false); }
  };

  const fillAllAIFields = () => {
    const firstLease = leases[0];
    const secondLease = leases[1];
    const thirdLease = leases[2];
    const firstPortfolio = portfolio[0];

    if (firstLease && secondLease) {
      setCmpIds([firstLease, secondLease, thirdLease].filter(Boolean).map(getId));
    }
    if (firstLease) {
      fillSubleaseFields(firstLease);
      fillTerminationFields(firstLease);
      fillAuditFields(firstLease);
      fillClauseFields(firstLease);
    }
    if (firstPortfolio) {
      fillStressFields(firstPortfolio);
    }
  };

  useEffect(() => {
    if (autoFilled || leases.length === 0) return;
    fillAllAIFields();
    setAutoFilled(true);
  }, [autoFilled, leases, portfolio]);

  const tabs = [
    { key: 'comparison', icon: 'C', label: 'Lease Comparison Report' },
    { key: 'sublease', icon: 'S', label: 'Sublease Analysis' },
    { key: 'termination', icon: 'X', label: 'Early Termination' },
    { key: 'audit', icon: 'A', label: 'Lease Audit' },
    { key: 'clauses', icon: 'E', label: 'Extract Clauses' },
    { key: 'stress', icon: 'T', label: 'Portfolio Stress Test' },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">AI Lab</h1>
          <p className="text-dark-400 mt-1">Advanced AI tools: comparisons, sublease analysis, early-termination cost modeling, lease audits, and portfolio stress testing.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={t.icon} label={t.label} />
          ))}
          <button
            type="button"
            onClick={fillAllAIFields}
            className="ml-auto rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Fill all AI fields
          </button>
        </div>

        {tab === 'comparison' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Lease Comparison Report</h3>
            <p className="text-dark-400 text-sm mb-4">Select 2-3 leases to generate an AI side-by-side analysis with variance and recommendations.</p>
            <FieldTools>
              <FillButton onClick={() => selectFirstLeases(2)}>Select first 2 leases</FillButton>
              <FillButton onClick={() => selectFirstLeases(3)}>Select first 3 leases</FillButton>
              <FillButton onClick={selectHighestRentLeases}>Highest rent leases</FillButton>
              <FillButton onClick={selectExpiringLeases}>Earliest expirations</FillButton>
              <FillButton onClick={() => setCmpIds([])}>Clear</FillButton>
            </FieldTools>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 max-h-72 overflow-y-auto">
              {leases.length === 0 && (
                <div className="col-span-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  No leases loaded. Check that the backend is running and seeded, then refresh this page.
                </div>
              )}
              {leases.map(l => {
                const id = getId(l);
                const checked = cmpIds.includes(id);
                return (
                  <div
                    key={id}
                    onClick={() => toggleCmp(id)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${checked ? 'border-primary-500 bg-primary-500/10' : 'border-dark-700 bg-dark-900/50 hover:border-dark-600'}`}
                  >
                    <div className="text-sm font-semibold text-white truncate">{l.tenantName}</div>
                    <div className="text-xs text-dark-400 truncate">{l.propertyAddress}</div>
                    <div className="text-xs text-primary-300 mt-1">${Number(l.monthlyRent || 0).toLocaleString()}/mo</div>
                  </div>
                );
              })}
            </div>
            <SubmitBtn onClick={runCmp} loading={cmpLoading}>Run Comparison ({cmpIds.length} selected)</SubmitBtn>
            {cmpResult && <div className="mt-6"><AIResultDisplay result={cmpResult.comparison || cmpResult} /></div>}
          </div>
        )}

        {tab === 'sublease' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Sublease Analysis</h3>
            <p className="text-dark-400 text-sm mb-4">Evaluate viability and legal risk of subleasing under the master lease.</p>
            <FieldLabel>Master Lease</FieldLabel>
            <select
              className={inp + ' mb-4'}
              value={subLease}
              onChange={e => {
                const lease = leases.find(l => getId(l) === e.target.value);
                fillSubleaseFields(lease, subleaseTemplates[0]);
              }}
            >
              <option value="">Select lease...</option>
              {leases.map(l => <option key={getId(l)} value={getId(l)}>{leaseLabel(l)}</option>)}
            </select>
            <FieldLabel>Sublease Terms</FieldLabel>
            <FieldTools>
              {subleaseTemplates.map((template) => (
                <FillButton key={template.label} onClick={() => fillSubleaseFields(selectedSubLease || leases[0], template)}>
                  {template.label}
                </FillButton>
              ))}
              <FillButton onClick={() => setSubTerms('')}>Clear terms</FillButton>
            </FieldTools>
            <select
              className={inp + ' mb-4'}
              value=""
              onChange={e => {
                const template = subleaseTemplates.find(item => item.label === e.target.value);
                if (template) fillSubleaseFields(selectedSubLease || leases[0], template);
              }}
            >
              <option value="">Fill from sublease scenario...</option>
              {subleaseTemplates.map(template => <option key={template.label} value={template.label}>{template.label}</option>)}
            </select>
            <textarea
              className={inp + ' mb-4 h-40'}
              placeholder="Describe proposed subtenant, rent, term, scope..."
              value={subTerms}
              onChange={e => setSubTerms(e.target.value)}
            />
            <SubmitBtn onClick={runSub} loading={subLoading}>Analyze Sublease</SubmitBtn>
            {subResult && <div className="mt-6"><AIResultDisplay result={subResult.analysis || subResult} /></div>}
          </div>
        )}

        {tab === 'termination' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Early Termination Calculator</h3>
            <p className="text-dark-400 text-sm mb-4">Estimate exit cost, negotiation strategy, and walk-away options.</p>
            <FieldLabel>Lease</FieldLabel>
            <select
              className={inp + ' mb-4'}
              value={termLease}
              onChange={e => {
                const lease = leases.find(l => getId(l) === e.target.value);
                fillTerminationFields(lease, terminationTemplates[0]);
              }}
            >
              <option value="">Select lease...</option>
              {leases.map(l => <option key={getId(l)} value={getId(l)}>{leaseLabel(l)}</option>)}
            </select>
            <FieldLabel>Exit Scenario</FieldLabel>
            <FieldTools>
              {terminationTemplates.map((template) => (
                <FillButton key={template.label} onClick={() => fillTerminationFields(selectedTermLease || leases[0], template)}>
                  {template.label}
                </FillButton>
              ))}
              <FillButton onClick={() => setTermScenario('')}>Clear scenario</FillButton>
            </FieldTools>
            <select
              className={inp + ' mb-4'}
              value=""
              onChange={e => {
                const template = terminationTemplates.find(item => item.label === e.target.value);
                if (template) fillTerminationFields(selectedTermLease || leases[0], template);
              }}
            >
              <option value="">Fill from termination scenario...</option>
              {terminationTemplates.map(template => <option key={template.label} value={template.label}>{template.label}</option>)}
            </select>
            <textarea
              className={inp + ' mb-4 h-32'}
              placeholder="Reason for termination, target exit date, any leverage points..."
              value={termScenario}
              onChange={e => setTermScenario(e.target.value)}
            />
            <SubmitBtn onClick={runTerm} loading={termLoading}>Run Termination Analysis</SubmitBtn>
            {termResult && <div className="mt-6"><AIResultDisplay result={termResult.analysis || termResult} /></div>}
          </div>
        )}

        {tab === 'audit' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Lease Audit</h3>
            <p className="text-dark-400 text-sm mb-4">Identify missing provisions, unfavorable clauses, and tenant-protection gaps.</p>
            <FieldLabel>Lease</FieldLabel>
            <select
              className={inp + ' mb-4'}
              value={auditLease}
              onChange={e => {
                const lease = leases.find(l => getId(l) === e.target.value);
                fillAuditFields(lease);
              }}
            >
              <option value="">Select lease...</option>
              {leases.map(l => <option key={getId(l)} value={getId(l)}>{leaseLabel(l)}</option>)}
            </select>
            <FieldTools>
              <FillButton onClick={() => fillAuditFields(leases[0])}>Use first lease</FillButton>
              <FillButton onClick={() => fillAuditFields([...leases].sort((a, b) => Number(b.monthlyRent || 0) - Number(a.monthlyRent || 0))[0])}>Highest rent lease</FillButton>
              <FillButton onClick={() => fillAuditFields([...leases].filter(l => l.endDate).sort((a, b) => new Date(a.endDate) - new Date(b.endDate))[0])}>Earliest expiration</FillButton>
            </FieldTools>
            <SubmitBtn onClick={runAudit} loading={auditLoading}>Run Lease Audit</SubmitBtn>
            {auditResult && <div className="mt-6"><AIResultDisplay result={auditResult.audit || auditResult} /></div>}
          </div>
        )}

        {tab === 'clauses' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Extract Clauses</h3>
            <p className="text-dark-400 text-sm mb-4">Paste raw lease document text to extract clause-level structured data (parties, term, rent, escalation, options, default, indemnity, insurance, assignment, red flags, missing clauses).</p>
            <FieldLabel>Lease (optional — for cross-check)</FieldLabel>
            <select
              className={inp + ' mb-4'}
              value={clauseLease}
              onChange={e => {
                const lease = leases.find(l => getId(l) === e.target.value);
                fillClauseFields(lease, clauseFocus || focusOptions[0].value);
              }}
            >
              <option value="">— None —</option>
              {leases.map(l => <option key={getId(l)} value={getId(l)}>{leaseLabel(l)}</option>)}
            </select>
            <FieldLabel>Document Text</FieldLabel>
            <FieldTools>
              <FillButton onClick={() => fillClauseFields(selectedClauseLease || leases[0], clauseFocus || focusOptions[0].value)}>Use selected lease data</FillButton>
              <FillButton onClick={() => setClauseDoc(`${clauseDoc}\n\n${selectedClauseLease ? buildLeaseDocumentText(selectedClauseLease) : ''}`.trim())}>Append selected lease data</FillButton>
              <FillButton onClick={() => setClauseDoc('')}>Clear document text</FillButton>
            </FieldTools>
            <textarea
              className={inp + ' mb-4 h-64 font-mono text-xs'}
              placeholder="Paste lease document text here (minimum 50 characters; truncated to ~24k chars)..."
              value={clauseDoc}
              onChange={e => setClauseDoc(e.target.value)}
            />
            <FieldLabel>Special Focus (optional)</FieldLabel>
            <select
              className={inp + ' mb-4'}
              value={clauseFocus}
              onChange={e => setClauseFocus(e.target.value)}
            >
              <option value="">No special focus</option>
              {focusOptions.map(option => <option key={option.label} value={option.value}>{option.label}</option>)}
            </select>
            <input
              className={inp + ' mb-4'}
              placeholder="Or type a custom focus..."
              value={clauseFocus}
              onChange={e => setClauseFocus(e.target.value)}
            />
            <FieldTools>
              {focusOptions.map(option => (
                <FillButton key={option.label} onClick={() => setClauseFocus(option.value)}>{option.label}</FillButton>
              ))}
              <FillButton onClick={() => setClauseFocus('')}>Clear focus</FillButton>
            </FieldTools>
            <SubmitBtn onClick={runClauses} loading={clauseLoading}>Extract Clauses ({clauseDoc.length.toLocaleString()} chars)</SubmitBtn>
            {clauseResult && (
              <div className="mt-6">
                {clauseResult.error
                  ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{clauseResult.error}</div>
                  : <AIResultDisplay result={clauseResult.clauses || clauseResult} />}
              </div>
            )}
          </div>
        )}

        {tab === 'stress' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Portfolio Stress Test</h3>
            <p className="text-dark-400 text-sm mb-4">AI scenario modeling — rent drops, occupancy changes, NPV impact.</p>
            <FieldLabel>Portfolio Entry</FieldLabel>
            <select
              className={inp + ' mb-4'}
              value={stressPortfolio}
              onChange={e => {
                const item = portfolio.find(p => getId(p) === e.target.value);
                fillStressFields(item, stressTemplates[0]);
              }}
            >
              <option value="">Select portfolio...</option>
              {portfolio.map(p => <option key={getId(p)} value={getId(p)}>{portfolioLabel(p)}</option>)}
            </select>
            <FieldLabel>Stress Scenario</FieldLabel>
            <FieldTools>
              {stressTemplates.map((template) => (
                <FillButton key={template.label} onClick={() => fillStressFields(selectedStressPortfolio || portfolio[0], template)}>
                  {template.label}
                </FillButton>
              ))}
              <FillButton onClick={() => setStressScenario('')}>Clear scenario</FillButton>
            </FieldTools>
            <select
              className={inp + ' mb-4'}
              value=""
              onChange={e => {
                const template = stressTemplates.find(item => item.label === e.target.value);
                if (template) fillStressFields(selectedStressPortfolio || portfolio[0], template);
              }}
            >
              <option value="">Fill from stress scenario...</option>
              {stressTemplates.map(template => <option key={template.label} value={template.label}>{template.label}</option>)}
            </select>
            <textarea
              className={inp + ' mb-4 h-28'}
              value={stressScenario}
              onChange={e => setStressScenario(e.target.value)}
            />
            <SubmitBtn onClick={runStress} loading={stressLoading}>Run Stress Test</SubmitBtn>
            {stressResult && <div className="mt-6"><AIResultDisplay result={stressResult.analysis || stressResult} /></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AILab;
