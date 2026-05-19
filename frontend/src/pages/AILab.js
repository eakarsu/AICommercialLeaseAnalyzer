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

const AILab = () => {
  const [tab, setTab] = useState('comparison');
  const [leases, setLeases] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [comps, setComps] = useState([]);

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
  const runCmp = async () => {
    if (cmpIds.length < 2) return alert('Select 2-3 leases');
    setCmpLoading(true); setCmpResult(null);
    try {
      const { data } = await advancedAI.leaseComparisonReport(cmpIds);
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
  const runSub = async () => {
    if (!subLease || !subTerms) return alert('Lease and terms required');
    setSubLoading(true); setSubResult(null);
    try {
      const { data } = await advancedAI.subleaseAnalysis(subLease, subTerms);
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
  const runTerm = async () => {
    if (!termLease || !termScenario) return alert('Lease and scenario required');
    setTermLoading(true); setTermResult(null);
    try {
      const { data } = await advancedAI.earlyTermination(termLease, termScenario);
      setTermResult(data);
    } catch (e) {
      setTermResult({ error: e.response?.data?.error || e.message });
    } finally { setTermLoading(false); }
  };

  // Lease audit
  const [auditLease, setAuditLease] = useState('');
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const runAudit = async () => {
    if (!auditLease) return alert('Select lease');
    setAuditLoading(true); setAuditResult(null);
    try {
      const { data } = await advancedAI.leaseAudit(auditLease);
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
  const runClauses = async () => {
    if (!clauseDoc || clauseDoc.trim().length < 50) return alert('Paste lease document text (≥50 chars)');
    setClauseLoading(true); setClauseResult(null);
    try {
      const { data } = await advancedAI.extractClauses(clauseDoc, clauseLease || undefined, clauseFocus || undefined);
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
  const runStress = async () => {
    if (!stressPortfolio) return alert('Select portfolio entry');
    setStressLoading(true); setStressResult(null);
    try {
      const { data } = await portfolioAPI.analyze({ portfolioId: stressPortfolio, scenario: stressScenario });
      setStressResult(data);
    } catch (e) {
      setStressResult({ error: e.response?.data?.error || e.message });
    } finally { setStressLoading(false); }
  };

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
        </div>

        {tab === 'comparison' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Lease Comparison Report</h3>
            <p className="text-dark-400 text-sm mb-4">Select 2-3 leases to generate an AI side-by-side analysis with variance and recommendations.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 max-h-72 overflow-y-auto">
              {leases.map(l => {
                const id = l.id || l._id;
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
            <select className={inp + ' mb-4'} value={subLease} onChange={e => setSubLease(e.target.value)}>
              <option value="">Select lease...</option>
              {leases.map(l => <option key={l.id || l._id} value={l.id || l._id}>{l.tenantName} - {l.propertyAddress}</option>)}
            </select>
            <FieldLabel>Sublease Terms</FieldLabel>
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
            <select className={inp + ' mb-4'} value={termLease} onChange={e => setTermLease(e.target.value)}>
              <option value="">Select lease...</option>
              {leases.map(l => <option key={l.id || l._id} value={l.id || l._id}>{l.tenantName} - {l.propertyAddress}</option>)}
            </select>
            <FieldLabel>Exit Scenario</FieldLabel>
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
            <select className={inp + ' mb-4'} value={auditLease} onChange={e => setAuditLease(e.target.value)}>
              <option value="">Select lease...</option>
              {leases.map(l => <option key={l.id || l._id} value={l.id || l._id}>{l.tenantName} - {l.propertyAddress}</option>)}
            </select>
            <SubmitBtn onClick={runAudit} loading={auditLoading}>Run Lease Audit</SubmitBtn>
            {auditResult && <div className="mt-6"><AIResultDisplay result={auditResult.audit || auditResult} /></div>}
          </div>
        )}

        {tab === 'clauses' && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Extract Clauses</h3>
            <p className="text-dark-400 text-sm mb-4">Paste raw lease document text to extract clause-level structured data (parties, term, rent, escalation, options, default, indemnity, insurance, assignment, red flags, missing clauses).</p>
            <FieldLabel>Lease (optional — for cross-check)</FieldLabel>
            <select className={inp + ' mb-4'} value={clauseLease} onChange={e => setClauseLease(e.target.value)}>
              <option value="">— None —</option>
              {leases.map(l => <option key={l.id || l._id} value={l.id || l._id}>{l.tenantName} - {l.propertyAddress}</option>)}
            </select>
            <FieldLabel>Document Text</FieldLabel>
            <textarea
              className={inp + ' mb-4 h-64 font-mono text-xs'}
              placeholder="Paste lease document text here (minimum 50 characters; truncated to ~24k chars)..."
              value={clauseDoc}
              onChange={e => setClauseDoc(e.target.value)}
            />
            <FieldLabel>Special Focus (optional)</FieldLabel>
            <input
              className={inp + ' mb-4'}
              placeholder='e.g. "co-tenancy and exclusive use"'
              value={clauseFocus}
              onChange={e => setClauseFocus(e.target.value)}
            />
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
            <select className={inp + ' mb-4'} value={stressPortfolio} onChange={e => setStressPortfolio(e.target.value)}>
              <option value="">Select portfolio...</option>
              {portfolio.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.propertyName} - {p.market}</option>)}
            </select>
            <FieldLabel>Stress Scenario</FieldLabel>
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
