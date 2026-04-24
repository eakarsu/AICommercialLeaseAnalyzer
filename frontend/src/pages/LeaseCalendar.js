import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { leaseAPI, negotiationAPI } from '../services/api';

const LeaseCalendar = () => {
  const [leases, setLeases] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('timeline');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaseRes, negRes] = await Promise.all([leaseAPI.getAll(), negotiationAPI.getAll()]);
        setLeases(Array.isArray(leaseRes.data) ? leaseRes.data : []);
        setNegotiations(Array.isArray(negRes.data) ? negRes.data : []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const now = new Date();

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - now) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyClass = (days) => {
    if (days === null) return 'border-dark-700 bg-dark-800/50';
    if (days < 0) return 'border-red-500/50 bg-red-500/5';
    if (days <= 30) return 'border-red-500/50 bg-red-500/10';
    if (days <= 90) return 'border-amber-500/50 bg-amber-500/10';
    if (days <= 180) return 'border-yellow-500/50 bg-yellow-500/5';
    return 'border-emerald-500/30 bg-emerald-500/5';
  };

  const getUrgencyBadge = (days) => {
    if (days === null) return { text: 'No Date', cls: 'bg-dark-600 text-dark-300' };
    if (days < 0) return { text: 'Expired', cls: 'bg-red-500/20 text-red-400' };
    if (days <= 30) return { text: 'Critical', cls: 'bg-red-500/20 text-red-400' };
    if (days <= 90) return { text: 'Urgent', cls: 'bg-amber-500/20 text-amber-400' };
    if (days <= 180) return { text: 'Upcoming', cls: 'bg-yellow-500/20 text-yellow-400' };
    return { text: 'On Track', cls: 'bg-emerald-500/20 text-emerald-400' };
  };

  const enrichedLeases = leases.map(l => {
    const daysUntilEnd = getDaysUntil(l.endDate);
    const negotiation = negotiations.find(n =>
      n.tenantName === l.tenantName || n.propertyAddress === l.propertyAddress
    );
    return { ...l, daysUntilEnd, negotiation };
  }).sort((a, b) => {
    if (a.daysUntilEnd === null) return 1;
    if (b.daysUntilEnd === null) return -1;
    return a.daysUntilEnd - b.daysUntilEnd;
  });

  const filteredLeases = enrichedLeases.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'expired') return l.daysUntilEnd !== null && l.daysUntilEnd < 0;
    if (filter === 'critical') return l.daysUntilEnd !== null && l.daysUntilEnd >= 0 && l.daysUntilEnd <= 30;
    if (filter === 'urgent') return l.daysUntilEnd !== null && l.daysUntilEnd > 30 && l.daysUntilEnd <= 90;
    if (filter === 'upcoming') return l.daysUntilEnd !== null && l.daysUntilEnd > 90 && l.daysUntilEnd <= 180;
    if (filter === 'ontrack') return l.daysUntilEnd !== null && l.daysUntilEnd > 180;
    return true;
  });

  const counts = {
    all: enrichedLeases.length,
    expired: enrichedLeases.filter(l => l.daysUntilEnd !== null && l.daysUntilEnd < 0).length,
    critical: enrichedLeases.filter(l => l.daysUntilEnd !== null && l.daysUntilEnd >= 0 && l.daysUntilEnd <= 30).length,
    urgent: enrichedLeases.filter(l => l.daysUntilEnd !== null && l.daysUntilEnd > 30 && l.daysUntilEnd <= 90).length,
    upcoming: enrichedLeases.filter(l => l.daysUntilEnd !== null && l.daysUntilEnd > 90 && l.daysUntilEnd <= 180).length,
    ontrack: enrichedLeases.filter(l => l.daysUntilEnd !== null && l.daysUntilEnd > 180).length,
  };

  const filterButtons = [
    { key: 'all', label: 'All', cls: 'bg-dark-700 text-white' },
    { key: 'expired', label: 'Expired', cls: 'bg-red-500/20 text-red-400' },
    { key: 'critical', label: '< 30 Days', cls: 'bg-red-500/20 text-red-400' },
    { key: 'urgent', label: '30-90 Days', cls: 'bg-amber-500/20 text-amber-400' },
    { key: 'upcoming', label: '90-180 Days', cls: 'bg-yellow-500/20 text-yellow-400' },
    { key: 'ontrack', label: '180+ Days', cls: 'bg-emerald-500/20 text-emerald-400' },
  ];

  // Monthly calendar view helpers
  const getMonthsRange = () => {
    const months = [];
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) });
    }
    return months;
  };

  const months = getMonthsRange();

  const getLeasesForMonth = (year, month) => {
    return enrichedLeases.filter(l => {
      if (!l.endDate) return false;
      const end = new Date(l.endDate);
      return end.getFullYear() === year && end.getMonth() === month;
    });
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Lease Calendar</h1>
            <p className="text-dark-400 mt-1">Track lease expirations and critical dates</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'timeline' ? 'bg-primary-600/20 text-primary-400' : 'bg-dark-800 text-dark-400 hover:text-white'}`}
            >Timeline</button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-primary-600/20 text-primary-400' : 'bg-dark-800 text-dark-400 hover:text-white'}`}
            >Calendar</button>
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="ai-loading h-8 w-48 rounded-lg mx-auto mb-4"></div>
            <p className="text-dark-400">Loading lease data...</p>
          </div>
        ) : viewMode === 'timeline' ? (
          <>
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-6">
              {filterButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setFilter(btn.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === btn.key ? btn.cls + ' ring-1 ring-white/20' : 'bg-dark-800/50 text-dark-500 hover:text-dark-300'
                  }`}
                >
                  {btn.label} ({counts[btn.key]})
                </button>
              ))}
            </div>

            {/* Timeline View */}
            <div className="space-y-3">
              {filteredLeases.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <p className="text-dark-400">No leases match the selected filter.</p>
                </div>
              ) : filteredLeases.map((lease) => {
                const badge = getUrgencyBadge(lease.daysUntilEnd);
                return (
                  <div key={lease.id} className={`glass rounded-xl p-5 border ${getUrgencyClass(lease.daysUntilEnd)} transition-all hover:scale-[1.005]`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold text-lg">{lease.tenantName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.text}</span>
                          {lease.negotiation && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                              Negotiation: {lease.negotiation.negotiationStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-dark-400 text-sm">{lease.propertyAddress}</p>
                        <div className="flex items-center gap-6 mt-3 text-sm">
                          <span className="text-dark-500">
                            Start: <span className="text-dark-300">{lease.startDate ? new Date(lease.startDate).toLocaleDateString() : 'N/A'}</span>
                          </span>
                          <span className="text-dark-500">
                            End: <span className="text-dark-300">{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'N/A'}</span>
                          </span>
                          <span className="text-dark-500">
                            Rent: <span className="text-emerald-400 font-medium">${Number(lease.monthlyRent || 0).toLocaleString()}/mo</span>
                          </span>
                          <span className="text-dark-500">
                            Type: <span className="text-dark-300">{lease.leaseType || 'N/A'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {lease.daysUntilEnd !== null ? (
                          <>
                            <p className={`text-3xl font-bold ${lease.daysUntilEnd < 0 ? 'text-red-400' : lease.daysUntilEnd <= 90 ? 'text-amber-400' : 'text-white'}`}>
                              {Math.abs(lease.daysUntilEnd)}
                            </p>
                            <p className="text-dark-500 text-xs">{lease.daysUntilEnd < 0 ? 'days ago' : 'days left'}</p>
                          </>
                        ) : (
                          <p className="text-dark-500 text-sm">No end date</p>
                        )}
                      </div>
                    </div>

                    {/* Progress bar showing lease timeline */}
                    {lease.startDate && lease.endDate && (
                      <div className="mt-4">
                        <div className="w-full bg-dark-700/50 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              lease.daysUntilEnd < 0 ? 'bg-red-500' : lease.daysUntilEnd <= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0,
                                ((now - new Date(lease.startDate)) / (new Date(lease.endDate) - new Date(lease.startDate))) * 100
                              ))}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Calendar View - 12 Month Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {months.map((m) => {
              const monthLeases = getLeasesForMonth(m.year, m.month);
              return (
                <div key={m.label} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">{m.label}</h3>
                    {monthLeases.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{monthLeases.length}</span>
                    )}
                  </div>
                  {monthLeases.length === 0 ? (
                    <p className="text-dark-600 text-sm">No expirations</p>
                  ) : (
                    <div className="space-y-2">
                      {monthLeases.map((l) => (
                        <div key={l.id} className="p-2 rounded-lg bg-dark-800/50 border border-dark-700/30">
                          <p className="text-white text-sm font-medium truncate">{l.tenantName}</p>
                          <p className="text-dark-500 text-xs truncate">{l.propertyAddress}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-dark-400 text-xs">{new Date(l.endDate).toLocaleDateString()}</span>
                            <span className="text-emerald-400 text-xs font-medium">${Number(l.monthlyRent || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaseCalendar;
