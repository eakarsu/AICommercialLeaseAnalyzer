import React from 'react';

const HIDDEN_KEYS = new Set(['success', 'provider', 'leaseId', 'documentChars', '__parseFailed']);

const severityClasses = {
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  high: 'bg-red-500/15 text-red-300 border-red-500/30',
  critical: 'bg-red-600/25 text-red-200 border-red-500/50'
};

const sectionIcons = {
  summary: 'Brief',
  executiveSummary: 'Brief',
  viabilitySummary: 'Brief',
  performanceSummary: 'Brief',
  keyTerms: 'Terms',
  financialAnalysis: 'Finance',
  riskAssessment: 'Risk',
  legalRisks: 'Risk',
  recommendations: 'Actions',
  draftConsiderations: 'Draft',
  negotiationStrategy: 'Strategy',
  comparisonTable: 'Compare',
  financialComparison: 'Finance',
  termComparison: 'Terms',
  riskComparison: 'Risk',
  flexibilityComparison: 'Flex',
  costBreakdown: 'Costs',
  walkAwayOptions: 'Options',
  missingProvisions: 'Gaps',
  unfavorableClauses: 'Clauses',
  tenantProtectionGaps: 'Gaps',
  negotiationPriorities: 'Priority',
  positiveProvisions: 'Positive',
  actionItems: 'Actions',
  parties: 'Parties',
  premises: 'Premises',
  term: 'Term',
  rent: 'Rent',
  additionalRent: 'Costs',
  securityDeposit: 'Deposit',
  assignmentSubletting: 'Transfer',
  maintenanceRepair: 'Repair',
  insurance: 'Insurance',
  defaultRemedies: 'Default',
  termination: 'Exit',
  redFlags: 'Flags',
  missingClauses: 'Gaps',
  optimizationOpportunities: 'Upside',
  valuationAnalysis: 'Value',
  holdSellAnalysis: 'Hold/Sell',
  capitalImprovements: 'Capex',
  marketOutlook: 'Market'
};

const priorityOrder = [
  'summary',
  'executiveSummary',
  'viabilitySummary',
  'performanceSummary',
  'overallScore',
  'viabilityScore',
  'totalExposure',
  'landlordConsentRequired',
  'legalRisks',
  'riskAssessment',
  'redFlags',
  'missingProvisions',
  'missingClauses',
  'financialAnalysis',
  'financialComparison',
  'costBreakdown',
  'comparisonTable',
  'recommendations',
  'actionItems',
  'negotiationPriorities'
];

const looseTopLevelKeys = [
  ...priorityOrder,
  'analysis',
  'landlordConsentRequired',
  'consentReasoning',
  'subleaseRestrictions',
  'draftConsiderations',
  'exitStrategy',
  'proposedTermsReviewed',
  'termComparison',
  'flexibilityComparison',
  'landlordPerspective',
  'legalConsiderations',
  'recommendedPath',
  'riskTimeline',
  'positiveProvisions',
  'complianceIssues'
];

const looseItemKeys = [
  'risk',
  'severity',
  'mitigation',
  'issue',
  'provision',
  'importance',
  'explanation',
  'sampleLanguage',
  'clause',
  'currentTerm',
  'concern',
  'suggestedRevision',
  'option',
  'cost',
  'pros',
  'cons',
  'feasibility',
  'recommendation',
  'action',
  'category',
  'value',
  'leaseId',
  'rationale'
];

const formatKey = (key) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/[_-]/g, ' ')
  .replace(/^\w/, (char) => char.toUpperCase())
  .trim();

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const extractJsonCandidate = (text) => {
  if (typeof text !== 'string') return null;
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return trimmed;
  }
  const firstObject = trimmed.indexOf('{');
  const lastObject = trimmed.lastIndexOf('}');
  if (firstObject !== -1 && lastObject > firstObject) return trimmed.slice(firstObject, lastObject + 1);
  const firstArray = trimmed.indexOf('[');
  const lastArray = trimmed.lastIndexOf(']');
  if (firstArray !== -1 && lastArray > firstArray) return trimmed.slice(firstArray, lastArray + 1);
  return null;
};

const repairJson = (candidate) => candidate
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/,\s*([}\]])/g, '$1')
  .trim();

const stripJsonFence = (value) => String(value)
  .replace(/```(?:json)?/gi, '')
  .replace(/```/g, '')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .trim();

const cleanLooseText = (value) => stripJsonFence(value)
  .replace(/^\s*[{\[]\s*/, '')
  .replace(/\s*[}\]]\s*$/, '')
  .replace(/^\s*["']([^"']+)["']\s*:\s*/gm, '$1: ')
  .replace(/^\s*[},]\s*/gm, '')
  .replace(/,\s*$/gm, '')
  .trim();

const coerceLooseValue = (value) => {
  const cleaned = String(value || '')
    .replace(/^["']|["']$/g, '')
    .trim();
  if (/^(true|false)$/i.test(cleaned)) return cleaned.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
  if (/^\[[\s\S]*\]$/.test(cleaned)) {
    try {
      return JSON.parse(repairJson(cleaned));
    } catch {
      return cleaned
        .replace(/^\[|\]$/g, '')
        .split(/\s*,\s*/)
        .map((item) => item.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);
    }
  }
  return cleaned;
};

const parseKeyValueBlock = (text, keys = looseItemKeys) => {
  const cleaned = cleanLooseText(text);
  const keyPattern = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:^|\\n)\\s*["']?(${keyPattern})["']?\\s*:\\s*`, 'gi');
  const matches = [...cleaned.matchAll(regex)];
  if (matches.length === 0) return null;

  const parsed = {};
  matches.forEach((match, index) => {
    const key = match[1];
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : cleaned.length;
    parsed[key] = coerceLooseValue(cleaned.slice(start, end));
  });
  return parsed;
};

const parseLooseItems = (text) => {
  const cleaned = cleanLooseText(text);
  const starterKeys = ['risk', 'issue', 'provision', 'clause', 'option', 'opportunity', 'recommendation', 'action'];
  const starterPattern = starterKeys.join('|');
  const starterRegex = new RegExp(`(?:^|\\n)\\s*["']?(${starterPattern})["']?\\s*:\\s*`, 'gi');
  const starts = [...cleaned.matchAll(starterRegex)];
  if (starts.length === 0) return null;

  return starts.map((startMatch, index) => {
    const start = startMatch.index;
    const end = index + 1 < starts.length ? starts[index + 1].index : cleaned.length;
    return parseKeyValueBlock(cleaned.slice(start, end)) || cleanLooseText(cleaned.slice(start, end));
  }).filter((item) => item && (!isPlainObject(item) || Object.keys(item).length > 0));
};

const parseLooseAnalysis = (value) => {
  const cleaned = cleanLooseText(value);
  const keyPattern = looseTopLevelKeys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:^|\\n)\\s*["']?(${keyPattern})["']?\\s*:\\s*`, 'gi');
  const matches = [...cleaned.matchAll(regex)];
  if (matches.length === 0) return null;

  const parsed = {};
  matches.forEach((match, index) => {
    const key = match[1];
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : cleaned.length;
    const raw = cleaned.slice(start, end).trim();
    const itemList = parseLooseItems(raw);
    const objectValue = parseKeyValueBlock(raw);

    if (itemList && itemList.length > 0) {
      parsed[key] = itemList;
    } else if (objectValue && Object.keys(objectValue).length > 1) {
      parsed[key] = objectValue;
    } else {
      parsed[key] = coerceLooseValue(raw);
    }
  });

  if (Object.keys(parsed).length === 1 && parsed.analysis) {
    const nested = parseLooseAnalysis(parsed.analysis);
    return nested || parsed;
  }
  return parsed;
};

const parsePossibleJson = (value) => {
  if (typeof value !== 'string') return value;
  const candidate = extractJsonCandidate(value);
  if (!candidate) return value;
  try {
    return JSON.parse(repairJson(candidate));
  } catch {
    return parseLooseAnalysis(value) || cleanLooseText(value);
  }
};

const normalizeDeep = (value) => {
  const parsed = parsePossibleJson(value);
  if (Array.isArray(parsed)) return parsed.map(normalizeDeep);
  if (isPlainObject(parsed)) {
    return Object.fromEntries(Object.entries(parsed).map(([key, child]) => [key, normalizeDeep(child)]));
  }
  return parsed;
};

const normalizeResult = (result) => {
  const normalized = normalizeDeep(result);
  if (typeof normalized === 'string') return parseLooseAnalysis(normalized) || { summary: normalized };
  if (Array.isArray(normalized)) return { results: normalized };
  if (isPlainObject(normalized)) {
    if (normalized.__parseFailed) {
      return {
        summary: 'The AI provider returned malformed structured data. Re-run the analysis to generate a clean professional report.',
        warning: 'Malformed AI output was suppressed instead of displaying raw JSON.'
      };
    }
    const visibleKeys = Object.keys(normalized).filter((key) => !HIDDEN_KEYS.has(key));
    if (visibleKeys.length === 1 && visibleKeys[0] === 'analysis') {
      const unwrapped = normalizeDeep(normalized.analysis);
      if (isPlainObject(unwrapped)) return unwrapped;
      return parseLooseAnalysis(unwrapped) || { summary: unwrapped };
    }
    if (isPlainObject(normalized.analysis)) {
      return { ...normalized.analysis, provider: normalized.provider, warning: normalized.warning };
    }
  }
  return normalized || {};
};

const RiskBadge = ({ level }) => {
  const normalized = String(level || 'medium').toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[normalized] || severityClasses.medium}`}>
      {formatKey(String(level || 'medium'))}
    </span>
  );
};

const StatCard = ({ label, value, sublabel }) => (
  <div className="rounded-xl border border-dark-700/60 bg-dark-900/70 p-4">
    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-dark-400">{label}</p>
    <div className="break-words text-2xl font-bold text-white">
      {isPlainObject(value) || Array.isArray(value) ? <RenderValue value={value} compact /> : String(value ?? 'N/A')}
    </div>
    {sublabel && <p className="mt-1 text-xs text-dark-400">{sublabel}</p>}
  </div>
);

const SectionHeader = ({ name }) => (
  <div className="mb-4 flex items-center gap-3">
    <span className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary-300">
      {sectionIcons[name] || 'Detail'}
    </span>
    <h3 className="text-lg font-bold text-white">{formatKey(name)}</h3>
  </div>
);

const paragraphize = (text) => String(text)
  .split(/\n{2,}/)
  .map((part) => part.trim())
  .filter(Boolean);

const RenderText = ({ value }) => (
  <div className="space-y-3">
    {paragraphize(value).map((paragraph, index) => (
      <p key={index} className="whitespace-pre-wrap break-words text-sm leading-6 text-dark-200">
        {paragraph}
      </p>
    ))}
  </div>
);

const RenderScalar = ({ value }) => {
  if (value === null || value === undefined || value === '') return <span className="text-dark-500">Not specified</span>;
  if (isPlainObject(value) || Array.isArray(value)) return <RenderValue value={value} compact />;
  if (typeof value === 'boolean') {
    return <span className={value ? 'font-semibold text-emerald-300' : 'font-semibold text-red-300'}>{value ? 'Yes' : 'No'}</span>;
  }
  if (typeof value === 'number') return <span className="font-semibold text-primary-300">{value.toLocaleString()}</span>;
  if (String(value).match(/^(low|medium|high|critical)$/i)) return <RiskBadge level={value} />;
  return <RenderText value={value} />;
};

const ObjectGrid = ({ value }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    {Object.entries(value)
      .filter(([key, child]) => !HIDDEN_KEYS.has(key) && child !== undefined && child !== null && !(Array.isArray(child) && child.length === 0))
      .map(([key, child]) => (
        <div key={key} className="rounded-lg border border-dark-700/50 bg-dark-900/50 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-dark-400">{formatKey(key)}</div>
          <RenderValue value={child} compact />
        </div>
      ))}
  </div>
);

const CardList = ({ items }) => (
  <div className="space-y-3">
    {items.map((item, index) => {
      if (!isPlainObject(item)) {
        return (
          <div key={index} className="flex gap-3 rounded-lg border border-dark-700/50 bg-dark-900/50 p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-xs font-bold text-primary-300">
              {index + 1}
            </span>
            <RenderScalar value={item} />
          </div>
        );
      }

      const titleKey = ['risk', 'issue', 'provision', 'clause', 'option', 'opportunity', 'action', 'recommendation', 'category', 'term', 'expectedClause'].find((key) => item[key]);
      const severity = item.severity || item.importance || item.level || item.riskLevel;

      return (
        <div key={index} className="rounded-xl border border-dark-700/60 bg-dark-900/60 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-dark-500">Item {index + 1}</div>
              <div className="mt-1 break-words text-base font-semibold text-white">
                {titleKey ? String(item[titleKey]) : 'Analysis item'}
              </div>
            </div>
            {severity && <RiskBadge level={severity} />}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(item)
              .filter(([key]) => key !== titleKey && !['severity', 'importance', 'level', 'riskLevel'].includes(key))
              .map(([key, child]) => (
                <div key={key} className="rounded-lg bg-dark-950/40 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-dark-400">{formatKey(key)}</div>
                  <RenderValue value={child} compact />
                </div>
              ))}
          </div>
        </div>
      );
    })}
  </div>
);

const ComparisonTable = ({ rows }) => {
  const validRows = Array.isArray(rows)
    ? rows.filter((row) => row && row.category && Array.isArray(row.values) && row.values.length > 0)
    : [];
  if (validRows.length === 0) return (
    <div className="rounded-xl border border-dark-700/60 bg-dark-900/50 p-4 text-sm text-dark-300">
      Comparison rows were not available in a displayable format.
    </div>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-dark-700/60">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-dark-900/90">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-dark-300">Category</th>
            <th className="px-4 py-3 text-left font-semibold text-dark-300">Values</th>
          </tr>
        </thead>
        <tbody>
          {validRows.map((row, index) => (
            <tr key={index} className="border-t border-dark-700/60">
              <td className="px-4 py-3 font-semibold text-white">{row.category || `Row ${index + 1}`}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {(row.values || []).map((entry, entryIndex) => (
                    <span key={entryIndex} className="rounded-lg bg-dark-950/60 px-3 py-2 text-dark-200">
                      <span className="text-dark-500">{entry.leaseId ? `Lease ${entry.leaseId}: ` : ''}</span>
                      {String(entry.value ?? 'N/A')}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RenderValue = ({ value, compact = false }) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-dark-500">None listed</span>;
    return <CardList items={value} />;
  }
  if (isPlainObject(value)) return <ObjectGrid value={value} />;
  return compact ? <div className="text-sm text-dark-200"><RenderScalar value={value} /></div> : <RenderScalar value={value} />;
};

const getSummaryEntry = (data) => {
  const summaryKey = ['executiveSummary', 'viabilitySummary', 'performanceSummary', 'summary', 'marketSummary'].find((key) => data[key]);
  if (!summaryKey) return null;
  const value = data[summaryKey];
  if (isPlainObject(value)) {
    const nestedKey = ['summary', 'executiveSummary', 'text', 'analysis', 'overview'].find((key) => value[key]);
    if (nestedKey) return [summaryKey, value[nestedKey]];
  }
  return [summaryKey, value];
};

const getMetrics = (data) => {
  const metricKeys = ['overallScore', 'viabilityScore', 'totalExposure', 'landlordConsentRequired', 'leaseCount'];
  return metricKeys.filter((key) => data[key] !== undefined && data[key] !== null).map((key) => [key, data[key]]);
};

const orderEntries = (data) => {
  const entries = Object.entries(data).filter(([key, value]) => (
    !HIDDEN_KEYS.has(key)
    && value !== undefined
    && value !== null
    && !(Array.isArray(value) && value.length === 0)
  ));

  return entries.sort(([a], [b]) => {
    const aIndex = priorityOrder.indexOf(a);
    const bIndex = priorityOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};

const AIResultDisplay = ({ result }) => {
  if (!result) return null;

  const data = normalizeResult(result);
  const summaryEntry = getSummaryEntry(data);
  const metrics = getMetrics(data);
  const warning = data.warning;
  const provider = data.provider || 'openrouter';

  return (
    <div className="mt-6 rounded-2xl border border-dark-700/70 bg-dark-900/30 p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-300">AI Analysis Results</div>
          <h2 className="mt-1 text-2xl font-bold text-white">Professional Analysis</h2>
        </div>
        <div className="rounded-full border border-dark-700 bg-dark-950/60 px-3 py-1.5 text-xs font-semibold text-dark-300">
          {provider === 'local-fallback' ? 'Local fallback' : 'OpenRouter AI'}
        </div>
      </div>

      {warning && (
        <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {warning}
        </div>
      )}

      {summaryEntry && (
        <div className="mb-5 rounded-xl border border-primary-500/25 bg-gradient-to-r from-primary-900/30 to-dark-900 p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-300">Executive Summary</div>
          <RenderScalar value={summaryEntry[1]} />
        </div>
      )}

      {metrics.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([key, value]) => (
            <StatCard key={key} label={formatKey(key)} value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value} />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {orderEntries(data).map(([key, value]) => {
          if (summaryEntry && key === summaryEntry[0]) return null;
          if (metrics.some(([metricKey]) => metricKey === key)) return null;

          return (
            <section key={key} className="rounded-xl border border-dark-700/60 bg-dark-800/40 p-5">
              <SectionHeader name={key} />
              {key === 'comparisonTable' ? <ComparisonTable rows={value} /> : <RenderValue value={value} />}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export { StatCard };
export default AIResultDisplay;
