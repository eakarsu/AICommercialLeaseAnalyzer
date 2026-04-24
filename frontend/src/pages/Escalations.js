import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import AIResultDisplay from '../components/AIResultDisplay';
import { escalationAPI } from '../services/api';

const emptyForm = {
  leaseName: '', tenantName: '', propertyAddress: '', escalationType: '', baseRent: '',
  escalationRate: '', escalationFrequency: '', startDate: '', endDate: '',
  cpiIndex: '', capRate: '', floorRate: '', notes: ''
};

const Escalations = () => {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await escalationAPI.getAll();
      setItems(Array.isArray(data) ? data : data.escalations || []);
    } catch (err) { setError('Failed to fetch escalations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRowClick = (item) => {
    setSelected(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const handleCreate = () => { setForm(emptyForm); setIsEditing(false); setShowForm(true); };

  const handleEdit = () => {
    setForm({ ...emptyForm, ...selected });
    setIsEditing(true);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this escalation?')) return;
    try {
      await escalationAPI.delete(selected._id || selected.id);
      setShowDetail(false);
      fetchItems();
    } catch (err) { setError('Failed to delete escalation'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await escalationAPI.update(selected._id || selected.id, form);
      } else {
        await escalationAPI.create(form);
      }
      setShowForm(false);
      fetchItems();
    } catch (err) { setError('Failed to save escalation'); }
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await escalationAPI.analyze(selected);
      setAiResult(data.analysis || data);
    } catch (err) { setError('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Rent Escalations</h1>
            <p className="text-dark-400 mt-1">Model and project rent escalation schedules</p>
          </div>
          <button onClick={handleCreate} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25">
            + New Escalation
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">{error}<button onClick={() => setError('')} className="ml-4 underline">dismiss</button></div>}

        <div className="glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div><p className="text-dark-400">Loading escalations...</p></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center"><p className="text-dark-400 text-lg">No escalations found. Create your first escalation model.</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Lease / Tenant</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Property</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Base Rent</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Rate</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id || item.id} onClick={() => handleRowClick(item)} className="border-b border-dark-700/30 hover:bg-dark-800/50 cursor-pointer transition-colors">
                    <td className="p-4"><span className="text-white font-medium">{item.leaseName || item.tenantName}</span></td>
                    <td className="p-4 text-dark-300">{item.propertyAddress}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">{item.escalationType}</span></td>
                    <td className="p-4 text-emerald-400 font-semibold">${Number(item.baseRent || 0).toLocaleString()}</td>
                    <td className="p-4 text-white">{item.escalationRate}%</td>
                    <td className="p-4 text-dark-300">{item.escalationFrequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Escalation Details" size="xl">
        {selected && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Lease / Tenant</span><span className="text-white text-lg font-semibold">{selected.leaseName || selected.tenantName}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Property Address</span><span className="text-white">{selected.propertyAddress}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Escalation Type</span><span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium">{selected.escalationType}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Frequency</span><span className="text-white">{selected.escalationFrequency}</span></div>
              </div>
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Base Rent</span><span className="text-emerald-400 text-2xl font-bold">${Number(selected.baseRent || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Escalation Rate</span><span className="text-white text-lg">{selected.escalationRate}%</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">CPI Index</span><span className="text-white">{selected.cpiIndex || 'N/A'}</span></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Cap Rate</span><span className="text-white">{selected.capRate || 'N/A'}%</span></div>
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Floor Rate</span><span className="text-white">{selected.floorRate || 'N/A'}%</span></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Start Date</span><span className="text-white">{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : 'N/A'}</span></div>
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">End Date</span><span className="text-white">{selected.endDate ? new Date(selected.endDate).toLocaleDateString() : 'N/A'}</span></div>
            </div>
            {selected.notes && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Notes</span><span className="text-white">{selected.notes}</span></div>}

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-dark-700/50">
              <button onClick={handleEdit} className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-500 transition-all">Edit</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600/20 text-red-400 font-medium rounded-xl hover:bg-red-600/30 border border-red-500/30 transition-all">Delete</button>
              <button onClick={handleAIAnalysis} disabled={aiLoading} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 ml-auto">
                {aiLoading ? '🔄 Analyzing...' : '🤖 AI Analysis'}
              </button>
            </div>

            {aiLoading && <div className="mt-6 space-y-3"><div className="ai-loading h-6 rounded-lg w-3/4"></div><div className="ai-loading h-6 rounded-lg w-1/2"></div><div className="ai-loading h-6 rounded-lg w-2/3"></div></div>}
            <AIResultDisplay result={aiResult} type="escalation" />
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={isEditing ? 'Edit Escalation' : 'New Escalation'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Lease Name" name="leaseName" value={form.leaseName} onChange={handleChange} placeholder="e.g., Main Office Lease" required />
            <FormField label="Tenant Name" name="tenantName" value={form.tenantName} onChange={handleChange} placeholder="e.g., Acme Corp" required />
            <FormField label="Property Address" name="propertyAddress" value={form.propertyAddress} onChange={handleChange} placeholder="e.g., 123 Main St" />
            <FormField label="Escalation Type" name="escalationType" value={form.escalationType} onChange={handleChange} type="select" options={['Fixed', 'CPI-Based', 'Percentage', 'Hybrid', 'Step-Up']} required />
            <FormField label="Base Rent ($)" name="baseRent" value={form.baseRent} onChange={handleChange} type="number" placeholder="15000" required />
            <FormField label="Escalation Rate (%)" name="escalationRate" value={form.escalationRate} onChange={handleChange} type="number" placeholder="3" required />
            <FormField label="Frequency" name="escalationFrequency" value={form.escalationFrequency} onChange={handleChange} type="select" options={['Annual', 'Semi-Annual', 'Quarterly', 'Monthly']} required />
            <FormField label="CPI Index" name="cpiIndex" value={form.cpiIndex} onChange={handleChange} placeholder="e.g., CPI-U" />
            <FormField label="Start Date" name="startDate" value={form.startDate} onChange={handleChange} type="date" required />
            <FormField label="End Date" name="endDate" value={form.endDate} onChange={handleChange} type="date" required />
            <FormField label="Cap Rate (%)" name="capRate" value={form.capRate} onChange={handleChange} type="number" placeholder="5" />
            <FormField label="Floor Rate (%)" name="floorRate" value={form.floorRate} onChange={handleChange} type="number" placeholder="2" />
          </div>
          <FormField label="Notes" name="notes" value={form.notes} onChange={handleChange} type="textarea" placeholder="Additional notes about the escalation" />
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-dark-700 text-dark-300 font-medium rounded-xl hover:bg-dark-600 transition-all">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all">{isEditing ? 'Update' : 'Create'} Escalation</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Escalations;
