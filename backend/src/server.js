const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const leaseRoutes = require('./routes/leases');
const escalationRoutes = require('./routes/escalations');
const negotiationRoutes = require('./routes/negotiations');
const portfolioRoutes = require('./routes/portfolio');
const marketCompRoutes = require('./routes/marketComps');
const aiRoutes = require('./routes/ai');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.BACKEND_PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/market-comps', marketCompRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
