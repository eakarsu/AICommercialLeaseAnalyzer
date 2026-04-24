import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaseAPI, escalationAPI, negotiationAPI, portfolioAPI, marketCompAPI } from '../services/api';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [leases, escalations, negotiations, portfolio, comps] = await Promise.all([
          leaseAPI.getAll(), escalationAPI.getAll(), negotiationAPI.getAll(), portfolioAPI.getAll(), marketCompAPI.getAll()
        ]);
        setStats({
          leases: leases.data.length,
          escalations: escalations.data.length,
          negotiations: negotiations.data.length,
          portfolio: portfolio.data.length,
          comps: comps.data.length
        });
      } catch (err) { console.error(err); }
    };
    fetchStats();
  }, []);

  const features = [
    {
      title: 'Lease Abstraction',
      description: 'AI-powered lease abstraction from PDFs. Extract key terms, financial data, and critical dates automatically.',
      icon: '📄',
      path: '/leases',
      count: stats.leases || 0,
      gradient: 'from-blue-600 to-cyan-600',
      shadow: 'shadow-blue-500/25'
    },
    {
      title: 'Rent Escalation Modeling',
      description: 'Model and project rent escalations. CPI-based, fixed, and hybrid escalation analysis with NPV calculations.',
      icon: '📈',
      path: '/escalations',
      count: stats.escalations || 0,
      gradient: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-500/25'
    },
    {
      title: 'Renewal Negotiations',
      description: 'AI-driven negotiation insights. Counter-offer strategies, market comparisons, and deal structure optimization.',
      icon: '🤝',
      path: '/negotiations',
      count: stats.negotiations || 0,
      gradient: 'from-purple-600 to-pink-600',
      shadow: 'shadow-purple-500/25'
    },
    {
      title: 'Portfolio Optimization',
      description: 'Optimize your CRE portfolio. Hold/sell analysis, risk assessment, capital improvement ROI, and market outlook.',
      icon: '🏢',
      path: '/portfolio',
      count: stats.portfolio || 0,
      gradient: 'from-amber-600 to-orange-600',
      shadow: 'shadow-amber-500/25'
    },
    {
      title: 'Market Comp Analysis',
      description: 'Comprehensive market comparable analysis. Rent benchmarking, submarket trends, and competitive positioning.',
      icon: '📊',
      path: '/market-comps',
      count: stats.comps || 0,
      gradient: 'from-red-600 to-rose-600',
      shadow: 'shadow-red-500/25'
    }
  ];

  const tools = [
    {
      title: 'Reports & Export',
      description: 'Portfolio summary reports and CSV data export for all modules.',
      icon: '📋',
      path: '/reports',
      gradient: 'from-slate-600 to-zinc-600',
      shadow: 'shadow-slate-500/25'
    },
    {
      title: 'Lease Calendar',
      description: 'Visual timeline of lease expirations, critical dates, and renewal deadlines.',
      icon: '📅',
      path: '/calendar',
      gradient: 'from-sky-600 to-blue-600',
      shadow: 'shadow-sky-500/25'
    },
    {
      title: 'Financial Calculators',
      description: 'NOI, cap rate, rent PSF, lease value, escalation, and DSCR calculators.',
      icon: '🧮',
      path: '/calculators',
      gradient: 'from-lime-600 to-green-600',
      shadow: 'shadow-lime-500/25'
    },
    {
      title: 'Lease Comparison',
      description: 'Side-by-side comparison of 2-3 leases to evaluate terms and key differences.',
      icon: '⚖️',
      path: '/compare',
      gradient: 'from-fuchsia-600 to-purple-600',
      shadow: 'shadow-fuchsia-500/25'
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user.name || 'User'}</h1>
          <p className="text-dark-400">AI-powered commercial real estate lease intelligence platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.path}
              onClick={() => navigate(feature.path)}
              className={`card-hover cursor-pointer glass rounded-2xl overflow-hidden group`}
            >
              <div className={`h-2 bg-gradient-to-r ${feature.gradient}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg ${feature.shadow}`}>
                    <span className="text-3xl">{feature.icon}</span>
                  </div>
                  <span className="text-3xl font-bold text-white">{feature.count}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">{feature.title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
                <div className="mt-4 flex items-center text-primary-400 text-sm font-medium">
                  View Details
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tools Section */}
        <div className="mt-12 mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Tools</h2>
          <p className="text-dark-400">Non-AI analysis and reporting tools</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.path}
              onClick={() => navigate(tool.path)}
              className="card-hover cursor-pointer glass rounded-xl overflow-hidden group"
            >
              <div className={`h-1.5 bg-gradient-to-r ${tool.gradient}`} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg ${tool.shadow}`}>
                    <span className="text-xl">{tool.icon}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-primary-400 transition-colors">{tool.title}</h3>
                </div>
                <p className="text-dark-400 text-xs leading-relaxed">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
