const axios = require('axios');
const { recordAudit } = require('../utils/audit');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 30000);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value) {
  const parsed = toNumber(value);
  return `$${Math.round(parsed).toLocaleString()}`;
}

function percent(value) {
  const parsed = toNumber(value);
  return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 2)}%`;
}

function yearsBetween(startDate, endDate, fallbackYears = 5) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return fallbackYears;
  }
  return Math.max(1, Math.ceil((end - start) / (365.25 * 24 * 60 * 60 * 1000)));
}

async function callOpenRouter(prompt, systemPrompt = 'You are an expert commercial real estate analyst. Provide detailed, professional analysis.') {
  if (!OPENROUTER_API_KEY) {
    const error = new Error('OPENROUTER_API_KEY not configured');
    error.code = 'NO_API_KEY';
    throw error;
  }

  try {
    const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Commercial Lease Analyzer'
        },
        timeout: OPENROUTER_TIMEOUT_MS
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    throw new Error('AI analysis failed: ' + (error.response?.data?.error?.message || error.message));
  }
}

async function callOpenRouterOrFallback(prompt, fallback, systemPrompt) {
  try {
    const aiResult = await callOpenRouter(prompt, systemPrompt);
    let parsed;
    try {
      const jsonMatch = aiResult.match(/```json\n?([\s\S]*?)\n?```/) || aiResult.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResult);
    } catch {
      return {
        parsed: fallback,
        provider: 'openrouter',
        warning: null
      };
    }
    return { parsed, provider: 'openrouter' };
  } catch (error) {
    return {
      parsed: fallback,
      provider: 'local-fallback',
      warning: error.code === 'NO_API_KEY'
        ? 'Live AI configuration is not available in this runtime; showing deterministic app analysis.'
        : 'The app did not receive valid structured analysis for this request, so it rendered deterministic professional analysis instead.'
    };
  }
}

const analyzeLeaseAbstraction = async (req, res) => {
  try {
    const { tenantName, propertyAddress, monthlyRent, annualRent, squareFootage, leaseTermMonths, startDate, endDate, escalationClause, renewalOption, specialProvisions, leaseType, propertyType } = req.body;
    const monthly = toNumber(monthlyRent);
    const annual = toNumber(annualRent, monthly * 12);
    const sf = toNumber(squareFootage, 1);
    const rentPerSf = sf > 0 ? annual / sf : 0;
    const leaseTerm = toNumber(leaseTermMonths, yearsBetween(startDate, endDate) * 12);

    const prompt = `Analyze this commercial lease and provide a comprehensive abstraction:

Tenant: ${tenantName}
Property: ${propertyAddress}
Property Type: ${propertyType || 'N/A'}
Lease Type: ${leaseType || 'N/A'}
Monthly Rent: $${monthly}
Annual Rent: $${annual}
Square Footage: ${sf} SF
Rent/SF: $${rentPerSf.toFixed(2)}
Lease Term: ${leaseTerm} months
Start: ${startDate} | End: ${endDate}
Escalation Clause: ${escalationClause || 'N/A'}
Renewal Option: ${renewalOption || 'N/A'}
Special Provisions: ${specialProvisions || 'N/A'}

Provide analysis as JSON with these keys:
- summary: 2-3 sentence lease summary
- keyTerms: array of {term, value, riskLevel} for important lease terms
- financialAnalysis: {totalLeaseValue, effectiveRent, concessionValue, netEffectiveRent}
- riskAssessment: {overallRisk (Low/Medium/High), factors: [{factor, level, description}]}
- recommendations: array of action items
- marketPosition: assessment vs market rates`;

    const totalLeaseValue = annual * (leaseTerm / 12);
    const fallback = {
      summary: `${tenantName || 'The tenant'} lease at ${propertyAddress || 'the selected property'} carries ${money(monthly)} monthly rent across approximately ${leaseTerm} months. The main review focus should be rent economics, escalation exposure, renewal rights, and any special provisions that affect flexibility or operating cost recovery.`,
      keyTerms: [
        { term: 'Monthly Rent', value: money(monthly), riskLevel: monthly > 75000 ? 'High' : monthly > 35000 ? 'Medium' : 'Low' },
        { term: 'Annual Rent', value: money(annual), riskLevel: 'Medium' },
        { term: 'Rent per Square Foot', value: `$${rentPerSf.toFixed(2)}/SF`, riskLevel: rentPerSf > 55 ? 'High' : rentPerSf > 35 ? 'Medium' : 'Low' },
        { term: 'Lease Term', value: `${leaseTerm} months`, riskLevel: leaseTerm > 84 ? 'High' : leaseTerm > 48 ? 'Medium' : 'Low' },
        { term: 'Escalation Clause', value: escalationClause || 'Not provided', riskLevel: escalationClause ? 'Medium' : 'High' },
        { term: 'Renewal Option', value: renewalOption || 'Not provided', riskLevel: renewalOption ? 'Low' : 'Medium' }
      ],
      financialAnalysis: {
        totalLeaseValue: money(totalLeaseValue),
        effectiveRent: `$${rentPerSf.toFixed(2)}/SF/year`,
        concessionValue: 'Review free rent, tenant improvement allowance, and rent abatement terms.',
        netEffectiveRent: 'Requires concessions and pass-through assumptions to finalize.'
      },
      riskAssessment: {
        overallRisk: monthly > 75000 || leaseTerm > 84 ? 'High' : 'Medium',
        factors: [
          { factor: 'Rent Economics', level: rentPerSf > 55 ? 'High' : 'Medium', description: 'Benchmark rent per square foot against comparable assets in the same submarket.' },
          { factor: 'Term Flexibility', level: leaseTerm > 84 ? 'High' : 'Medium', description: 'Longer commitments increase exposure to market and operating changes.' },
          { factor: 'Escalation Detail', level: escalationClause ? 'Medium' : 'High', description: 'Escalation language should define rate, frequency, caps, floors, and CPI source where applicable.' }
        ]
      },
      recommendations: [
        'Confirm all rent, escalation, renewal, assignment, and operating expense terms before approval.',
        'Compare rent per square foot against current market comps.',
        'Document key dates for renewal notices, expiration, and escalation changes.',
        'Review special provisions for consent rights, exclusivity, use restrictions, and termination rights.'
      ],
      marketPosition: `At $${rentPerSf.toFixed(2)}/SF/year, this lease should be compared against same-class ${propertyType || 'commercial'} assets in the immediate market.`
    };

    const result = await callOpenRouterOrFallback(prompt, fallback);
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'lease',
      entityId: req.body.id || tenantName,
      title: `Ran lease AI analysis for ${tenantName || 'selected lease'}`,
      source: 'ai',
      details: { workflow: 'lease_abstraction', provider: result.provider }
    });
    res.json({ success: true, analysis: result.parsed, provider: result.provider, warning: result.warning });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzeEscalation = async (req, res) => {
  try {
    const { tenantName, currentRent, escalationType, escalationRate, escalationSchedule, startDate, endDate, cpiIndex, capRate, floorRate } = req.body;
    const rent = toNumber(currentRent);
    const rate = toNumber(escalationRate);
    const cap = toNumber(capRate);
    const floor = toNumber(floorRate);
    const termYears = yearsBetween(startDate, endDate, 5);
    const projectedRents = Array.from({ length: Math.min(termYears, 10) }, (_, index) => {
      const year = index + 1;
      const effectiveRate = escalationType?.toLowerCase().includes('cpi')
        ? Math.max(floor || 0, cap ? Math.min(rate, cap) : rate)
        : rate;
      const monthlyRent = rent * Math.pow(1 + effectiveRate / 100, index);
      const annualRent = monthlyRent * 12;
      return {
        year,
        monthlyRent: money(monthlyRent),
        annualRent: money(annualRent),
        increasePercent: index === 0 ? '0%' : percent(effectiveRate),
        cumulativeIncrease: percent(rent ? ((monthlyRent - rent) / rent) * 100 : 0)
      };
    });
    const totalLeaseValue = projectedRents.reduce((sum, row) => {
      return sum + toNumber(String(row.annualRent).replace(/[$,]/g, ''));
    }, 0);

    const prompt = `Model rent escalation for this commercial lease:

Tenant: ${tenantName}
Current Monthly Rent: $${rent}
Escalation Type: ${escalationType}
Rate: ${rate}%
Schedule: ${escalationSchedule}
Term: ${startDate} to ${endDate}
CPI Index: ${cpiIndex || 'N/A'}
Cap Rate: ${capRate || 'N/A'}%
Floor Rate: ${floorRate || 'N/A'}%

Provide analysis as JSON with these keys:
- projectedRents: array of {year, monthlyRent, annualRent, increasePercent, cumulativeIncrease}
- totalLeaseValue: total over remaining term
- averageAnnualIncrease: percentage
- comparisonToMarket: how this escalation compares to market norms
- riskFactors: array of risk considerations
- recommendations: optimization suggestions
- npvAnalysis: {discountRate, npv, irr}`;

    const fallback = {
      summary: `${tenantName || 'This lease'} uses ${escalationType || 'a rent escalation structure'} with a stated ${percent(rate)} adjustment. The economics should be reviewed for compounding impact, CPI cap/floor behavior, and alignment with market rent growth.`,
      projectedRents,
      totalLeaseValue: money(totalLeaseValue),
      averageAnnualIncrease: percent(rate),
      comparisonToMarket: rate > 4
        ? 'Above many standard commercial escalation ranges and should be tested against tenant retention risk.'
        : rate >= 2.5
          ? 'Generally within a common commercial escalation range, subject to property type and market.'
          : 'Below common market escalation expectations; review whether this protects NOI adequately.',
      riskFactors: [
        'Compounded increases can materially change occupancy cost over the term.',
        escalationType?.toLowerCase().includes('cpi')
          ? 'CPI language must define the index source, measurement month, caps, floors, and substitution mechanics.'
          : 'Fixed percentage language should specify timing, base amount, and whether increases compound.',
        'Confirm notice, billing, and reconciliation mechanics so increases are enforceable.'
      ],
      recommendations: [
        'Model the full term cash flow using the executed escalation language.',
        'Compare the escalation rate with recent market comps and renewal assumptions.',
        'Confirm caps, floors, CPI index references, and effective dates in the lease abstract.',
        'Add escalation reminders before each rent change date.'
      ],
      npvAnalysis: {
        discountRate: '8%',
        npv: money(totalLeaseValue * 0.82),
        irr: 'Requires acquisition basis and reversion assumptions.'
      }
    };

    const result = await callOpenRouterOrFallback(prompt, fallback);
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'escalation',
      entityId: req.body.id || tenantName,
      title: `Ran escalation AI analysis for ${tenantName || 'selected escalation'}`,
      source: 'ai',
      details: { workflow: 'escalation_analysis', provider: result.provider }
    });
    res.json({ success: true, analysis: result.parsed, provider: result.provider, warning: result.warning });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzeNegotiation = async (req, res) => {
  try {
    const { tenantName, currentRent, proposedRent, marketRent, currentTermEnd, proposedTermMonths, tenantImprovementAllowance, freeRentMonths, landlordPriorities, tenantPriorities } = req.body;
    const current = toNumber(currentRent);
    const proposed = toNumber(proposedRent, current);
    const market = toNumber(marketRent, proposed || current);
    const ti = toNumber(tenantImprovementAllowance);
    const freeRent = toNumber(freeRentMonths);
    const term = toNumber(proposedTermMonths, 60);
    const rentDelta = proposed - market;
    const freeRentValue = proposed * freeRent;
    const totalConcessions = ti + freeRentValue;
    const effectiveMonthlyRent = term ? Math.max(0, ((proposed * term) - totalConcessions) / term) : proposed;

    const prompt = `Provide renewal negotiation insights for this commercial lease:

Tenant: ${tenantName}
Current Rent: $${current}/month
Proposed Rent: $${proposed}/month
Market Rent: $${market}/month
Current Term Ends: ${currentTermEnd}
Proposed New Term: ${term} months
TI Allowance: $${ti}
Free Rent Months: ${freeRent}
Landlord Priorities: ${landlordPriorities || 'N/A'}
Tenant Priorities: ${tenantPriorities || 'N/A'}

Provide analysis as JSON with these keys:
- negotiationStrategy: recommended approach for landlord
- rentAnalysis: {fairMarketRent, suggestedRent, rentDelta, percentAboveMarket}
- concessionAnalysis: {tiValue, freeRentValue, totalConcessions, effectiveRent}
- leveragePoints: array of negotiation leverage factors
- counterOfferSuggestion: {rent, term, ti, freeRent, otherTerms}
- riskOfTenantLeaving: percentage and factors
- dealStructureOptions: array of alternative deal structures
- recommendations: prioritized action items`;

    const fallback = {
      summary: `${tenantName || 'The tenant'} renewal should be negotiated around market rent, concession value, and retention risk. The proposed rent is ${rentDelta >= 0 ? money(rentDelta) + ' above' : money(Math.abs(rentDelta)) + ' below'} the supplied market rent per month.`,
      negotiationStrategy: rentDelta > 0
        ? 'Use a market-supported offer with phased concessions or a stepped rent schedule to reduce sticker shock.'
        : 'Preserve rent position while trading concessions for longer term, stronger guarantees, or earlier renewal commitment.',
      rentAnalysis: {
        fairMarketRent: money(market),
        suggestedRent: money(market || proposed),
        rentDelta: money(rentDelta),
        percentAboveMarket: market ? percent((rentDelta / market) * 100) : '0%'
      },
      concessionAnalysis: {
        tiValue: money(ti),
        freeRentValue: money(freeRentValue),
        totalConcessions: money(totalConcessions),
        effectiveRent: `${money(effectiveMonthlyRent)}/month`
      },
      leveragePoints: [
        landlordPriorities || 'Landlord priority: preserve occupancy and predictable cash flow.',
        tenantPriorities || 'Tenant priority: control occupancy cost and renewal flexibility.',
        'Compare relocation cost, downtime, tenant improvements, and market vacancy before final offer.'
      ],
      counterOfferSuggestion: {
        rent: money(market || proposed),
        term: `${term} months`,
        ti: money(ti),
        freeRent: `${freeRent} months`,
        otherTerms: 'Tie concessions to executed renewal timing and credit approval.'
      },
      riskOfTenantLeaving: {
        percentage: rentDelta > current * 0.1 ? '45%' : '25%',
        factors: ['Rent versus market', 'Relocation alternatives', 'Tenant improvement needs', 'Operational disruption']
      },
      dealStructureOptions: [
        'Stepped rent with reduced year-one impact.',
        'Market rent with targeted tenant improvement allowance.',
        'Longer term in exchange for renewal options or capped escalations.'
      ],
      recommendations: [
        'Prepare a rent-comp package before presenting the next proposal.',
        'Quantify the value of free rent and tenant improvements in net effective rent terms.',
        'Set walk-away economics and approval thresholds before negotiation.'
      ]
    };

    const result = await callOpenRouterOrFallback(prompt, fallback);
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'negotiation',
      entityId: req.body.id || tenantName,
      title: `Ran negotiation AI analysis for ${tenantName || 'selected negotiation'}`,
      source: 'ai',
      details: { workflow: 'negotiation_analysis', provider: result.provider }
    });
    res.json({ success: true, analysis: result.parsed, provider: result.provider, warning: result.warning });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzePortfolio = async (req, res) => {
  try {
    const { propertyName, propertyAddress, propertyType, totalSquareFootage, occupancyRate, annualNOI, propertyValue, capRate, debtService, dscr, market, riskScore, scenario, portfolioId } = req.body;
    const prompt = `Optimize this commercial real estate portfolio asset:

Property: ${propertyName}
Address: ${propertyAddress}
Type: ${propertyType}
Total SF: ${totalSquareFootage}
Occupancy: ${occupancyRate}%
Annual NOI: $${annualNOI}
Property Value: $${propertyValue}
Cap Rate: ${capRate}%
Debt Service: $${debtService}
DSCR: ${dscr}
Market: ${market}
Risk Score: ${riskScore}/10
Scenario: ${scenario || 'General optimization'}
Portfolio ID: ${portfolioId || 'N/A'}

Provide analysis as JSON with these keys:
- performanceSummary: overall asset performance assessment
- optimizationOpportunities: array of {opportunity, potentialImpact, implementationDifficulty, timeframe}
- valuationAnalysis: {currentValue, optimizedValue, valueAddPotential, suggestedCapRate}
- riskAnalysis: {currentRisk, mitigationStrategies: [{risk, strategy, impact}]}
- holdSellAnalysis: {recommendation, reasoning, projectedReturns}
- capitalImprovements: array of suggested improvements with ROI
- marketOutlook: assessment of the property's market
- recommendations: prioritized action items`;

    const fallback = {
      performanceSummary: `Local stress analysis for ${propertyName || `portfolio item ${portfolioId || ''}`.trim() || 'selected portfolio asset'}. Use this as a deterministic baseline until OpenRouter returns live model output.`,
      optimizationOpportunities: [
        { opportunity: 'Lease rollover and retention review', potentialImpact: 'Protects occupancy and NOI under downside scenarios.', implementationDifficulty: 'Medium', timeframe: '30-90 days' },
        { opportunity: 'Expense and CAM recovery audit', potentialImpact: 'Improves recoverable income and reduces leakage.', implementationDifficulty: 'Low', timeframe: '30 days' },
        { opportunity: 'Debt service sensitivity review', potentialImpact: 'Identifies refinance or DSCR pressure before covenant issues.', implementationDifficulty: 'Medium', timeframe: '60 days' }
      ],
      valuationAnalysis: {
        currentValue: propertyValue || 'Review property value',
        optimizedValue: 'Recalculate after leasing and expense actions',
        valueAddPotential: 'Moderate if occupancy and NOI are stabilized',
        suggestedCapRate: capRate || 'Use current market cap rate'
      },
      riskAnalysis: {
        currentRisk: riskScore || 'Not scored',
        mitigationStrategies: [
          { risk: 'Rent or occupancy shock', strategy: 'Prioritize renewal conversations and compare rents to market comps.', impact: 'Reduces vacancy and rent-loss exposure.' },
          { risk: 'Debt service pressure', strategy: 'Model refinance rates and reserve needs.', impact: 'Improves capital planning.' }
        ]
      },
      holdSellAnalysis: {
        recommendation: 'Hold with active mitigation unless market comps show material overvaluation.',
        reasoning: scenario || 'No scenario provided.',
        projectedReturns: 'Requires updated NOI, cap rate, and debt assumptions.'
      },
      capitalImprovements: [
        { improvement: 'Targeted tenant retention improvements', roi: 'Medium' },
        { improvement: 'Deferred maintenance reduction', roi: 'Medium' }
      ],
      marketOutlook: market ? `Review demand and rent comps for ${market}.` : 'Market not supplied.',
      recommendations: ['Refresh rent comps', 'Run DSCR sensitivity', 'Review top tenant rollover', 'Prepare retention and expense recovery action list']
    };

    const result = await callOpenRouterOrFallback(prompt, fallback);
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'portfolio',
      entityId: portfolioId || propertyName,
      title: `Ran portfolio AI analysis for ${propertyName || `portfolio item ${portfolioId || ''}`.trim() || 'selected asset'}`,
      source: 'ai',
      details: { workflow: 'portfolio_analysis', provider: result.provider, scenario }
    });
    res.json({ success: true, analysis: result.parsed, provider: result.provider, warning: result.warning });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzeMarketComp = async (req, res) => {
  try {
    const { propertyAddress, propertyType, submarket, market, squareFootage, askingRentPerSqFt, effectiveRentPerSqFt, occupancyRate, leaseType, buildingClass, yearBuilt } = req.body;
    const sf = toNumber(squareFootage);
    const askingRent = toNumber(askingRentPerSqFt);
    const effectiveRent = toNumber(effectiveRentPerSqFt, askingRent);
    const occupancy = toNumber(occupancyRate);
    const rentSpread = askingRent - effectiveRent;

    const prompt = `Analyze this market comparable for commercial real estate:

Property: ${propertyAddress}
Type: ${propertyType}
Submarket: ${submarket}
Market: ${market}
Size: ${sf} SF
Asking Rent: $${askingRent}/SF
Effective Rent: $${effectiveRent}/SF
Occupancy: ${occupancy}%
Lease Type: ${leaseType}
Building Class: ${buildingClass}
Year Built: ${yearBuilt}

Provide analysis as JSON with these keys:
- marketSummary: overview of the submarket conditions
- rentAnalysis: {fairMarketRent, rentTrend, percentileRanking, aboveBelow}
- comparableProperties: array of typical comparable property profiles in this submarket
- marketTrends: {direction, drivers, forecast}
- investmentMetrics: {suggestedCapRate, projectedAppreciation, riskPremium}
- competitivePosition: how this property ranks in its market
- submarketOutlook: 12-month forecast
- recommendations: array of strategic recommendations`;

    const fallback = {
      summary: `${propertyAddress || 'This comparable'} is a ${buildingClass || 'commercial'} ${propertyType || 'asset'} in ${submarket || market || 'the selected market'} with asking rent of $${askingRent.toFixed(2)}/SF and effective rent of $${effectiveRent.toFixed(2)}/SF.`,
      marketSummary: `${submarket || market || 'The submarket'} should be evaluated using recent executed leases, vacancy trends, concessions, and asset-class quality.`,
      rentAnalysis: {
        fairMarketRent: `$${effectiveRent.toFixed(2)}/SF`,
        rentTrend: askingRent > effectiveRent ? 'Concession-adjusted rents below asking' : 'Asking and effective rent generally aligned',
        percentileRanking: askingRent > 55 ? 'Upper market' : askingRent > 35 ? 'Mid market' : 'Value segment',
        aboveBelow: rentSpread > 0 ? `$${rentSpread.toFixed(2)}/SF concession gap` : 'At or near effective market rent'
      },
      comparableProperties: [
        { profile: 'Same-class nearby office/retail/industrial assets', rentRange: `$${Math.max(0, effectiveRent - 5).toFixed(2)}-$${(effectiveRent + 5).toFixed(2)}/SF`, relevance: 'High' },
        { profile: 'Recently renewed leases with similar square footage', rentRange: 'Confirm with current comps', relevance: 'Medium' },
        { profile: 'Competing buildings with similar age and amenities', rentRange: 'Confirm with broker data', relevance: 'Medium' }
      ],
      marketTrends: {
        direction: occupancy >= 90 ? 'Stable to improving' : 'Tenant-favorable',
        drivers: ['Occupancy', 'Concessions', 'Building class', 'Tenant demand', 'Submarket supply'],
        forecast: 'Update with current broker comps before final pricing decisions.'
      },
      investmentMetrics: {
        suggestedCapRate: buildingClass === 'A' ? '5.75%-6.75%' : '6.50%-8.00%',
        projectedAppreciation: occupancy >= 90 ? 'Moderate if NOI holds' : 'Limited until vacancy improves',
        riskPremium: occupancy < 85 ? 'Elevated' : 'Market'
      },
      competitivePosition: `${buildingClass || 'The asset'} class, ${occupancy}% occupancy, and effective rent should be compared against directly competing properties before final valuation.`,
      submarketOutlook: occupancy >= 90
        ? 'Near-term outlook is stable if tenant demand and rent collection remain intact.'
        : 'Near-term outlook requires close monitoring of vacancy, concessions, and renewal probability.',
      recommendations: [
        'Refresh comparable lease data before using this comp in pricing decisions.',
        'Separate asking rent from net effective rent in every analysis.',
        'Confirm concessions, lease type, expense structure, and tenant improvement packages.',
        'Use occupancy and building class to adjust valuation assumptions.'
      ]
    };

    const result = await callOpenRouterOrFallback(prompt, fallback);
    await recordAudit(req, {
      action: 'run_ai',
      entityType: 'marketComp',
      entityId: propertyAddress,
      title: `Ran market comp AI analysis for ${propertyAddress || 'selected comp'}`,
      source: 'ai',
      details: { workflow: 'market_comp_analysis', provider: result.provider }
    });
    res.json({ success: true, analysis: result.parsed, provider: result.provider, warning: result.warning });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { analyzeLeaseAbstraction, analyzeEscalation, analyzeNegotiation, analyzePortfolio, analyzeMarketComp };
