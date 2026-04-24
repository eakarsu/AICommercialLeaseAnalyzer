const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callOpenRouter(prompt, systemPrompt = 'You are an expert commercial real estate analyst. Provide detailed, professional analysis.') {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
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
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    throw new Error('AI analysis failed: ' + (error.response?.data?.error?.message || error.message));
  }
}

const analyzeLeaseAbstraction = async (req, res) => {
  try {
    const { tenantName, propertyAddress, monthlyRent, annualRent, squareFootage, leaseTermMonths, startDate, endDate, escalationClause, renewalOption, specialProvisions, leaseType, propertyType } = req.body;
    const prompt = `Analyze this commercial lease and provide a comprehensive abstraction:

Tenant: ${tenantName}
Property: ${propertyAddress}
Property Type: ${propertyType || 'N/A'}
Lease Type: ${leaseType || 'N/A'}
Monthly Rent: $${monthlyRent}
Annual Rent: $${annualRent}
Square Footage: ${squareFootage} SF
Rent/SF: $${(annualRent / squareFootage).toFixed(2)}
Lease Term: ${leaseTermMonths} months
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

    const aiResult = await callOpenRouter(prompt);
    let parsed;
    try {
      const jsonMatch = aiResult.match(/```json\n?([\s\S]*?)\n?```/) || aiResult.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResult);
    } catch { parsed = { summary: aiResult, keyTerms: [], financialAnalysis: {}, riskAssessment: {}, recommendations: [], marketPosition: '' }; }
    res.json({ success: true, analysis: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzeEscalation = async (req, res) => {
  try {
    const { tenantName, currentRent, escalationType, escalationRate, escalationSchedule, startDate, endDate, cpiIndex, capRate, floorRate } = req.body;
    const prompt = `Model rent escalation for this commercial lease:

Tenant: ${tenantName}
Current Monthly Rent: $${currentRent}
Escalation Type: ${escalationType}
Rate: ${escalationRate}%
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

    const aiResult = await callOpenRouter(prompt);
    let parsed;
    try {
      const jsonMatch = aiResult.match(/```json\n?([\s\S]*?)\n?```/) || aiResult.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResult);
    } catch { parsed = { summary: aiResult, projectedRents: [], recommendations: [] }; }
    res.json({ success: true, analysis: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzeNegotiation = async (req, res) => {
  try {
    const { tenantName, currentRent, proposedRent, marketRent, currentTermEnd, proposedTermMonths, tenantImprovementAllowance, freeRentMonths, landlordPriorities, tenantPriorities } = req.body;
    const prompt = `Provide renewal negotiation insights for this commercial lease:

Tenant: ${tenantName}
Current Rent: $${currentRent}/month
Proposed Rent: $${proposedRent}/month
Market Rent: $${marketRent}/month
Current Term Ends: ${currentTermEnd}
Proposed New Term: ${proposedTermMonths} months
TI Allowance: $${tenantImprovementAllowance || 0}
Free Rent Months: ${freeRentMonths || 0}
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

    const aiResult = await callOpenRouter(prompt);
    let parsed;
    try {
      const jsonMatch = aiResult.match(/```json\n?([\s\S]*?)\n?```/) || aiResult.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResult);
    } catch { parsed = { summary: aiResult, recommendations: [] }; }
    res.json({ success: true, analysis: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzePortfolio = async (req, res) => {
  try {
    const { propertyName, propertyAddress, propertyType, totalSquareFootage, occupancyRate, annualNOI, propertyValue, capRate, debtService, dscr, market, riskScore } = req.body;
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

Provide analysis as JSON with these keys:
- performanceSummary: overall asset performance assessment
- optimizationOpportunities: array of {opportunity, potentialImpact, implementationDifficulty, timeframe}
- valuationAnalysis: {currentValue, optimizedValue, valueAddPotential, suggestedCapRate}
- riskAnalysis: {currentRisk, mitigationStrategies: [{risk, strategy, impact}]}
- holdSellAnalysis: {recommendation, reasoning, projectedReturns}
- capitalImprovements: array of suggested improvements with ROI
- marketOutlook: assessment of the property's market
- recommendations: prioritized action items`;

    const aiResult = await callOpenRouter(prompt);
    let parsed;
    try {
      const jsonMatch = aiResult.match(/```json\n?([\s\S]*?)\n?```/) || aiResult.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResult);
    } catch { parsed = { summary: aiResult, recommendations: [] }; }
    res.json({ success: true, analysis: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const analyzeMarketComp = async (req, res) => {
  try {
    const { propertyAddress, propertyType, submarket, market, squareFootage, askingRentPerSqFt, effectiveRentPerSqFt, occupancyRate, leaseType, buildingClass, yearBuilt } = req.body;
    const prompt = `Analyze this market comparable for commercial real estate:

Property: ${propertyAddress}
Type: ${propertyType}
Submarket: ${submarket}
Market: ${market}
Size: ${squareFootage} SF
Asking Rent: $${askingRentPerSqFt}/SF
Effective Rent: $${effectiveRentPerSqFt}/SF
Occupancy: ${occupancyRate}%
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

    const aiResult = await callOpenRouter(prompt);
    let parsed;
    try {
      const jsonMatch = aiResult.match(/```json\n?([\s\S]*?)\n?```/) || aiResult.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResult);
    } catch { parsed = { summary: aiResult, recommendations: [] }; }
    res.json({ success: true, analysis: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { analyzeLeaseAbstraction, analyzeEscalation, analyzeNegotiation, analyzePortfolio, analyzeMarketComp };
