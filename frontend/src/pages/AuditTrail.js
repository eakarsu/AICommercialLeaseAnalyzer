import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import { auditAPI } from '../services/api';

const emptyForm = {
  action: 'review',
  entityType: 'lease',
  entityId: '',
  title: '',
  status: 'completed',
  source: 'manual',
  detailsText: ''
};

const actionOptions = ['create', 'update', 'delete', 'review', 'run_ai', 'export'];
const entityOptions = ['lease', 'escalation', 'negotiation', 'portfolio', 'marketComp', 'alert', 'aiLab', 'chatbot', 'report', 'customView'];
const statusOptions = ['completed', 'pending', 'failed', 'needs_review'];
const sourceOptions = ['manual', 'app', 'chatbot', 'seed', 'ai', 'export'];

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'N/A';

const parseDetails = (detailsText) => {
  if (!detailsText?.trim()) return {};
  try {
    return JSON.parse(detailsText);
  } catch {
    return { note: detailsText.trim() };
  }
};

const detailToText = (details) => {
  if (!details) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return '';
  }
};

const badgeClass = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (['completed', 'create'].includes(normalized)) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  if (['failed', 'delete'].includes(normalized)) return 'bg-red-500/10 text-red-300 border-red-500/30';
  if (['pending', 'needs_review', 'update'].includes(normalized)) return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  return 'bg-primary-500/10 text-primary-300 border-primary-500/30';
};

const AuditTrail = () => {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await auditAPI.getAll();
      setItems(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({
      action: selected.action || 'review',
      entityType: selected.entityType || 'lease',
      entityId: selected.entityId || '',
      title: selected.title || '',
      status: selected.status || 'completed',
      source: selected.source || 'manual',
      detailsText: detailToText(selected.details)
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      action: form.action,
      entityType: form.entityType,
      entityId: form.entityId,
      title: form.title,
      status: form.status,
      source: form.source,
      details: parseDetails(form.detailsText)
    };

    try {
      if (isEditing && selected) {
        const { data } = await auditAPI.update(selected.id, payload);
        setSelected(data);
      } else {
        await auditAPI.create(payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm('Delete this audit log?')) return;
    try {
      await auditAPI.delete(selected.id);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Audit Trail</h1>
            <p className="mt-1 text-dark-400">Track creates, updates, deletes, AI runs, exports, and chatbot-driven actions.</p>
          </div>
          <button onClick={openCreate} className="rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-950/30 transition hover:from-primary-500 hover:to-cyan-500">
            New Audit Entry
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
            <button onClick={() => setError('')} className="ml-4 underline">dismiss</button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-dark-700/60 bg-dark-900/90">
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-dark-400">When</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-dark-400">Action</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-dark-400">Entity</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-dark-400">Title</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-dark-400">Source</th>
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-dark-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-dark-400">Loading audit trail...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-dark-400">No audit entries yet.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer border-b border-dark-700/30 transition hover:bg-dark-800/60">
                    <td className="p-4 text-sm text-dark-300">{formatDate(item.createdAt)}</td>
                    <td className="p-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(item.action)}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-dark-200">{item.entityType} {item.entityId ? `#${item.entityId}` : ''}</td>
                    <td className="p-4 text-sm font-medium text-white">{item.title}</td>
                    <td className="p-4 text-sm text-dark-300">{item.source}</td>
                    <td className="p-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Audit Entry Details" size="xl">
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  ['Action', selected.action],
                  ['Entity', `${selected.entityType}${selected.entityId ? ` #${selected.entityId}` : ''}`],
                  ['Status', selected.status],
                  ['Source', selected.source],
                  ['Created', formatDate(selected.createdAt)],
                  ['Updated', formatDate(selected.updatedAt)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-dark-700/60 bg-dark-900/60 p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-dark-500">{label}</div>
                    <div className="break-words text-sm text-white">{value || 'N/A'}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-dark-700/60 bg-dark-900/60 p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-dark-500">Title</div>
                <div className="text-base font-semibold text-white">{selected.title}</div>
              </div>
              <div className="rounded-xl border border-dark-700/60 bg-dark-900/60 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-dark-500">Details</div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-dark-200">
                  {detailToText(selected.details) || 'No structured details'}
                </pre>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={openEdit} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500">Edit</button>
                <button onClick={remove} className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20">Delete</button>
                <button onClick={() => setSelected(null)} className="ml-auto rounded-xl bg-dark-800 px-5 py-2.5 text-sm font-semibold text-dark-200 hover:bg-dark-700">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={isEditing ? 'Edit Audit Entry' : 'New Audit Entry'} size="xl">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Action" name="action" value={form.action} onChange={handleChange} type="select" options={actionOptions} required />
              <FormField label="Entity Type" name="entityType" value={form.entityType} onChange={handleChange} type="select" options={entityOptions} required />
              <FormField label="Entity ID" name="entityId" value={form.entityId} onChange={handleChange} placeholder="Optional record id" />
              <FormField label="Status" name="status" value={form.status} onChange={handleChange} type="select" options={statusOptions} required />
              <FormField label="Source" name="source" value={form.source} onChange={handleChange} type="select" options={sourceOptions} required />
            </div>
            <FormField label="Title" name="title" value={form.title} onChange={handleChange} placeholder="Human-readable audit event" required />
            <FormField label="Details JSON or Note" name="detailsText" value={form.detailsText} onChange={handleChange} type="textarea" rows={6} placeholder='{"field":"value"} or plain text note' />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-dark-800 px-5 py-2.5 text-sm font-semibold text-dark-200 hover:bg-dark-700">Cancel</button>
              <button type="submit" className="rounded-xl bg-gradient-to-r from-primary-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-primary-500 hover:to-cyan-500">
                {isEditing ? 'Update' : 'Create'} Entry
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default AuditTrail;
