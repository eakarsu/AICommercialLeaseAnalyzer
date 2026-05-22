import React, { useEffect, useState } from 'react';
import api from '../services/api';

const empty = { name: '', category: 'General', riskWeight: 0.5, severity: 'Medium', description: '' };

const sevColor = (s) => ({
  Low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  High: 'bg-red-500/15 text-red-300 border-red-500/30',
}[s] || 'bg-dark-700/40 text-dark-300 border-dark-600/40');

const ClauseRulesEditor = () => {
  const [rules, setRules] = useState([]);
  const [draft, setDraft] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/custom-views/clause-rules');
      setRules(data.rules || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (editingId) {
        await api.put(`/custom-views/clause-rules/${editingId}`, draft);
      } else {
        await api.post('/custom-views/clause-rules', draft);
      }
      setDraft(empty); setEditingId(null); await load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  const editRule = (r) => {
    setEditingId(r.id);
    setDraft({ name: r.name, category: r.category, riskWeight: r.riskWeight, severity: r.severity, description: r.description });
  };

  const removeRule = async (id) => {
    if (!window.confirm('Delete this clause rule?')) return;
    try {
      await api.delete(`/custom-views/clause-rules/${id}`);
      await load();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  return (
    <div className="glass rounded-2xl p-6" data-testid="clause-rules-editor">
      <h3 className="text-lg font-bold text-white mb-4">Clause Rules Editor</h3>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
        <input
          className="md:col-span-3 bg-dark-900/50 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm"
          placeholder="Clause name"
          value={draft.name}
          onChange={e => setDraft({ ...draft, name: e.target.value })}
          required
        />
        <input
          className="md:col-span-2 bg-dark-900/50 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm"
          placeholder="Category"
          value={draft.category}
          onChange={e => setDraft({ ...draft, category: e.target.value })}
        />
        <div className="md:col-span-2">
          <label className="block text-dark-400 text-xs mb-1">Risk weight {Number(draft.riskWeight).toFixed(2)}</label>
          <input
            type="range" min="0" max="1" step="0.05"
            value={draft.riskWeight}
            onChange={e => setDraft({ ...draft, riskWeight: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        <select
          className="md:col-span-2 bg-dark-900/50 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm"
          value={draft.severity}
          onChange={e => setDraft({ ...draft, severity: e.target.value })}
        >
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
        <input
          className="md:col-span-3 bg-dark-900/50 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm"
          placeholder="Short description"
          value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })}
        />
        <div className="md:col-span-12 flex gap-2">
          <button
            type="submit" disabled={busy}
            className="bg-gradient-to-r from-primary-600 to-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50"
          >
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setDraft(empty); }}
              className="bg-dark-700/60 text-dark-200 text-sm font-medium px-4 py-2 rounded-lg"
            >Cancel</button>
          )}
          {err && <span className="text-red-400 text-xs self-center">Error: {err}</span>}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-dark-400 border-b border-dark-700/50">
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Risk</th>
              <th className="p-2">Severity</th>
              <th className="p-2">Description</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-dark-800/40">
                <td className="p-2 text-white font-medium">{r.name}</td>
                <td className="p-2 text-dark-300">{r.category}</td>
                <td className="p-2 text-dark-300">{Number(r.riskWeight).toFixed(2)}</td>
                <td className="p-2"><span className={`text-xs border rounded px-2 py-0.5 ${sevColor(r.severity)}`}>{r.severity}</span></td>
                <td className="p-2 text-dark-300 max-w-xs">{r.description}</td>
                <td className="p-2 whitespace-nowrap">
                  <button onClick={() => editRule(r)} className="text-primary-400 text-xs mr-2">Edit</button>
                  <button onClick={() => removeRule(r.id)} className="text-red-400 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan="6" className="text-center text-dark-400 py-6">No clause rules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClauseRulesEditor;
