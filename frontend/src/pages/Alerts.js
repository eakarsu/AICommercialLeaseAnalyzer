import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { alertsAPI, leaseAPI } from '../services/api';

const ALERT_TYPES = [
  { value: 'expiration', label: 'Lease Expiration' },
  { value: 'renewal', label: 'Renewal Window' },
  { value: 'rent_review', label: 'Rent Review' },
  { value: 'escalation', label: 'Escalation Trigger' },
  { value: 'option_exercise', label: 'Option Exercise' },
  { value: 'market_threshold', label: 'Market Rate Threshold' },
  { value: 'comparable_change', label: 'Comparable Property Change' },
  { value: 'tenant_credit', label: 'Tenant Credit Update' },
  { value: 'custom', label: 'Custom' },
];

const inp = 'w-full bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40';

const buildICS = (alerts) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AICommercialLeaseAnalyzer//EN',
    'CALSCALE:GREGORIAN',
  ];
  alerts.forEach((a, i) => {
    const date = (a.alertDate || '').replace(/-/g, '');
    if (!date) return;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:lease-alert-${a.id || i}@lease-analyzer`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`);
    lines.push(`DTSTART;VALUE=DATE:${date}`);
    lines.push(`SUMMARY:${(a.alertType || 'Lease Alert').replace(/[\r\n,;]/g, ' ')} - ${(a.Lease?.tenantName || 'Lease').replace(/[\r\n,;]/g, ' ')}`);
    if (a.message) lines.push(`DESCRIPTION:${a.message.replace(/[\r\n]/g, ' ').replace(/[,;]/g, ' ')}`);
    if (a.Lease?.propertyAddress) lines.push(`LOCATION:${a.Lease.propertyAddress.replace(/[\r\n,;]/g, ' ')}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [due, setDue] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lease_id: '', alert_type: 'expiration', alert_date: '', message: '' });
  const [days, setDays] = useState(90);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [a, d, l] = await Promise.all([alertsAPI.getAll(1, 100), alertsAPI.getDue(days), leaseAPI.getAll()]);
      setAlerts(a.data?.data || a.data || []);
      setDue(d.data?.alerts || []);
      setLeases(Array.isArray(l.data) ? l.data : []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await alertsAPI.create(form);
      setForm({ lease_id: '', alert_type: 'expiration', alert_date: '', message: '' });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await alertsAPI.delete(id);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const markNotified = async (id) => {
    try {
      await alertsAPI.update(id, { notified: true });
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const downloadICS = () => {
    const ics = buildICS(alerts);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lease_alerts.ics';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Alerts & Calendar</h1>
            <p className="text-dark-400 mt-1">Configurable alerts for expirations, market thresholds, and comparable changes. Export to iCal/Google Calendar.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={downloadICS} className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-white text-sm font-semibold border border-dark-700">
              Export iCal (.ics)
            </button>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-primary-500/25">
              + New Alert
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Create Alert</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">Lease</label>
                <select required className={inp} value={form.lease_id} onChange={e => setForm({ ...form, lease_id: e.target.value })}>
                  <option value="">Select lease...</option>
                  {leases.map(l => <option key={l.id || l._id} value={l.id || l._id}>{l.tenantName} - {l.propertyAddress}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">Alert Type</label>
                <select className={inp} value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })}>
                  {ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">Alert Date</label>
                <input required type="date" className={inp} value={form.alert_date} onChange={e => setForm({ ...form, alert_date: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">Message</label>
                <textarea className={inp + ' h-24'} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-dark-800 text-white text-sm font-semibold">Cancel</button>
            </div>
          </form>
        )}

        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Due Soon</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs text-dark-400">Window:</label>
              <select className={inp + ' w-28'} value={days} onChange={e => setDays(Number(e.target.value))}>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
          </div>
          {loading ? (
            <p className="text-dark-400">Loading...</p>
          ) : due.length === 0 ? (
            <p className="text-dark-400 text-sm">No alerts due in the selected window.</p>
          ) : (
            <div className="space-y-2">
              {due.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {a.alertType} - {a.Lease?.tenantName || 'Lease'}
                    </div>
                    <div className="text-xs text-dark-400">{a.Lease?.propertyAddress}</div>
                    {a.message && <div className="text-xs text-dark-300 mt-1">{a.message}</div>}
                  </div>
                  <div className="text-sm font-mono text-amber-300">{a.alertDate}</div>
                  <button onClick={() => markNotified(a.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs">
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">All Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p className="text-dark-400 text-sm">No alerts configured yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-dark-500 border-b border-dark-700">
                  <th className="py-3">Type</th>
                  <th className="py-3">Lease</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Message</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id} className="border-b border-dark-800/50 hover:bg-dark-800/40">
                    <td className="py-3 text-white capitalize">{a.alertType}</td>
                    <td className="py-3 text-dark-300">{a.Lease?.tenantName || a.leaseId}</td>
                    <td className="py-3 text-dark-300 font-mono">{a.alertDate}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${a.notified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {a.notified ? 'Notified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 text-dark-300 max-w-xs truncate">{a.message}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => handleDelete(a.id)} className="px-3 py-1 rounded text-xs bg-red-500/10 text-red-300">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
