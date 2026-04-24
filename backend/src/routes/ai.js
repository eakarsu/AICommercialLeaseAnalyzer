const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { analyzeLeaseAbstraction, analyzeEscalation, analyzeNegotiation, analyzePortfolio, analyzeMarketComp } = require('../controllers/aiController');
const router = express.Router();

router.post('/analyze-lease', authenticateToken, analyzeLeaseAbstraction);
router.post('/analyze-escalation', authenticateToken, analyzeEscalation);
router.post('/analyze-negotiation', authenticateToken, analyzeNegotiation);
router.post('/analyze-portfolio', authenticateToken, analyzePortfolio);
router.post('/analyze-market-comp', authenticateToken, analyzeMarketComp);

module.exports = router;
