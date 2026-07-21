const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('./config/runtime').validateRuntime();

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const leaseRoutes = require('./routes/leases');
const escalationRoutes = require('./routes/escalations');
const negotiationRoutes = require('./routes/negotiations');
const portfolioRoutes = require('./routes/portfolio');
const marketCompRoutes = require('./routes/marketComps');
const aiRoutes = require('./routes/ai');
const aiNewRoutes = require('./routes/aiNew');
const exportRoutes = require('./routes/export');
const leaseAlertRoutes = require('./routes/leaseAlerts');

const app = express();
const PORT = process.env.BACKEND_PORT || 4001;

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin not allowed')); }, credentials: true }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/market-comps', marketCompRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai', aiNewRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/lease-alerts', leaseAlertRoutes);
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
// Audit-recommended addition (notifications)
app.use('/api/notifications', require('./routes/notifications'));

// Custom Views (mounted BEFORE 404/global error handler)
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/co-tenancy-clause-watch', require('./routes/coTenancyClauseWatch'));
app.use('/api/governed-review', require('./routes/governedReview'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 20MB.' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    // Migrations are explicit and never run as a side effect of startup.
    
app.use('/api/lease-abstractor', require('./routes/leaseAbstractor')); // apply pass 6 — audit custom suggestion

app.use('/api/portfolio-market-rag', require('./routes/portfolioMarketRag')); // apply pass 6 — audit custom suggestion

app.use('/api/critical-date-alerts', require('./routes/criticalDateAlerts')); // apply pass 6 — audit custom suggestion

app.use('/api/broker-white-label', require('./routes/brokerWhiteLabel')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

