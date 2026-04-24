const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'analyst' }
}, { tableName: 'users', timestamps: true });

const Lease = sequelize.define('Lease', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantName: { type: DataTypes.STRING, allowNull: false },
  propertyAddress: { type: DataTypes.STRING, allowNull: false },
  propertyType: { type: DataTypes.STRING },
  leaseType: { type: DataTypes.STRING },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  monthlyRent: { type: DataTypes.DECIMAL(12, 2) },
  annualRent: { type: DataTypes.DECIMAL(12, 2) },
  squareFootage: { type: DataTypes.INTEGER },
  rentPerSqFt: { type: DataTypes.DECIMAL(8, 2) },
  securityDeposit: { type: DataTypes.DECIMAL(12, 2) },
  leaseTermMonths: { type: DataTypes.INTEGER },
  escalationClause: { type: DataTypes.TEXT },
  renewalOption: { type: DataTypes.TEXT },
  specialProvisions: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: 'Active' },
  pdfUrl: { type: DataTypes.STRING },
  aiAbstraction: { type: DataTypes.JSONB }
}, { tableName: 'leases', timestamps: true });

const Escalation = sequelize.define('Escalation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  leaseId: { type: DataTypes.INTEGER, references: { model: 'leases', key: 'id' } },
  tenantName: { type: DataTypes.STRING, allowNull: false },
  propertyAddress: { type: DataTypes.STRING },
  currentRent: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  escalationType: { type: DataTypes.STRING, allowNull: false },
  escalationRate: { type: DataTypes.DECIMAL(5, 2) },
  escalationSchedule: { type: DataTypes.STRING },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  projectedRents: { type: DataTypes.JSONB },
  cpiIndex: { type: DataTypes.STRING },
  capRate: { type: DataTypes.DECIMAL(5, 2) },
  floorRate: { type: DataTypes.DECIMAL(5, 2) },
  notes: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: 'Active' },
  aiAnalysis: { type: DataTypes.JSONB }
}, { tableName: 'escalations', timestamps: true });

const Negotiation = sequelize.define('Negotiation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  leaseId: { type: DataTypes.INTEGER, references: { model: 'leases', key: 'id' } },
  tenantName: { type: DataTypes.STRING, allowNull: false },
  propertyAddress: { type: DataTypes.STRING },
  currentTermEnd: { type: DataTypes.DATEONLY },
  renewalType: { type: DataTypes.STRING },
  proposedTermMonths: { type: DataTypes.INTEGER },
  currentRent: { type: DataTypes.DECIMAL(12, 2) },
  proposedRent: { type: DataTypes.DECIMAL(12, 2) },
  marketRent: { type: DataTypes.DECIMAL(12, 2) },
  tenantImprovementAllowance: { type: DataTypes.DECIMAL(12, 2) },
  freeRentMonths: { type: DataTypes.INTEGER },
  negotiationStatus: { type: DataTypes.STRING, defaultValue: 'Pending' },
  landlordPriorities: { type: DataTypes.TEXT },
  tenantPriorities: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT },
  aiInsights: { type: DataTypes.JSONB }
}, { tableName: 'negotiations', timestamps: true });

const Portfolio = sequelize.define('Portfolio', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyName: { type: DataTypes.STRING, allowNull: false },
  propertyAddress: { type: DataTypes.STRING, allowNull: false },
  propertyType: { type: DataTypes.STRING },
  totalSquareFootage: { type: DataTypes.INTEGER },
  occupancyRate: { type: DataTypes.DECIMAL(5, 2) },
  totalUnits: { type: DataTypes.INTEGER },
  occupiedUnits: { type: DataTypes.INTEGER },
  annualNOI: { type: DataTypes.DECIMAL(14, 2) },
  propertyValue: { type: DataTypes.DECIMAL(14, 2) },
  capRate: { type: DataTypes.DECIMAL(5, 2) },
  debtService: { type: DataTypes.DECIMAL(14, 2) },
  dscr: { type: DataTypes.DECIMAL(5, 2) },
  yearBuilt: { type: DataTypes.INTEGER },
  lastRenovation: { type: DataTypes.INTEGER },
  market: { type: DataTypes.STRING },
  riskScore: { type: DataTypes.DECIMAL(3, 1) },
  status: { type: DataTypes.STRING, defaultValue: 'Active' },
  aiOptimization: { type: DataTypes.JSONB }
}, { tableName: 'portfolios', timestamps: true });

const MarketComp = sequelize.define('MarketComp', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  propertyAddress: { type: DataTypes.STRING, allowNull: false },
  propertyType: { type: DataTypes.STRING },
  submarket: { type: DataTypes.STRING },
  market: { type: DataTypes.STRING },
  squareFootage: { type: DataTypes.INTEGER },
  askingRentPerSqFt: { type: DataTypes.DECIMAL(8, 2) },
  effectiveRentPerSqFt: { type: DataTypes.DECIMAL(8, 2) },
  occupancyRate: { type: DataTypes.DECIMAL(5, 2) },
  leaseType: { type: DataTypes.STRING },
  tenantName: { type: DataTypes.STRING },
  transactionDate: { type: DataTypes.DATEONLY },
  freeRentMonths: { type: DataTypes.INTEGER },
  tiAllowance: { type: DataTypes.DECIMAL(8, 2) },
  escalationRate: { type: DataTypes.DECIMAL(5, 2) },
  buildingClass: { type: DataTypes.STRING },
  yearBuilt: { type: DataTypes.INTEGER },
  parkingRatio: { type: DataTypes.STRING },
  source: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  aiAnalysis: { type: DataTypes.JSONB }
}, { tableName: 'market_comps', timestamps: true });

Lease.hasMany(Escalation, { foreignKey: 'leaseId' });
Escalation.belongsTo(Lease, { foreignKey: 'leaseId' });
Lease.hasMany(Negotiation, { foreignKey: 'leaseId' });
Negotiation.belongsTo(Lease, { foreignKey: 'leaseId' });

module.exports = { sequelize, User, Lease, Escalation, Negotiation, Portfolio, MarketComp };
