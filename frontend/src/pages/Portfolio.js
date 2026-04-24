import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import AIResultDisplay from '../components/AIResultDisplay';
import { portfolioAPI } from '../services/api';

const emptyForm = {
  propertyName: '', propertyAddress: '', propertyType: '', acquisitionDate: '', purchasePrice: '',
  currentValue: '', squareFootage: '', occupancyRate: '', annualNOI: '', capRate: '',
  debtService: '', loanBalance: '', yearBuilt: '', lastRenovation: '',
  parkingSpaces: '', amenities: '', notes: '', status: 'Active'
};

const Portfolio = () => {
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
      const { data } = await portfolioAPI.getAll();
      setItems(Array.isArray(data) ? data : data.portfolio || data.properties || []);
    } catch (err) { setError('Failed to fetch portfolio'); }
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
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      await portfolioAPI.delete(selected._id || selected.id);
      setShowDetail(false);
      fetchItems();
    } catch (err) { setError('Failed to delete property'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await portfolioAPI.update(selected._id || selected.id, form);
      } else {
        await portfolioAPI.create(form);
      }
      setShowForm(false);
      fetchItems();
    } catch (err) { setError('Failed to save property'); }
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await portfolioAPI.analyze(selected);
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
            <h1 className="text-3xl font-bold text-white">Portfolio</h1>
            <p className="text-dark-400 mt-1">Optimize your commercial real estate portfolio</p>
          </div>
          <button onClick={handleCreate} className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25">
            + New Property
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">{error}<button onClick={() => setError('')} className="ml-4 underline">dismiss</button></div>}

        <div className="glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div><p className="text-dark-400">Loading portfolio...</p></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center"><p className="text-dark-400 text-lg">No properties found. Add your first property to the portfolio.</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Property</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Current Value</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Annual NOI</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Occupancy</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id || item.id} onClick={() => handleRowClick(item)} className="border-b border-dark-700/30 hover:bg-dark-800/50 cursor-pointer transition-colors">
                    <td className="p-4"><div><span className="text-white font-medium block">{item.propertyName}</span><span className="text-dark-400 text-sm">{item.propertyAddress}</span></div></td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium">{item.propertyType}</span></td>
                    <td className="p-4 text-emerald-400 font-semibold">${Number(item.currentValue || 0).toLocaleString()}</td>
                    <td className="p-4 text-primary-400 font-semibold">${Number(item.annualNOI || 0).toLocaleString()}</td>
                    <td className="p-4 text-white">{item.occupancyRate || 'N/A'}%</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${item.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Property Details" size="xl">
        {selected && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Property Name</span><span className="text-white text-lg font-semibold">{selected.propertyName}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Address</span><span className="text-white">{selected.propertyAddress}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Property Type</span><span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-medium">{selected.propertyType}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Year Built</span><span className="text-white">{selected.yearBuilt || 'N/A'}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Last Renovation</span><span className="text-white">{selected.lastRenovation || 'N/A'}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Square Footage</span><span className="text-white">{Number(selected.squareFootage || 0).toLocaleString()} sq ft</span></div>
              </div>
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Current Value</span><span className="text-emerald-400 text-2xl font-bold">${Number(selected.currentValue || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Purchase Price</span><span className="text-white text-lg">${Number(selected.purchasePrice || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Annual NOI</span><span className="text-primary-400 text-lg font-semibold">${Number(selected.annualNOI || 0).toLocaleString()}</span></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Cap Rate</span><span className="text-white">{selected.capRate || 'N/A'}%</span></div>
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Occupancy</span><span className="text-white">{selected.occupancyRate || 'N/A'}%</span></div>
                </div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Debt Service</span><span className="text-white">${Number(selected.debtService || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Loan Balance</span><span className="text-white">${Number(selected.loanBalance || 0).toLocaleString()}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Acquisition Date</span><span className="text-white">{selected.acquisitionDate ? new Date(selected.acquisitionDate).toLocaleDateString() : 'N/A'}</span></div>
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Parking Spaces</span><span className="text-white">{selected.parkingSpaces || 'N/A'}</span></div>
            </div>
            {selected.amenities && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Amenities</span><span className="text-white">{selected.amenities}</span></div>}
            {selected.notes && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Notes</span><span className="text-white">{selected.notes}</span></div>}

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-dark-700/50">
              <button onClick={handleEdit} className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-500 transition-all">Edit</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600/20 text-red-400 font-medium rounded-xl hover:bg-red-600/30 border border-red-500/30 transition-all">Delete</button>
              <button onClick={handleAIAnalysis} disabled={aiLoading} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 ml-auto">
                {aiLoading ? '🔄 Analyzing...' : '🤖 AI Analysis'}
              </button>
            </div>

            {aiLoading && <div className="mt-6 space-y-3"><div className="ai-loading h-6 rounded-lg w-3/4"></div><div className="ai-loading h-6 rounded-lg w-1/2"></div><div className="ai-loading h-6 rounded-lg w-2/3"></div></div>}
            <AIResultDisplay result={aiResult} type="portfolio" />
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={isEditing ? 'Edit Property' : 'New Property'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Property Name" name="propertyName" value={form.propertyName} onChange={handleChange} placeholder="e.g., Downtown Tower" required />
            <FormField label="Property Address" name="propertyAddress" value={form.propertyAddress} onChange={handleChange} placeholder="e.g., 456 Business Ave" required />
            <FormField label="Property Type" name="propertyType" value={form.propertyType} onChange={handleChange} type="select" options={['Office', 'Retail', 'Industrial', 'Mixed-Use', 'Multifamily', 'Medical', 'Warehouse']} required />
            <FormField label="Status" name="status" value={form.status} onChange={handleChange} type="select" options={['Active', 'Under Contract', 'Listed for Sale', 'Under Development']} />
            <FormField label="Acquisition Date" name="acquisitionDate" value={form.acquisitionDate} onChange={handleChange} type="date" />
            <FormField label="Purchase Price ($)" name="purchasePrice" value={form.purchasePrice} onChange={handleChange} type="number" placeholder="5000000" />
            <FormField label="Current Value ($)" name="currentValue" value={form.currentValue} onChange={handleChange} type="number" placeholder="6500000" required />
            <FormField label="Square Footage" name="squareFootage" value={form.squareFootage} onChange={handleChange} type="number" placeholder="50000" />
            <FormField label="Occupancy Rate (%)" name="occupancyRate" value={form.occupancyRate} onChange={handleChange} type="number" placeholder="95" />
            <FormField label="Annual NOI ($)" name="annualNOI" value={form.annualNOI} onChange={handleChange} type="number" placeholder="450000" />
            <FormField label="Cap Rate (%)" name="capRate" value={form.capRate} onChange={handleChange} type="number" placeholder="7" />
            <FormField label="Debt Service ($)" name="debtService" value={form.debtService} onChange={handleChange} type="number" placeholder="250000" />
            <FormField label="Loan Balance ($)" name="loanBalance" value={form.loanBalance} onChange={handleChange} type="number" placeholder="3000000" />
            <FormField label="Year Built" name="yearBuilt" value={form.yearBuilt} onChange={handleChange} type="number" placeholder="1995" />
            <FormField label="Last Renovation" name="lastRenovation" value={form.lastRenovation} onChange={handleChange} placeholder="e.g., 2020" />
            <FormField label="Parking Spaces" name="parkingSpaces" value={form.parkingSpaces} onChange={handleChange} type="number" placeholder="200" />
          </div>
          <FormField label="Amenities" name="amenities" value={form.amenities} onChange={handleChange} type="textarea" placeholder="e.g., Gym, Conference Center, Roof Deck" />
          <FormField label="Notes" name="notes" value={form.notes} onChange={handleChange} type="textarea" placeholder="Additional property notes" />
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-dark-700 text-dark-300 font-medium rounded-xl hover:bg-dark-600 transition-all">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all">{isEditing ? 'Update' : 'Create'} Property</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Portfolio;
