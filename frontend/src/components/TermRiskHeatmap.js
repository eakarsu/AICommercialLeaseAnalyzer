import React, { useEffect, useState } from 'react';
import api from '../services/api';

const TermRiskHeatmap = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/custom-views/term-risk-heatmap')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message));
  }, []);

  if (error) return <div className="text-red-400 text-sm">Failed to load: {error}</div>;
  if (!data) return <div className="text-dark-400 text-sm">Loading term/risk heatmap…</div>;

  const allCounts = data.cells.map(c => c.count);
  const max = Math.max(...allCounts, 1);

  const colorFor = (count) => {
    const t = count / max;
    // gradient from cool (low) to hot (high)
    if (count === 0) return 'rgba(30,41,59,0.5)';
    const r = Math.round(99 + (239 - 99) * t);
    const g = Math.round(102 + (68 - 102) * t);
    const b = Math.round(241 + (68 - 241) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="glass rounded-2xl p-6" data-testid="term-risk-heatmap">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Lease Term / Risk Heatmap</h3>
        <span className="text-xs text-dark-400">{data.total} leases scored</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-dark-400 font-medium p-2">Term ↓ / Risk →</th>
              {data.riskBuckets.map(r => (
                <th key={r} className="text-center text-dark-300 font-medium p-2">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.termBuckets.map(t => (
              <tr key={t}>
                <td className="text-dark-300 p-2 font-medium">{t}</td>
                {data.riskBuckets.map(r => {
                  const cell = data.cells.find(c => c.termBucket === t && c.risk === r);
                  const count = cell ? cell.count : 0;
                  return (
                    <td key={r} className="p-1">
                      <div
                        className="rounded-md flex items-center justify-center h-12 text-white font-bold"
                        style={{ background: colorFor(count) }}
                        title={`${t} / ${r}: ${count}`}
                      >
                        {count}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TermRiskHeatmap;
