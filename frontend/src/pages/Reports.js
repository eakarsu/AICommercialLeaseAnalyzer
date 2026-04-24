import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { leaseAPI, escalationAPI, negotiationAPI, portfolioAPI, marketCompAPI } from '../services/api';
import api from '../services/api';

const Reports = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leases, escalations, negotiations, portfolio, comps] = await Promise.all([
          leaseAPI.getAll(), escalationAPI.getAll(), negotiationAPI.getAll(), portfolioAPI.getAll(), marketCompAPI.getAll()
        ]);
        const leaseData = Array.isArray(leases.data) ? leases.data : [];
        const portfolioData = Array.isArray(portfolio.data) ? portfolio.data : [];
        const negotiationData = Array.isArray(negotiations.data) ? negotiations.data : [];

        const activeLeases = leaseData.filter(l => l.status === 'Active');
        const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + Number(l.monthlyRent || 0), 0);
        const totalSqFt = activeLeases.reduce((sum, l) => sum + Number(l.squareFootage || 0), 0);
        const avgRentPerSqFt = totalSqFt > 0 ? (totalMonthlyRent * 12 / totalSqFt) : 0;
        const totalPortfolioValue = portfolioData.reduce((sum, p) => sum + Number(p.propertyValue || 0), 0);
        const totalNOI = portfolioData.reduce((sum, p) => sum + Number(p.annualNOI || 0), 0);
        const avgOccupancy = portfolioData.length > 0
          ? portfolioData.reduce((sum, p) => sum + Number(p.occupancyRate || 0), 0) / portfolioData.length : 0;
        const avgCapRate = portfolioData.length > 0
          ? portfolioData.reduce((sum, p) => sum + Number(p.capRate || 0), 0) / portfolioData.length : 0;
        const pendingNegotiations = negotiationData.filter(n => n.negotiationStatus === 'Pending' || n.negotiationStatus === 'In Progress').length;

        const expiringIn90 = leaseData.filter(l => {
          if (!l.endDate) return false;
          const end = new Date(l.endDate);
          const now = new Date();
          const diff = (end - now) / (1000 * 60 * 60 * 24);
          return diff > 0 && diff <= 90;
        }).length;

        setStats({
          leaseCount: leaseData.length,
          activeLeases: activeLeases.length,
          totalMonthlyRent,
          totalAnnualRent: totalMonthlyRent * 12,
          totalSqFt,
          avgRentPerSqFt,
          escalationCount: (Array.isArray(escalations.data) ? escalations.data : []).length,
          negotiationCount: negotiationData.length,
          pendingNegotiations,
          portfolioCount: portfolioData.length,
          totalPortfolioValue,
          totalNOI,
          avgOccupancy,
          avgCapRate,
          compCount: (Array.isArray(comps.data) ? comps.data : []).length,
          expiringIn90,
        });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const response = await api.get(`/export/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert('Export failed. Please try again.'); }
    finally { setExporting(''); }
  };

  const exportSections = [
    { key: 'leases', label: 'Leases', gradient: 'from-blue-600 to-cyan-600', icon: '📄' },
    { key: 'escalations', label: 'Escalations', gradient: 'from-emerald-600 to-teal-600', icon: '📈' },
    { key: 'negotiations', label: 'Negotiations', gradient: 'from-purple-600 to-pink-600', icon: '🤝' },
    { key: 'portfolio', label: 'Portfolio', gradient: 'from-amber-600 to-orange-600', icon: '🏢' },
    { key: 'market-comps', label: 'Market Comps', gradient: 'from-red-600 to-rose-600', icon: '📊' },
  ];

  const fmt = (n) => Number(n || 0).toLocaleString();
  const fmtCurrency = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtPct = (n) => Number(n || 0).toFixed(1) + '%';

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Reports & Export</h1>
          <p className="text-dark-400 mt-1">Portfolio summary and data export</p>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div>
            <p className="text-dark-400">Loading report data...</p>
          </div>
        ) : stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-xl p-5">
                <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Active Leases</p>
                <p className="text-3xl font-bold text-white">{stats.activeLeases}</p>
                <p className="text-dark-500 text-sm mt-1">of {stats.leaseCount} total</p>
              </div>
              <div className="glass rounded-xl p-5">
                <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold text-emerald-400">{fmtCurrency(stats.totalMonthlyRent)}</p>
                <p className="text-dark-500 text-sm mt-1">{fmtCurrency(stats.totalAnnualRent)} annually</p>
              </div>
              <div className="glass rounded-xl p-5">
                <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Portfolio Value</p>
                <p className="text-3xl font-bold text-amber-400">{fmtCurrency(stats.totalPortfolioValue)}</p>
                <p className="text-dark-500 text-sm mt-1">{stats.portfolioCount} properties</p>
              </div>
              <div className="glass rounded-xl p-5">
                <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Expiring Soon</p>
                <p className="text-3xl font-bold text-red-400">{stats.expiringIn90}</p>
                <p className="text-dark-500 text-sm mt-1">within 90 days</p>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Lease Metrics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                    <span className="text-dark-400">Total Square Footage</span>
                    <span className="text-white font-semibold">{fmt(stats.totalSqFt)} SF</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                    <span className="text-dark-400">Avg Rent Per Sq Ft</span>
                    <span className="text-white font-semibold">${Number(stats.avgRentPerSqFt || 0).toFixed(2)}/SF</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                    <span className="text-dark-400">Escalation Models</span>
                    <span className="text-white font-semibold">{stats.escalationCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-dark-400">Market Comparables</span>
                    <span className="text-white font-semibold">{stats.compCount}</span>
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Portfolio Metrics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                    <span className="text-dark-400">Total Annual NOI</span>
                    <span className="text-emerald-400 font-semibold">{fmtCurrency(stats.totalNOI)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                    <span className="text-dark-400">Avg Occupancy Rate</span>
                    <span className="text-white font-semibold">{fmtPct(stats.avgOccupancy)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dark-700/30">
                    <span className="text-dark-400">Avg Cap Rate</span>
                    <span className="text-white font-semibold">{fmtPct(stats.avgCapRate)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-dark-400">Pending Negotiations</span>
                    <span className="text-amber-400 font-semibold">{stats.pendingNegotiations}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Export Data to CSV</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {exportSections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => handleExport(section.key)}
                    disabled={exporting === section.key}
                    className={`p-4 rounded-xl bg-gradient-to-br ${section.gradient} bg-opacity-10 border border-dark-700/30 hover:border-dark-600/50 transition-all text-left disabled:opacity-50`}
                  >
                    <span className="text-2xl block mb-2">{section.icon}</span>
                    <span className="text-white font-semibold text-sm block">{section.label}</span>
                    <span className="text-white/60 text-xs block mt-1">
                      {exporting === section.key ? 'Exporting...' : 'Download CSV'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
