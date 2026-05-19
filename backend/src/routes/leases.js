const express = require('express');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Lease } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validateLease } = require('../middleware/validate');
const router = express.Router();

// Multer: PDF only, 20 MB max, stored in memory for text extraction
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// GET /api/leases?page=1&limit=20
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await Lease.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const lease = await Lease.findByPk(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    res.json(lease);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, validateLease, async (req, res) => {
  try {
    const lease = await Lease.create(req.body);
    res.status(201).json(lease);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const lease = await Lease.findByPk(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    await lease.update(req.body);
    res.json(lease);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const lease = await Lease.findByPk(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Lease not found' });
    await lease.destroy();
    res.json({ message: 'Lease deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/leases/upload — Upload PDF, extract text, return extracted text
router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    const data = await pdfParse(req.file.buffer);
    const text = data.text || '';
    res.json({
      success: true,
      filename: req.file.originalname,
      pages: data.numpages,
      text,
      charCount: text.length
    });
  } catch (error) {
    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to parse PDF: ' + error.message });
  }
});

// POST /api/leases/extract-terms — takes {text}, returns AI-extracted structured lease terms
router.post('/extract-terms', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return res.status(400).json({ error: 'text is required and must be at least 10 characters' });
    }

    const axios = require('axios');
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const MODEL = 'anthropic/claude-3-5-sonnet-20241022';
    const SYSTEM = 'You are an expert commercial real estate attorney and lease analyst. Provide detailed analysis of lease terms, risks, and negotiation strategies.';

    const prompt = `Extract all key lease terms from the following commercial lease document text and return them as structured JSON.

Return a JSON object with these keys:
- tenantName: string
- landlordName: string
- propertyAddress: string
- propertyType: string (office/retail/industrial/warehouse/flex/other)
- leaseType: string (NNN/Gross/Modified Gross/Full Service/other)
- startDate: string (YYYY-MM-DD or null)
- endDate: string (YYYY-MM-DD or null)
- leaseTermMonths: number or null
- monthlyRent: number or null
- annualRent: number or null
- squareFootage: number or null
- rentPerSqFt: number or null
- securityDeposit: number or null
- escalationClause: string description or null
- renewalOption: string description or null
- terminationProvisions: string or null
- tenantImprovementAllowance: number or null
- freeRentMonths: number or null
- parkingProvisions: string or null
- assignmentSubletting: string or null
- specialProvisions: string (other notable terms) or null
- keyRisks: array of strings identifying risk factors
- missingProvisions: array of strings for provisions not found but typically expected

Lease text:
${text.substring(0, 12000)}`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2500
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

    const aiText = response.data.choices[0].message.content;
    let terms;
    try {
      const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/) || aiText.match(/\{[\s\S]*\}/);
      terms = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiText);
    } catch {
      terms = { raw: aiText };
    }

    res.json({ success: true, terms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
