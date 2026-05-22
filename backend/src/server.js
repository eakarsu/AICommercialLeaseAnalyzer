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
const aiNewRoutes = require('./routes/aiNew');
const exportRoutes = require('./routes/export');
const leaseAlertRoutes = require('./routes/leaseAlerts');

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
app.use('/api/ai', aiNewRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/lease-alerts', leaseAlertRoutes);
// Audit-recommended addition (notifications)
app.use('/api/notifications', require('./routes/notifications'));

// Custom Views (mounted BEFORE 404/global error handler)
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/co-tenancy-clause-watch', require('./routes/coTenancyClauseWatch'));

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
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    
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


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-only-5-ai-endpoints-despite-document-heavy-domain', require('./routes/gap_only_5_ai_endpoints_despite_document_heavy_domain'));
app.use('/api/gap-no-ai-clause-extraction-cam-escalation-exclusivity', require('./routes/gap_no_ai_clause_extraction_cam_escalation_exclusivity'));
app.use('/api/gap-no-ai-redlining-negotiation-recommendation-engine-', require('./routes/gap_no_ai_redlining_negotiation_recommendation_engine_'));
app.use('/api/gap-no-ai-portfolio-anomaly-detection-across-leases', require('./routes/gap_no_ai_portfolio_anomaly_detection_across_leases'));
app.use('/api/gap-no-ai-document-ocr-layer-for-scanned-leases', require('./routes/gap_no_ai_document_ocr_layer_for_scanned_leases'));
app.use('/api/gap-notification-routes-exist-but-no-sms-email-deliver', require('./routes/gap_notification_routes_exist_but_no_sms_email_deliver'));
app.use('/api/gap-no-webhook-outbound-api', require('./routes/gap_no_webhook_outbound_api'));
app.use('/api/gap-no-e-signature-integration-docusign-adobe-sign', require('./routes/gap_no_e_signature_integration_docusign_adobe_sign'));
app.use('/api/gap-no-direct-property-management-api-client-yardi-mri', require('./routes/gap_no_direct_property_management_api_client_yardi_mri'));
app.use('/api/gap-no-tenant-portal-for-repair-expense-reconciliation', require('./routes/gap_no_tenant_portal_for_repair_expense_reconciliation'));
app.use('/api/gap-no-multi-currency-support-for-international-portfo', require('./routes/gap_no_multi_currency_support_for_international_portfo'));
