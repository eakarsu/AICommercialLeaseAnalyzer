import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

const empty = { lease: '', anchorTenant: '', trigger: '', remedy: '', status: 'watch' };

export default function CoTenancyClauseWatch() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, review: 0, watch: 0 });
  const [form, setForm] = useState(empty);

  const load = async () => {
    const response = await fetch('/api/co-tenancy-clause-watch');
    const data = await response.json();
    setRows(data.rows || []);
    setSummary(data.summary || { total: 0, review: 0, watch: 0 });
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    await fetch('/api/co-tenancy-clause-watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm(empty);
    load();
  };

  const fields = [
    { key: 'lease', label: 'Lease' },
    { key: 'anchorTenant', label: 'Anchor tenant' },
    { key: 'trigger', label: 'Trigger' },
    { key: 'remedy', label: 'Remedy' }
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Co-Tenancy Clause Watch</h1>
          <p className="mt-2 text-dark-400">Anchor tenant triggers, remedies, and review status across leases.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {['total', 'review', 'watch'].map((key) => (
            <div key={key} className="glass rounded-xl p-5">
              <div className="text-sm font-medium uppercase tracking-wide text-dark-400">{key}</div>
              <div className="mt-2 text-3xl font-bold text-white">{summary[key] || 0}</div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="glass mb-6 grid grid-cols-1 gap-4 rounded-xl p-5 lg:grid-cols-5">
          {fields.map((field) => (
            <input
              key={field.key}
              placeholder={field.label}
              value={form[field.key]}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              className="rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-sm text-white placeholder:text-dark-500 focus:border-primary-500 focus:outline-none"
            />
          ))}
          <div className="flex gap-3">
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-sm text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="watch">watch</option>
              <option value="review">review</option>
              <option value="clear">clear</option>
            </select>
            <button className="rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-500">
              Add
            </button>
          </div>
        </form>

        <div className="glass overflow-hidden rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/60">
                <th className="p-4 text-left text-sm font-medium text-dark-400">Lease</th>
                <th className="p-4 text-left text-sm font-medium text-dark-400">Anchor Tenant</th>
                <th className="p-4 text-left text-sm font-medium text-dark-400">Trigger</th>
                <th className="p-4 text-left text-sm font-medium text-dark-400">Remedy</th>
                <th className="p-4 text-left text-sm font-medium text-dark-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-dark-700/30">
                  <td className="p-4 font-medium text-white">{row.lease}</td>
                  <td className="p-4 text-dark-300">{row.anchorTenant}</td>
                  <td className="p-4 text-dark-300">{row.trigger}</td>
                  <td className="p-4 text-dark-300">{row.remedy}</td>
                  <td className="p-4">
                    <span className="rounded-lg bg-primary-500/10 px-2 py-1 text-xs font-medium text-primary-300">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
