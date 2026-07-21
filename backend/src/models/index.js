const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'analyst' },
  tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verificationToken: { type: DataTypes.STRING },
  verificationTokenExpiry: { type: DataTypes.DATE }
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

const LeaseAlert = sequelize.define('LeaseAlert', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  leaseId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leases', key: 'id' } },
  userId: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  alertType: { type: DataTypes.STRING, allowNull: false }, // expiration, option_deadline, rent_bump, custom
  alertDate: { type: DataTypes.DATEONLY, allowNull: false },
  message: { type: DataTypes.TEXT },
  notified: { type: DataTypes.BOOLEAN, defaultValue: false },
  notifiedAt: { type: DataTypes.DATE }
}, { tableName: 'lease_alerts', timestamps: true });

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  action: { type: DataTypes.STRING, allowNull: false },
  entityType: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING },
  title: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'completed' },
  source: { type: DataTypes.STRING, defaultValue: 'app' },
  details: { type: DataTypes.JSONB }
}, { tableName: 'audit_logs', timestamps: true });

const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  prompt: { type: DataTypes.TEXT, allowNull: false },
  response: { type: DataTypes.JSONB },
  status: { type: DataTypes.STRING, defaultValue: 'completed' },
  source: { type: DataTypes.STRING, defaultValue: 'floating_chatbot' }
}, { tableName: 'chat_messages', timestamps: true });

Lease.hasMany(Escalation, { foreignKey: 'leaseId' });
Escalation.belongsTo(Lease, { foreignKey: 'leaseId' });
Lease.hasMany(Negotiation, { foreignKey: 'leaseId' });
Negotiation.belongsTo(Lease, { foreignKey: 'leaseId' });
Lease.hasMany(LeaseAlert, { foreignKey: 'leaseId' });
LeaseAlert.belongsTo(Lease, { foreignKey: 'leaseId' });
User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ChatMessage, { foreignKey: 'userId' });
ChatMessage.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Lease, Escalation, Negotiation, Portfolio, MarketComp, LeaseAlert, AuditLog, ChatMessage };
