import React from 'react';

const RiskBadge = ({ level }) => {
  const colors = {
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[level] || colors.Medium}`}>
      {level}
    </span>
  );
};

const StatCard = ({ label, value, sublabel }) => (
  <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/50">
    <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
    {sublabel && <p className="text-dark-400 text-xs mt-1">{sublabel}</p>}
  </div>
);

const SectionTitle = ({ icon, title }) => (
  <div className="flex items-center gap-3 mb-4 mt-6">
    <span className="text-2xl">{icon}</span>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <div className="flex-1 h-px bg-gradient-to-r from-primary-500/50 to-transparent"></div>
  </div>
);

const formatKey = (key) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase()).trim();
};

const renderValue = (value, depth = 0) => {
  if (value === null || value === undefined) return <span className="text-dark-400">N/A</span>;
  if (typeof value === 'boolean') return <span className={value ? 'text-emerald-400' : 'text-red-400'}>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') {
    if (value > 1000) return <span className="text-primary-300 font-semibold">${value.toLocaleString()}</span>;
    return <span className="text-primary-300 font-semibold">{value}</span>;
  }
  if (typeof value === 'string') {
    if (value.match(/^(Low|Medium|High)$/i)) return <RiskBadge level={value} />;
    return <span className="text-dark-200">{value}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2 mt-2">
        {value.map((item, i) => (
          <div key={i} className="bg-dark-900/30 rounded-lg p-3 border border-dark-700/30">
            {typeof item === 'object' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-dark-400 text-xs uppercase tracking-wider">{formatKey(k)}</span>
                    <span className="text-dark-200">{renderValue(v, depth + 1)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <span className="text-primary-400 mt-0.5">&#9679;</span>
                <span className="text-dark-200">{String(item)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className="bg-dark-900/20 rounded-lg p-4 border border-dark-700/30 mt-2 space-y-3">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="text-dark-400 text-xs uppercase tracking-wider block mb-1">{formatKey(k)}</span>
            {renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
};

const sectionIcons = {
  summary: '📋', keyTerms: '🔑', financialAnalysis: '💰', riskAssessment: '⚠️', recommendations: '💡',
  marketPosition: '📊', projectedRents: '📈', comparisonToMarket: '🏢', riskFactors: '🛡️',
  npvAnalysis: '🧮', negotiationStrategy: '🤝', rentAnalysis: '💵', concessionAnalysis: '🎯',
  leveragePoints: '⚡', counterOfferSuggestion: '📝', riskOfTenantLeaving: '🚪',
  dealStructureOptions: '🏗️', performanceSummary: '📊', optimizationOpportunities: '🎯',
  valuationAnalysis: '💎', holdSellAnalysis: '🔄', capitalImprovements: '🔧', marketOutlook: '🌐',
  marketSummary: '🏙️', marketTrends: '📈', investmentMetrics: '📊', competitivePosition: '🏆',
  submarketOutlook: '🔮', comparableProperties: '🏢', totalLeaseValue: '💰', averageAnnualIncrease: '📈'
};

const AIResultDisplay = ({ result, type }) => {
  if (!result) return null;

  const data = typeof result === 'string' ? { summary: result } : result;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <span className="text-xl">🤖</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">AI Analysis Results</h2>
          <p className="text-dark-400 text-sm">Powered by OpenRouter AI</p>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return null;

          const icon = sectionIcons[key] || '📌';

          if (typeof value === 'string' && key === 'summary') {
            return (
              <div key={key} className="bg-gradient-to-r from-primary-900/30 to-purple-900/30 rounded-xl p-5 border border-primary-500/20">
                <SectionTitle icon="📋" title="Executive Summary" />
                <p className="text-dark-200 leading-relaxed text-base">{value}</p>
              </div>
            );
          }

          if (typeof value === 'string' || typeof value === 'number') {
            return (
              <div key={key} className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/30">
                <SectionTitle icon={icon} title={formatKey(key)} />
                {renderValue(value)}
              </div>
            );
          }

          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
            return (
              <div key={key} className="bg-dark-800/50 rounded-xl p-5 border border-dark-700/30">
                <SectionTitle icon={icon} title={formatKey(key)} />
                <ul className="space-y-2">
                  {value.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 bg-dark-900/30 rounded-lg p-3">
                      <span className="text-primary-400 font-bold mt-0.5">{i + 1}</span>
                      <span className="text-dark-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <div key={key} className="bg-dark-800/50 rounded-xl p-5 border border-dark-700/30">
              <SectionTitle icon={icon} title={formatKey(key)} />
              {renderValue(value)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { StatCard };
export default AIResultDisplay;
