import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import AIResultDisplay from '../components/AIResultDisplay';
import { negotiationAPI } from '../services/api';

const emptyForm = {
  tenantName: '', propertyAddress: '', negotiationType: '', currentRent: '', proposedRent: '',
  marketRate: '', leaseExpiry: '', tenantCreditRating: '', tenantIndustry: '',
  occupancyRate: '', tiAllowance: '', freeRentMonths: '', termLength: '',
  landlordPriorities: '', tenantPriorities: '', status: 'In Progress', notes: ''
};

const Negotiations = () => {
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
      const { data } = await negotiationAPI.getAll();
      setItems(Array.isArray(data) ? data : data.negotiations || []);
    } catch (err) { setError('Failed to fetch negotiations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRowClick = (item) => { setSelected(item); setAiResult(null); setShowDetail(true); };
  const handleCreate = () => { setForm(emptyForm); setIsEditing(false); setShowForm(true); };

  const handleEdit = () => {
    setForm({ ...emptyForm, ...selected });
    setIsEditing(true);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this negotiation?')) return;
    try {
      await negotiationAPI.delete(selected._id || selected.id);
      setShowDetail(false);
      fetchItems();
    } catch (err) { setError('Failed to delete negotiation'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await negotiationAPI.update(selected._id || selected.id, form);
      } else {
        await negotiationAPI.create(form);
      }
      setShowForm(false);
      fetchItems();
    } catch (err) { setError('Failed to save negotiation'); }
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await negotiationAPI.analyze(selected);
      setAiResult(data.analysis || data);
    } catch (err) { setError('AI analysis failed'); }
    finally { setAiLoading(false); }
  };

  const statusColors = {
    'In Progress': 'bg-amber-500/10 text-amber-400',
    'Completed': 'bg-emerald-500/10 text-emerald-400',
    'Stalled': 'bg-red-500/10 text-red-400',
    'Pending': 'bg-blue-500/10 text-blue-400'
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Renewal Negotiations</h1>
            <p className="text-dark-400 mt-1">AI-driven negotiation insights and strategies</p>
          </div>
          <button onClick={handleCreate} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25">
            + New Negotiation
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">{error}<button onClick={() => setError('')} className="ml-4 underline">dismiss</button></div>}

        <div className="glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div><p className="text-dark-400">Loading negotiations...</p></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center"><p className="text-dark-400 text-lg">No negotiations found. Start tracking your first negotiation.</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Tenant</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Property</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Current Rent</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Proposed Rent</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id || item.id} onClick={() => handleRowClick(item)} className="border-b border-dark-700/30 hover:bg-dark-800/50 cursor-pointer transition-colors">
                    <td className="p-4 text-white font-medium">{item.tenantName}</td>
                    <td className="p-4 text-dark-300">{item.propertyAddress}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs font-medium">{item.negotiationType}</span></td>
                    <td className="p-4 text-dark-300">${Number(item.currentRent || 0).toLocaleString()}</td>
                    <td className="p-4 text-emerald-400 font-semibold">${Number(item.proposedRent || 0).toLocaleString()}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[item.status] || statusColors['In Progress']}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Negotiation Details" size="xl">
        {selected && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Tenant Name</span><span className="text-white text-lg font-semibold">{selected.tenantName}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Property Address</span><span className="text-white">{selected.propertyAddress}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Negotiation Type</span><span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-sm font-medium">{selected.negotiationType}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Status</span><span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[selected.status] || ''}`}>{selected.status}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Tenant Credit Rating</span><span className="text-white">{selected.tenantCreditRating || 'N/A'}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Tenant Industry</span><span className="text-white">{selected.tenantIndustry || 'N/A'}</span></div>
              </div>
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Current Rent</span><span className="text-white text-2xl font-bold">${Number(selected.currentRent || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Proposed Rent</span><span className="text-emerald-400 text-2xl font-bold">${Number(selected.proposedRent || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Market Rate</span><span className="text-primary-400 text-lg">${Number(selected.marketRate || 0).toLocaleString()}</span></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">TI Allowance</span><span className="text-white">${Number(selected.tiAllowance || 0).toLocaleString()}</span></div>
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Free Rent</span><span className="text-white">{selected.freeRentMonths || '0'} months</span></div>
                </div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Lease Expiry</span><span className="text-white">{selected.leaseExpiry ? new Date(selected.leaseExpiry).toLocaleDateString() : 'N/A'}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Occupancy Rate</span><span className="text-white">{selected.occupancyRate || 'N/A'}%</span></div>
              </div>
            </div>
            {selected.landlordPriorities && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Landlord Priorities</span><span className="text-white">{selected.landlordPriorities}</span></div>}
            {selected.tenantPriorities && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Tenant Priorities</span><span className="text-white">{selected.tenantPriorities}</span></div>}
            {selected.notes && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Notes</span><span className="text-white">{selected.notes}</span></div>}

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-dark-700/50">
              <button onClick={handleEdit} className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-500 transition-all">Edit</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600/20 text-red-400 font-medium rounded-xl hover:bg-red-600/30 border border-red-500/30 transition-all">Delete</button>
              <button onClick={handleAIAnalysis} disabled={aiLoading} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 ml-auto">
                {aiLoading ? '🔄 Analyzing...' : '🤖 AI Analysis'}
              </button>
            </div>

            {aiLoading && <div className="mt-6 space-y-3"><div className="ai-loading h-6 rounded-lg w-3/4"></div><div className="ai-loading h-6 rounded-lg w-1/2"></div><div className="ai-loading h-6 rounded-lg w-2/3"></div></div>}
            <AIResultDisplay result={aiResult} type="negotiation" />
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={isEditing ? 'Edit Negotiation' : 'New Negotiation'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tenant Name" name="tenantName" value={form.tenantName} onChange={handleChange} placeholder="e.g., Acme Corp" required />
            <FormField label="Property Address" name="propertyAddress" value={form.propertyAddress} onChange={handleChange} placeholder="e.g., 123 Main St" required />
            <FormField label="Negotiation Type" name="negotiationType" value={form.negotiationType} onChange={handleChange} type="select" options={['Renewal', 'New Lease', 'Expansion', 'Contraction', 'Blend & Extend']} required />
            <FormField label="Status" name="status" value={form.status} onChange={handleChange} type="select" options={['In Progress', 'Completed', 'Stalled', 'Pending']} />
            <FormField label="Current Rent ($)" name="currentRent" value={form.currentRent} onChange={handleChange} type="number" placeholder="15000" required />
            <FormField label="Proposed Rent ($)" name="proposedRent" value={form.proposedRent} onChange={handleChange} type="number" placeholder="16500" required />
            <FormField label="Market Rate ($)" name="marketRate" value={form.marketRate} onChange={handleChange} type="number" placeholder="17000" />
            <FormField label="Lease Expiry" name="leaseExpiry" value={form.leaseExpiry} onChange={handleChange} type="date" />
            <FormField label="Tenant Credit Rating" name="tenantCreditRating" value={form.tenantCreditRating} onChange={handleChange} type="select" options={['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC']} />
            <FormField label="Tenant Industry" name="tenantIndustry" value={form.tenantIndustry} onChange={handleChange} placeholder="e.g., Technology" />
            <FormField label="Occupancy Rate (%)" name="occupancyRate" value={form.occupancyRate} onChange={handleChange} type="number" placeholder="95" />
            <FormField label="TI Allowance ($)" name="tiAllowance" value={form.tiAllowance} onChange={handleChange} type="number" placeholder="50000" />
            <FormField label="Free Rent Months" name="freeRentMonths" value={form.freeRentMonths} onChange={handleChange} type="number" placeholder="2" />
            <FormField label="Term Length (months)" name="termLength" value={form.termLength} onChange={handleChange} type="number" placeholder="60" />
          </div>
          <FormField label="Landlord Priorities" name="landlordPriorities" value={form.landlordPriorities} onChange={handleChange} type="textarea" placeholder="e.g., Maximize rent, long-term stability" />
          <FormField label="Tenant Priorities" name="tenantPriorities" value={form.tenantPriorities} onChange={handleChange} type="textarea" placeholder="e.g., Lower rent, flexibility" />
          <FormField label="Notes" name="notes" value={form.notes} onChange={handleChange} type="textarea" placeholder="Additional negotiation notes" />
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-dark-700 text-dark-300 font-medium rounded-xl hover:bg-dark-600 transition-all">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all">{isEditing ? 'Update' : 'Create'} Negotiation</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Negotiations;
