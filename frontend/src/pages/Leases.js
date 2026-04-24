import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import AIResultDisplay from '../components/AIResultDisplay';
import { leaseAPI } from '../services/api';

const emptyForm = {
  tenantName: '', propertyAddress: '', propertyType: '', leaseType: '', startDate: '', endDate: '',
  monthlyRent: '', annualRent: '', squareFootage: '', rentPerSqFt: '', securityDeposit: '',
  leaseTermMonths: '', escalationClause: '', renewalOption: '', specialProvisions: '', status: 'Active'
};

const Leases = () => {
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
      const { data } = await leaseAPI.getAll();
      setItems(Array.isArray(data) ? data : data.leases || []);
    } catch (err) { setError('Failed to fetch leases'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRowClick = async (item) => {
    setSelected(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const handleCreate = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEdit = () => {
    setForm({ ...emptyForm, ...selected });
    setIsEditing(true);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lease?')) return;
    try {
      await leaseAPI.delete(selected._id || selected.id);
      setShowDetail(false);
      fetchItems();
    } catch (err) { setError('Failed to delete lease'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await leaseAPI.update(selected._id || selected.id, form);
      } else {
        await leaseAPI.create(form);
      }
      setShowForm(false);
      fetchItems();
    } catch (err) { setError('Failed to save lease'); }
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await leaseAPI.analyze(selected);
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
            <h1 className="text-3xl font-bold text-white">Leases</h1>
            <p className="text-dark-400 mt-1">Manage and analyze commercial lease agreements</p>
          </div>
          <button onClick={handleCreate} className="px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all shadow-lg shadow-primary-500/25">
            + New Lease
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">{error}<button onClick={() => setError('')} className="ml-4 underline">dismiss</button></div>}

        <div className="glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div><p className="text-dark-400">Loading leases...</p></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center"><p className="text-dark-400 text-lg">No leases found. Create your first lease to get started.</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Tenant</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Property</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Lease Type</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Monthly Rent</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Sq Ft</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id || item.id} onClick={() => handleRowClick(item)} className="border-b border-dark-700/30 hover:bg-dark-800/50 cursor-pointer transition-colors">
                    <td className="p-4 text-white font-medium">{item.tenantName}</td>
                    <td className="p-4 text-dark-300">{item.propertyAddress}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-xs font-medium">{item.leaseType}</span></td>
                    <td className="p-4 text-emerald-400 font-semibold">${Number(item.monthlyRent || 0).toLocaleString()}</td>
                    <td className="p-4 text-dark-300">{Number(item.squareFootage || 0).toLocaleString()}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${item.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Lease Details" size="xl">
        {selected && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Tenant Name</span><span className="text-white text-lg font-semibold">{selected.tenantName}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Property Address</span><span className="text-white">{selected.propertyAddress}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Lease Type</span><span className="px-3 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-sm font-medium">{selected.leaseType}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Status</span><span className={`px-3 py-1 rounded-lg text-sm font-medium ${selected.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{selected.status}</span></div>
              </div>
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Monthly Rent</span><span className="text-emerald-400 text-2xl font-bold">${Number(selected.monthlyRent || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Square Footage</span><span className="text-white text-lg">{Number(selected.squareFootage || 0).toLocaleString()} sq ft</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Rent Per Sq Ft</span><span className="text-white">${selected.rentPerSqFt || 'N/A'}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Security Deposit</span><span className="text-white">${Number(selected.securityDeposit || 0).toLocaleString()}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Start Date</span><span className="text-white">{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : 'N/A'}</span></div>
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">End Date</span><span className="text-white">{selected.endDate ? new Date(selected.endDate).toLocaleDateString() : 'N/A'}</span></div>
            </div>
            {selected.escalationClause && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Escalation Clause</span><span className="text-white">{selected.escalationClause}</span></div>}
            {selected.renewalOption && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Renewal Option</span><span className="text-white">{selected.renewalOption}</span></div>}
            {selected.specialProvisions && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Special Provisions</span><span className="text-white">{selected.specialProvisions}</span></div>}

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-dark-700/50">
              <button onClick={handleEdit} className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-500 transition-all">Edit</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600/20 text-red-400 font-medium rounded-xl hover:bg-red-600/30 border border-red-500/30 transition-all">Delete</button>
              <button onClick={handleAIAnalysis} disabled={aiLoading} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 ml-auto">
                {aiLoading ? '🔄 Analyzing...' : '🤖 AI Analysis'}
              </button>
            </div>

            {aiLoading && (
              <div className="mt-6 space-y-3">
                <div className="ai-loading h-6 rounded-lg w-3/4"></div>
                <div className="ai-loading h-6 rounded-lg w-1/2"></div>
                <div className="ai-loading h-6 rounded-lg w-2/3"></div>
              </div>
            )}
            <AIResultDisplay result={aiResult} type="lease" />
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={isEditing ? 'Edit Lease' : 'New Lease'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tenant Name" name="tenantName" value={form.tenantName} onChange={handleChange} placeholder="e.g., Acme Corp" required />
            <FormField label="Property Address" name="propertyAddress" value={form.propertyAddress} onChange={handleChange} placeholder="e.g., 123 Main St" required />
            <FormField label="Property Type" name="propertyType" value={form.propertyType} onChange={handleChange} type="select" options={['Office', 'Retail', 'Industrial', 'Lab/Office', 'Medical Office', 'Creative Office']} />
            <FormField label="Lease Type" name="leaseType" value={form.leaseType} onChange={handleChange} type="select" options={['Full Service Gross', 'Triple Net', 'Modified Gross', 'Percentage Lease']} required />
            <FormField label="Status" name="status" value={form.status} onChange={handleChange} type="select" options={['Active', 'Expired', 'Pending', 'Terminated']} />
            <FormField label="Lease Term (Months)" name="leaseTermMonths" value={form.leaseTermMonths} onChange={handleChange} type="number" placeholder="60" />
            <FormField label="Start Date" name="startDate" value={form.startDate} onChange={handleChange} type="date" required />
            <FormField label="End Date" name="endDate" value={form.endDate} onChange={handleChange} type="date" required />
            <FormField label="Monthly Rent ($)" name="monthlyRent" value={form.monthlyRent} onChange={handleChange} type="number" placeholder="15000" required />
            <FormField label="Annual Rent ($)" name="annualRent" value={form.annualRent} onChange={handleChange} type="number" placeholder="180000" />
            <FormField label="Square Footage" name="squareFootage" value={form.squareFootage} onChange={handleChange} type="number" placeholder="5000" />
            <FormField label="Rent Per Sq Ft ($)" name="rentPerSqFt" value={form.rentPerSqFt} onChange={handleChange} type="number" placeholder="36" />
            <FormField label="Security Deposit ($)" name="securityDeposit" value={form.securityDeposit} onChange={handleChange} type="number" placeholder="30000" />
          </div>
          <FormField label="Escalation Clause" name="escalationClause" value={form.escalationClause} onChange={handleChange} type="textarea" placeholder="e.g., 3% annual increase" />
          <FormField label="Renewal Option" name="renewalOption" value={form.renewalOption} onChange={handleChange} type="textarea" placeholder="e.g., Two 5-year renewal options" />
          <FormField label="Special Provisions" name="specialProvisions" value={form.specialProvisions} onChange={handleChange} type="textarea" placeholder="Any special lease terms" />
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-dark-700 text-dark-300 font-medium rounded-xl hover:bg-dark-600 transition-all">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all">{isEditing ? 'Update' : 'Create'} Lease</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Leases;
