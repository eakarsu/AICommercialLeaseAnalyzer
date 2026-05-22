import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

const LeaseAbstractPDF = () => {
  const [leaseId, setLeaseId] = useState('');
  const [opening, setOpening] = useState(false);

  const buildUrl = () => {
    const token = localStorage.getItem('token') || '';
    const qs = new URLSearchParams();
    if (leaseId) qs.set('lease_id', leaseId);
    if (token) qs.set('access_token', token);
    return `${API_BASE}/custom-views/lease-abstract-pdf?${qs.toString()}`;
  };

  const openAbstract = async () => {
    setOpening(true);
    try {
      const res = await fetch(buildUrl(), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const html = await res.text();
      const w = window.open('', '_blank');
      if (w) { w.document.open(); w.document.write(html); w.document.close(); }
    } catch (e) {
      // fall back to a direct GET (no header) if popup fails
      window.open(buildUrl(), '_blank');
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6" data-testid="lease-abstract-pdf">
      <h3 className="text-lg font-bold text-white mb-2">Lease Abstract (PDF / Print)</h3>
      <p className="text-dark-400 text-sm mb-4">
        Generates a printable one-page lease abstract suitable for tenant rep meetings.
        Leave the ID blank to abstract the first lease in your portfolio.
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-dark-300 text-xs mb-1">Lease ID (optional)</label>
          <input
            type="text"
            value={leaseId}
            onChange={(e) => setLeaseId(e.target.value)}
            placeholder="e.g. 1"
            className="w-full bg-dark-900/50 border border-dark-700/50 rounded-lg px-3 py-2 text-white text-sm focus:border-primary-500 outline-none"
          />
        </div>
        <button
          onClick={openAbstract}
          disabled={opening}
          className="bg-gradient-to-r from-primary-600 to-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:from-primary-500 hover:to-purple-500 disabled:opacity-50"
        >
          {opening ? 'Opening…' : 'Open Printable Abstract'}
        </button>
      </div>
    </div>
  );
};

export default LeaseAbstractPDF;
