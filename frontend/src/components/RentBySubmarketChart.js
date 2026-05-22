import React, { useEffect, useState } from 'react';
import api from '../services/api';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];

const RentBySubmarketChart = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/custom-views/rent-by-submarket')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message));
  }, []);

  if (error) return <div className="text-red-400 text-sm">Failed to load: {error}</div>;
  if (!data) return <div className="text-dark-400 text-sm">Loading rent-by-submarket…</div>;

  const max = Math.max(...data.submarkets.map(s => s.avgRentPsf), 1);

  return (
    <div className="glass rounded-2xl p-6" data-testid="rent-by-submarket">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Rent Comparison per Submarket</h3>
        <span className="text-xs text-dark-400">{data.unit}</span>
      </div>
      <div className="space-y-3">
        {data.submarkets.map((row, i) => {
          const pct = Math.round((row.avgRentPsf / max) * 100);
          return (
            <div key={row.submarket}>
              <div className="flex justify-between text-xs text-dark-300 mb-1">
                <span className="font-medium text-white">{row.submarket}</span>
                <span>${row.avgRentPsf.toFixed(2)} avg &middot; ${row.minRentPsf}-${row.maxRentPsf} range &middot; n={row.samples}</span>
              </div>
              <div className="h-6 w-full bg-dark-800/60 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all"
                  style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                  title={`${row.submarket}: $${row.avgRentPsf}/sf`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RentBySubmarketChart;
