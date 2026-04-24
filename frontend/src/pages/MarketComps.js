import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import AIResultDisplay from '../components/AIResultDisplay';
import { marketCompAPI } from '../services/api';

const emptyForm = {
  propertyName: '', propertyAddress: '', submarket: '', propertyType: '', propertyClass: '',
  squareFootage: '', askingRent: '', effectiveRent: '', occupancyRate: '',
  yearBuilt: '', lastRenovation: '', amenities: '', parkingRatio: '',
  tenantMix: '', leaseTermAvg: '', tiAllowance: '', freeRentMonths: '',
  operatingExpenses: '', taxRate: '', notes: '', source: '', dateCollected: ''
};

const MarketComps = () => {
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
      const { data } = await marketCompAPI.getAll();
      setItems(Array.isArray(data) ? data : data.marketComps || data.comps || []);
    } catch (err) { setError('Failed to fetch market comps'); }
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
    if (!window.confirm('Are you sure you want to delete this market comp?')) return;
    try {
      await marketCompAPI.delete(selected._id || selected.id);
      setShowDetail(false);
      fetchItems();
    } catch (err) { setError('Failed to delete market comp'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await marketCompAPI.update(selected._id || selected.id, form);
      } else {
        await marketCompAPI.create(form);
      }
      setShowForm(false);
      fetchItems();
    } catch (err) { setError('Failed to save market comp'); }
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await marketCompAPI.analyze(selected);
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
            <h1 className="text-3xl font-bold text-white">Market Comps</h1>
            <p className="text-dark-400 mt-1">Comprehensive market comparable analysis and benchmarking</p>
          </div>
          <button onClick={handleCreate} className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-500/25">
            + New Comp
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">{error}<button onClick={() => setError('')} className="ml-4 underline">dismiss</button></div>}

        <div className="glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div><p className="text-dark-400">Loading market comps...</p></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center"><p className="text-dark-400 text-lg">No market comps found. Add your first comparable property.</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Property</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Submarket</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Class</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Asking Rent</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Sq Ft</th>
                  <th className="text-left p-4 text-dark-400 text-sm font-medium">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id || item.id} onClick={() => handleRowClick(item)} className="border-b border-dark-700/30 hover:bg-dark-800/50 cursor-pointer transition-colors">
                    <td className="p-4"><div><span className="text-white font-medium block">{item.propertyName}</span><span className="text-dark-400 text-sm">{item.propertyAddress}</span></div></td>
                    <td className="p-4 text-dark-300">{item.submarket}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-medium ${item.propertyClass === 'A' ? 'bg-emerald-500/10 text-emerald-400' : item.propertyClass === 'B' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>Class {item.propertyClass}</span></td>
                    <td className="p-4 text-emerald-400 font-semibold">${Number(item.askingRent || 0).toLocaleString()}</td>
                    <td className="p-4 text-dark-300">{Number(item.squareFootage || 0).toLocaleString()}</td>
                    <td className="p-4 text-white">{item.occupancyRate || 'N/A'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Market Comp Details" size="xl">
        {selected && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Property Name</span><span className="text-white text-lg font-semibold">{selected.propertyName}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Address</span><span className="text-white">{selected.propertyAddress}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Submarket</span><span className="text-white">{selected.submarket}</span></div>
                <div className="flex gap-4">
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Property Type</span><span className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium">{selected.propertyType}</span></div>
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Class</span><span className={`px-3 py-1 rounded-lg text-sm font-medium ${selected.propertyClass === 'A' ? 'bg-emerald-500/10 text-emerald-400' : selected.propertyClass === 'B' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>Class {selected.propertyClass}</span></div>
                </div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Year Built</span><span className="text-white">{selected.yearBuilt || 'N/A'}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Square Footage</span><span className="text-white">{Number(selected.squareFootage || 0).toLocaleString()} sq ft</span></div>
              </div>
              <div className="space-y-4">
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Asking Rent</span><span className="text-emerald-400 text-2xl font-bold">${Number(selected.askingRent || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Effective Rent</span><span className="text-primary-400 text-lg font-semibold">${Number(selected.effectiveRent || 0).toLocaleString()}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Occupancy Rate</span><span className="text-white text-lg">{selected.occupancyRate || 'N/A'}%</span></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">TI Allowance</span><span className="text-white">${Number(selected.tiAllowance || 0).toLocaleString()}</span></div>
                  <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Free Rent</span><span className="text-white">{selected.freeRentMonths || '0'} months</span></div>
                </div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Parking Ratio</span><span className="text-white">{selected.parkingRatio || 'N/A'}</span></div>
                <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Avg Lease Term</span><span className="text-white">{selected.leaseTermAvg || 'N/A'}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Operating Expenses</span><span className="text-white">${Number(selected.operatingExpenses || 0).toLocaleString()}</span></div>
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Tax Rate</span><span className="text-white">{selected.taxRate || 'N/A'}%</span></div>
              <div><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Source</span><span className="text-white">{selected.source || 'N/A'}</span></div>
            </div>
            {selected.tenantMix && <div className="mb-4"><span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Tenant Mix</span><span className="text-white">{selected.tenantMix}</span></div>}
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
            <AIResultDisplay result={aiResult} type="market-comp" />
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={isEditing ? 'Edit Market Comp' : 'New Market Comp'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Property Name" name="propertyName" value={form.propertyName} onChange={handleChange} placeholder="e.g., Central Plaza" required />
            <FormField label="Property Address" name="propertyAddress" value={form.propertyAddress} onChange={handleChange} placeholder="e.g., 789 Market St" required />
            <FormField label="Submarket" name="submarket" value={form.submarket} onChange={handleChange} placeholder="e.g., Downtown CBD" required />
            <FormField label="Property Type" name="propertyType" value={form.propertyType} onChange={handleChange} type="select" options={['Office', 'Retail', 'Industrial', 'Mixed-Use', 'Medical', 'Warehouse']} required />
            <FormField label="Property Class" name="propertyClass" value={form.propertyClass} onChange={handleChange} type="select" options={['A', 'B', 'C']} required />
            <FormField label="Square Footage" name="squareFootage" value={form.squareFootage} onChange={handleChange} type="number" placeholder="75000" />
            <FormField label="Asking Rent ($/sqft)" name="askingRent" value={form.askingRent} onChange={handleChange} type="number" placeholder="42" required />
            <FormField label="Effective Rent ($/sqft)" name="effectiveRent" value={form.effectiveRent} onChange={handleChange} type="number" placeholder="38" />
            <FormField label="Occupancy Rate (%)" name="occupancyRate" value={form.occupancyRate} onChange={handleChange} type="number" placeholder="92" />
            <FormField label="Year Built" name="yearBuilt" value={form.yearBuilt} onChange={handleChange} type="number" placeholder="2005" />
            <FormField label="Last Renovation" name="lastRenovation" value={form.lastRenovation} onChange={handleChange} placeholder="e.g., 2022" />
            <FormField label="Parking Ratio" name="parkingRatio" value={form.parkingRatio} onChange={handleChange} placeholder="e.g., 4:1000" />
            <FormField label="Avg Lease Term" name="leaseTermAvg" value={form.leaseTermAvg} onChange={handleChange} placeholder="e.g., 5 years" />
            <FormField label="TI Allowance ($/sqft)" name="tiAllowance" value={form.tiAllowance} onChange={handleChange} type="number" placeholder="45" />
            <FormField label="Free Rent Months" name="freeRentMonths" value={form.freeRentMonths} onChange={handleChange} type="number" placeholder="3" />
            <FormField label="Operating Expenses ($/sqft)" name="operatingExpenses" value={form.operatingExpenses} onChange={handleChange} type="number" placeholder="12" />
            <FormField label="Tax Rate (%)" name="taxRate" value={form.taxRate} onChange={handleChange} type="number" placeholder="2.5" />
            <FormField label="Source" name="source" value={form.source} onChange={handleChange} placeholder="e.g., CoStar, LoopNet" />
            <FormField label="Date Collected" name="dateCollected" value={form.dateCollected} onChange={handleChange} type="date" />
          </div>
          <FormField label="Tenant Mix" name="tenantMix" value={form.tenantMix} onChange={handleChange} type="textarea" placeholder="e.g., 40% Tech, 30% Finance, 20% Law, 10% Other" />
          <FormField label="Amenities" name="amenities" value={form.amenities} onChange={handleChange} type="textarea" placeholder="e.g., Fitness center, rooftop terrace" />
          <FormField label="Notes" name="notes" value={form.notes} onChange={handleChange} type="textarea" placeholder="Additional notes" />
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700/50">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-dark-700 text-dark-300 font-medium rounded-xl hover:bg-dark-600 transition-all">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium rounded-xl hover:from-red-500 hover:to-rose-500 transition-all">{isEditing ? 'Update' : 'Create'} Comp</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MarketComps;
