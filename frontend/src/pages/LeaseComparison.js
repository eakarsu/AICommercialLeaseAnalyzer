import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { leaseAPI } from '../services/api';

const LeaseComparison = () => {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await leaseAPI.getAll();
        setLeases(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const selectedLeases = leases.filter(l => selectedIds.includes(l.id || l._id));

  const fmt = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const getTermDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const months = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24 * 30.44));
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return years > 0 ? `${years}y ${rem}m` : `${months}m`;
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    return Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const comparisonRows = [
    { label: 'Tenant', key: 'tenantName', type: 'text' },
    { label: 'Property', key: 'propertyAddress', type: 'text' },
    { label: 'Property Type', key: 'propertyType', type: 'badge' },
    { label: 'Lease Type', key: 'leaseType', type: 'badge' },
    { label: 'Status', key: 'status', type: 'status' },
    { label: 'Monthly Rent', key: 'monthlyRent', type: 'currency', compare: 'lower' },
    { label: 'Annual Rent', key: 'annualRent', type: 'currency', compare: 'lower' },
    { label: 'Square Footage', key: 'squareFootage', type: 'number', compare: 'higher' },
    { label: 'Rent Per Sq Ft', key: 'rentPerSqFt', type: 'currency_decimal', compare: 'lower' },
    { label: 'Security Deposit', key: 'securityDeposit', type: 'currency' },
    { label: 'Start Date', key: 'startDate', type: 'date' },
    { label: 'End Date', key: 'endDate', type: 'date' },
    { label: 'Term Duration', key: '_term', type: 'computed' },
    { label: 'Days Remaining', key: '_daysRemaining', type: 'computed' },
    { label: 'Total Lease Value', key: '_totalValue', type: 'computed' },
    { label: 'Escalation Clause', key: 'escalationClause', type: 'text_long' },
    { label: 'Renewal Option', key: 'renewalOption', type: 'text_long' },
    { label: 'Special Provisions', key: 'specialProvisions', type: 'text_long' },
  ];

  const getBestValue = (row, values) => {
    if (!row.compare) return null;
    const nums = values.map(v => Number(v) || 0).filter(v => v > 0);
    if (nums.length === 0) return null;
    return row.compare === 'lower' ? Math.min(...nums) : Math.max(...nums);
  };

  const renderCell = (lease, row) => {
    if (row.key === '_term') {
      return <span className="text-white">{getTermDuration(lease.startDate, lease.endDate)}</span>;
    }
    if (row.key === '_daysRemaining') {
      const days = getDaysRemaining(lease.endDate);
      if (days === null) return <span className="text-dark-500">N/A</span>;
      const color = days < 0 ? 'text-red-400' : days <= 90 ? 'text-amber-400' : 'text-emerald-400';
      return <span className={`font-semibold ${color}`}>{days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days`}</span>;
    }
    if (row.key === '_totalValue') {
      const val = Number(lease.monthlyRent || 0) * Number(lease.leaseTermMonths || 0);
      return <span className="text-emerald-400 font-semibold">{fmt(val)}</span>;
    }

    const val = lease[row.key];

    if (row.type === 'currency' || row.type === 'currency_decimal') {
      const num = Number(val || 0);
      const best = getBestValue(row, selectedLeases.map(l => l[row.key]));
      const isBest = best !== null && num === best && num > 0;
      return (
        <span className={`font-semibold ${isBest ? 'text-emerald-400' : 'text-white'}`}>
          {row.type === 'currency_decimal' ? '$' + num.toFixed(2) : fmt(num)}
          {isBest && <span className="ml-1 text-xs text-emerald-400/60">Best</span>}
        </span>
      );
    }
    if (row.type === 'number') {
      const num = Number(val || 0);
      const best = getBestValue(row, selectedLeases.map(l => l[row.key]));
      const isBest = best !== null && num === best && num > 0;
      return (
        <span className={`font-semibold ${isBest ? 'text-emerald-400' : 'text-white'}`}>
          {num.toLocaleString()}
          {isBest && <span className="ml-1 text-xs text-emerald-400/60">Best</span>}
        </span>
      );
    }
    if (row.type === 'date') {
      return <span className="text-white">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>;
    }
    if (row.type === 'badge') {
      return <span className="px-2 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-xs font-medium">{val || 'N/A'}</span>;
    }
    if (row.type === 'status') {
      return (
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
          val === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>{val || 'N/A'}</span>
      );
    }
    if (row.type === 'text_long') {
      return <span className="text-dark-300 text-sm">{val || 'N/A'}</span>;
    }
    return <span className="text-white">{val || 'N/A'}</span>;
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Lease Comparison</h1>
            <p className="text-dark-400 mt-1">Compare up to 3 leases side by side</p>
          </div>
          {selectedIds.length >= 2 && !comparing && (
            <button
              onClick={() => setComparing(true)}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl hover:from-primary-500 hover:to-purple-500 transition-all shadow-lg shadow-primary-500/25"
            >
              Compare ({selectedIds.length})
            </button>
          )}
          {comparing && (
            <button
              onClick={() => { setComparing(false); setSelectedIds([]); }}
              className="px-6 py-3 bg-dark-700 text-dark-300 font-semibold rounded-xl hover:bg-dark-600 transition-all"
            >
              Back to Selection
            </button>
          )}
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div>
            <p className="text-dark-400">Loading leases...</p>
          </div>
        ) : !comparing ? (
          /* Selection View */
          <>
            <p className="text-dark-400 text-sm mb-4">Select 2-3 leases to compare ({selectedIds.length}/3 selected)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leases.map((lease) => {
                const id = lease.id || lease._id;
                const isSelected = selectedIds.includes(id);
                return (
                  <div
                    key={id}
                    onClick={() => toggleSelect(id)}
                    className={`glass rounded-xl p-5 cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/5 scale-[1.02]'
                        : 'border-transparent hover:border-dark-600'
                    } ${selectedIds.length >= 3 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{lease.tenantName}</h3>
                        <p className="text-dark-400 text-sm">{lease.propertyAddress}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-primary-500 bg-primary-500' : 'border-dark-600'
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-emerald-400 font-medium">{fmt(lease.monthlyRent)}/mo</span>
                      <span className="text-dark-500">{Number(lease.squareFootage || 0).toLocaleString()} SF</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${lease.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{lease.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Comparison View */
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="p-4 text-left text-dark-400 text-sm font-medium min-w-[180px] sticky left-0 bg-dark-900/80 backdrop-blur-sm z-10">Metric</th>
                    {selectedLeases.map((lease, i) => (
                      <th key={lease.id || lease._id} className="p-4 text-left min-w-[220px]">
                        <div className={`px-3 py-2 rounded-lg bg-gradient-to-r ${
                          i === 0 ? 'from-blue-600/20 to-cyan-600/20' : i === 1 ? 'from-purple-600/20 to-pink-600/20' : 'from-amber-600/20 to-orange-600/20'
                        }`}>
                          <span className="text-white font-semibold block">{lease.tenantName}</span>
                          <span className="text-dark-400 text-xs">{lease.propertyAddress}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, idx) => (
                    <tr key={row.key} className={`border-b border-dark-700/20 ${idx % 2 === 0 ? '' : 'bg-dark-800/20'}`}>
                      <td className="p-4 text-dark-400 text-sm font-medium sticky left-0 bg-dark-900/80 backdrop-blur-sm z-10">{row.label}</td>
                      {selectedLeases.map((lease) => (
                        <td key={lease.id || lease._id} className="p-4">
                          {renderCell(lease, row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaseComparison;
