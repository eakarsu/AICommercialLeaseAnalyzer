import React from 'react';
import Navbar from '../components/Navbar';
import RentBySubmarketChart from '../components/RentBySubmarketChart';
import TermRiskHeatmap from '../components/TermRiskHeatmap';
import LeaseAbstractPDF from '../components/LeaseAbstractPDF';
import ClauseRulesEditor from '../components/ClauseRulesEditor';

const CustomViewsPage = () => {
  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8" data-testid="custom-views-page">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Lease Views</h1>
          <p className="text-dark-400">
            Custom commercial-lease analytics: rent benchmarking, term/risk distribution,
            printable abstracts, and clause-risk rules management.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RentBySubmarketChart />
          <TermRiskHeatmap />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <LeaseAbstractPDF />
          <ClauseRulesEditor />
        </div>
      </div>
    </div>
  );
};

export default CustomViewsPage;
