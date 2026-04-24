import React, { useState } from 'react';
import Navbar from '../components/Navbar';

const CalcCard = ({ title, icon, gradient, children }) => (
  <div className="glass rounded-2xl overflow-hidden">
    <div className={`h-2 bg-gradient-to-r ${gradient}`} />
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-xl">{icon}</span>
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  </div>
);

const Input = ({ label, value, onChange, suffix, prefix }) => (
  <div>
    <label className="text-dark-400 text-xs uppercase tracking-wider block mb-1">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-dark-800/50 border border-dark-700/50 rounded-lg py-2 text-white focus:border-primary-500 focus:outline-none ${prefix ? 'pl-7 pr-3' : 'px-3'} ${suffix ? 'pr-10' : ''}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">{suffix}</span>}
    </div>
  </div>
);

const Result = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center py-2 border-b border-dark-700/30 last:border-0">
    <span className="text-dark-400 text-sm">{label}</span>
    <span className={`font-semibold ${highlight ? 'text-emerald-400 text-lg' : 'text-white'}`}>{value}</span>
  </div>
);

const Calculators = () => {
  // NOI Calculator
  const [noiGrossIncome, setNoiGrossIncome] = useState('');
  const [noiVacancy, setNoiVacancy] = useState('5');
  const [noiOpex, setNoiOpex] = useState('');

  const noiEffective = Number(noiGrossIncome || 0) * (1 - Number(noiVacancy || 0) / 100);
  const noiResult = noiEffective - Number(noiOpex || 0);

  // Cap Rate Calculator
  const [capNoi, setCapNoi] = useState('');
  const [capValue, setCapValue] = useState('');
  const capRateResult = Number(capValue || 0) > 0 ? (Number(capNoi || 0) / Number(capValue || 0)) * 100 : 0;

  // Rent PSF Calculator
  const [rentTotal, setRentTotal] = useState('');
  const [rentSqFt, setRentSqFt] = useState('');
  const [rentPeriod, setRentPeriod] = useState('annual');
  const rentAnnual = rentPeriod === 'monthly' ? Number(rentTotal || 0) * 12 : Number(rentTotal || 0);
  const rentPsfResult = Number(rentSqFt || 0) > 0 ? rentAnnual / Number(rentSqFt || 0) : 0;
  const rentMonthlyPsf = rentPsfResult / 12;

  // Lease Value Calculator
  const [lvMonthlyRent, setLvMonthlyRent] = useState('');
  const [lvTermMonths, setLvTermMonths] = useState('');
  const [lvEscRate, setLvEscRate] = useState('3');
  const [lvFreeMonths, setLvFreeMonths] = useState('0');
  const [lvTiAllowance, setLvTiAllowance] = useState('0');

  const calcLeaseValue = () => {
    const monthly = Number(lvMonthlyRent || 0);
    const term = Number(lvTermMonths || 0);
    const esc = Number(lvEscRate || 0) / 100;
    const free = Number(lvFreeMonths || 0);
    const ti = Number(lvTiAllowance || 0);

    let total = 0;
    let currentMonthly = monthly;
    for (let m = 1; m <= term; m++) {
      if (m > free) total += currentMonthly;
      if (m > 0 && m % 12 === 0) currentMonthly *= (1 + esc);
    }
    const gross = monthly * term;
    const netEffective = term > 0 ? total / term : 0;
    return { total, gross, netEffective, concessions: (free * monthly) + ti, freeRentValue: free * monthly, ti };
  };

  const lv = calcLeaseValue();

  // Escalation Projection
  const [escCurrentRent, setEscCurrentRent] = useState('');
  const [escRate, setEscRate] = useState('3');
  const [escYears, setEscYears] = useState('5');

  const calcEscalation = () => {
    const current = Number(escCurrentRent || 0);
    const rate = Number(escRate || 0) / 100;
    const years = Number(escYears || 0);
    const projections = [];
    let rent = current;
    let cumulative = 0;
    for (let y = 1; y <= years; y++) {
      rent = y === 1 ? current : rent * (1 + rate);
      cumulative += rent * 12;
      projections.push({ year: y, annualRent: rent * 12, monthlyRent: rent, cumulative, increase: y === 1 ? 0 : rate * 100 });
    }
    return projections;
  };

  const escProjections = calcEscalation();

  const fmt = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDec = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Financial Calculators</h1>
          <p className="text-dark-400 mt-1">CRE financial analysis tools</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NOI Calculator */}
          <CalcCard title="NOI Calculator" icon="$" gradient="from-emerald-600 to-teal-600">
            <div className="space-y-3 mb-5">
              <Input label="Gross Rental Income (Annual)" value={noiGrossIncome} onChange={setNoiGrossIncome} prefix="$" />
              <Input label="Vacancy Rate" value={noiVacancy} onChange={setNoiVacancy} suffix="%" />
              <Input label="Operating Expenses (Annual)" value={noiOpex} onChange={setNoiOpex} prefix="$" />
            </div>
            <div className="bg-dark-800/30 rounded-xl p-4">
              <Result label="Effective Gross Income" value={fmt(noiEffective)} />
              <Result label="Operating Expenses" value={fmt(noiOpex)} />
              <Result label="Net Operating Income (NOI)" value={fmt(noiResult)} highlight />
            </div>
          </CalcCard>

          {/* Cap Rate Calculator */}
          <CalcCard title="Cap Rate Calculator" icon="%" gradient="from-blue-600 to-cyan-600">
            <div className="space-y-3 mb-5">
              <Input label="Net Operating Income (NOI)" value={capNoi} onChange={setCapNoi} prefix="$" />
              <Input label="Property Value / Purchase Price" value={capValue} onChange={setCapValue} prefix="$" />
            </div>
            <div className="bg-dark-800/30 rounded-xl p-4">
              <Result label="Cap Rate" value={capRateResult.toFixed(2) + '%'} highlight />
              <Result label="Price Per Dollar NOI" value={Number(capNoi) > 0 ? fmtDec(Number(capValue) / Number(capNoi)) : '$0.00'} />
              <p className="text-dark-500 text-xs mt-3">Cap Rate = NOI / Property Value</p>
            </div>
          </CalcCard>

          {/* Rent Per SF Calculator */}
          <CalcCard title="Rent Per SF Calculator" icon="SF" gradient="from-purple-600 to-pink-600">
            <div className="space-y-3 mb-5">
              <Input label="Total Rent" value={rentTotal} onChange={setRentTotal} prefix="$" />
              <div>
                <label className="text-dark-400 text-xs uppercase tracking-wider block mb-1">Rent Period</label>
                <select
                  value={rentPeriod}
                  onChange={(e) => setRentPeriod(e.target.value)}
                  className="w-full bg-dark-800/50 border border-dark-700/50 rounded-lg py-2 px-3 text-white focus:border-primary-500 focus:outline-none"
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <Input label="Square Footage" value={rentSqFt} onChange={setRentSqFt} suffix="SF" />
            </div>
            <div className="bg-dark-800/30 rounded-xl p-4">
              <Result label="Annual Rent PSF" value={fmtDec(rentPsfResult)} highlight />
              <Result label="Monthly Rent PSF" value={fmtDec(rentMonthlyPsf)} />
              <Result label="Annual Rent Total" value={fmt(rentAnnual)} />
            </div>
          </CalcCard>

          {/* Lease Value Calculator */}
          <CalcCard title="Lease Value Calculator" icon="V" gradient="from-amber-600 to-orange-600">
            <div className="space-y-3 mb-5">
              <Input label="Monthly Base Rent" value={lvMonthlyRent} onChange={setLvMonthlyRent} prefix="$" />
              <Input label="Lease Term (Months)" value={lvTermMonths} onChange={setLvTermMonths} />
              <Input label="Annual Escalation Rate" value={lvEscRate} onChange={setLvEscRate} suffix="%" />
              <Input label="Free Rent Months" value={lvFreeMonths} onChange={setLvFreeMonths} />
              <Input label="TI Allowance" value={lvTiAllowance} onChange={setLvTiAllowance} prefix="$" />
            </div>
            <div className="bg-dark-800/30 rounded-xl p-4">
              <Result label="Gross Lease Value" value={fmt(lv.gross)} />
              <Result label="Total with Escalations" value={fmt(lv.total)} highlight />
              <Result label="Net Effective Rent/Mo" value={fmt(lv.netEffective)} />
              <Result label="Total Concessions" value={fmt(lv.concessions)} />
            </div>
          </CalcCard>

          {/* Escalation Projection */}
          <CalcCard title="Escalation Projection" icon="^" gradient="from-red-600 to-rose-600">
            <div className="space-y-3 mb-5">
              <Input label="Current Monthly Rent" value={escCurrentRent} onChange={setEscCurrentRent} prefix="$" />
              <Input label="Annual Escalation Rate" value={escRate} onChange={setEscRate} suffix="%" />
              <Input label="Projection Years" value={escYears} onChange={setEscYears} />
            </div>
            {escProjections.length > 0 && Number(escCurrentRent) > 0 && (
              <div className="bg-dark-800/30 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="p-2 text-left text-dark-400 font-medium">Year</th>
                      <th className="p-2 text-right text-dark-400 font-medium">Monthly</th>
                      <th className="p-2 text-right text-dark-400 font-medium">Annual</th>
                      <th className="p-2 text-right text-dark-400 font-medium">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escProjections.map((p) => (
                      <tr key={p.year} className="border-b border-dark-700/20">
                        <td className="p-2 text-white">{p.year}</td>
                        <td className="p-2 text-right text-dark-300">{fmt(p.monthlyRent)}</td>
                        <td className="p-2 text-right text-emerald-400 font-medium">{fmt(p.annualRent)}</td>
                        <td className="p-2 text-right text-dark-300">{fmt(p.cumulative)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CalcCard>

          {/* DSCR Calculator */}
          <CalcCard title="DSCR Calculator" icon="D" gradient="from-indigo-600 to-violet-600">
            <DSCRCalc />
          </CalcCard>
        </div>
      </div>
    </div>
  );
};

const DSCRCalc = () => {
  const [noi, setNoi] = useState('');
  const [debtService, setDebtService] = useState('');
  const dscrResult = Number(debtService || 0) > 0 ? Number(noi || 0) / Number(debtService || 0) : 0;
  const dscrStatus = dscrResult >= 1.25 ? 'Strong' : dscrResult >= 1.0 ? 'Adequate' : dscrResult > 0 ? 'Weak' : '';
  const dscrColor = dscrResult >= 1.25 ? 'text-emerald-400' : dscrResult >= 1.0 ? 'text-amber-400' : 'text-red-400';

  return (
    <>
      <div className="space-y-3 mb-5">
        <Input label="Annual NOI" value={noi} onChange={setNoi} prefix="$" />
        <Input label="Annual Debt Service" value={debtService} onChange={setDebtService} prefix="$" />
      </div>
      <div className="bg-dark-800/30 rounded-xl p-4">
        <Result label="DSCR Ratio" value={dscrResult.toFixed(2) + 'x'} highlight />
        {dscrStatus && (
          <div className="flex justify-between items-center py-2">
            <span className="text-dark-400 text-sm">Assessment</span>
            <span className={`font-semibold ${dscrColor}`}>{dscrStatus}</span>
          </div>
        )}
        <p className="text-dark-500 text-xs mt-3">DSCR = NOI / Annual Debt Service. Lenders typically require 1.20x+</p>
      </div>
    </>
  );
};

export default Calculators;
