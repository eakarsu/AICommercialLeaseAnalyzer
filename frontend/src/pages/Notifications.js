import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { notificationsAPI } from '../services/api';

const inp = 'w-full bg-dark-900/60 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40';

const TYPE_BADGE = {
  info: 'bg-sky-500/20 text-sky-300',
  success: 'bg-emerald-500/20 text-emerald-300',
  warning: 'bg-amber-500/20 text-amber-300',
  error: 'bg-red-500/20 text-red-300',
};

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', user_id: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const r = await notificationsAPI.getAll();
      const list = Array.isArray(r.data) ? r.data : (r.data.notifications || r.data.items || r.data.data || []);
      setItems(list);
      try {
        const c = await notificationsAPI.getUnreadCount();
        setUnread(c.data.count ?? c.data.unread ?? 0);
      } catch (_) {
        setUnread(list.filter(n => !(n.read || n.is_read)).length);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form };
      if (!body.user_id) delete body.user_id;
      await notificationsAPI.create(body);
      setForm({ title: '', message: '', type: 'info', user_id: '' });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setSubmitting(false);
  };

  const markRead = async (id) => {
    try { await notificationsAPI.markRead(id); refresh(); }
    catch (err) { setError(err.response?.data?.error || err.message); }
  };

  const markAll = async () => {
    try { await notificationsAPI.markAllRead(); refresh(); }
    catch (err) { setError(err.response?.data?.error || err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try { await notificationsAPI.delete(id); refresh(); }
    catch (err) { setError(err.response?.data?.error || err.message); }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-dark-400 mt-1">{unread} unread • Generic notification inbox</p>
          </div>
          <div className="flex gap-3">
            <button onClick={markAll} className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-white text-sm font-semibold border border-dark-700">
              Mark all read
            </button>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-primary-500/25">
              + New Notification
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Create Notification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">Title</label>
                <input required className={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">Type</label>
                <select className={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">Message</label>
                <textarea required className={inp + ' h-24'} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-dark-400 font-semibold mb-2">User ID (optional)</label>
                <input className={inp} value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-dark-800 text-white text-sm font-semibold">Cancel</button>
            </div>
          </form>
        )}

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">All Notifications ({items.length})</h3>
          {loading ? (
            <p className="text-dark-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-dark-400 text-sm">No notifications.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-dark-500 border-b border-dark-700">
                  <th className="py-3">Title</th>
                  <th className="py-3">Message</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Created</th>
                  <th className="py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(n => (
                  <tr key={n.id} className="border-b border-dark-800/50 hover:bg-dark-800/40">
                    <td className="py-3 text-white font-medium">{n.title}</td>
                    <td className="py-3 text-dark-300 max-w-md truncate">{n.message}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${TYPE_BADGE[n.type] || TYPE_BADGE.info}`}>
                        {n.type || 'info'}
                      </span>
                    </td>
                    <td className="py-3">
                      {(n.read || n.is_read)
                        ? <span className="px-2 py-1 rounded text-xs bg-dark-700 text-dark-300">read</span>
                        : <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-300">unread</span>}
                    </td>
                    <td className="py-3 text-dark-300 font-mono text-xs">{n.created_at ? new Date(n.created_at).toLocaleString() : '-'}</td>
                    <td className="py-3 text-right space-x-2">
                      {!(n.read || n.is_read) && (
                        <button onClick={() => markRead(n.id)} className="px-3 py-1 rounded text-xs bg-emerald-500/10 text-emerald-300">
                          Read
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} className="px-3 py-1 rounded text-xs bg-red-500/10 text-red-300">
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

export default Notifications;
