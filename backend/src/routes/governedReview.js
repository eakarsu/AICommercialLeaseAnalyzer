'use strict';
const express = require('express');
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validateExtraction, compareVersions, transitionReview } = require('../domain/leaseReviewWorkflow');
const router = express.Router(); router.use(authenticateToken);
function tenant(req, res) { if (!req.user.tenant_id) { res.status(403).json({ error: 'Tenant-scoped identity required' }); return null; } return req.user.tenant_id; }

router.post('/matters/:matterId/versions', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  const { objectKey, sha256, mimeType, pageCount, sourceSystem } = req.body;
  if (!objectKey || !/^[a-f0-9]{64}$/i.test(sha256 || '') || !mimeType || !Number.isInteger(pageCount) || pageCount < 1 || !sourceSystem) return res.status(400).json({ error: 'Object key, SHA-256, MIME type, page count, and source system required' });
  const transaction = await sequelize.transaction();
  try {
    const [matter] = await sequelize.query('SELECT id FROM lease_matters WHERE id=:matter AND tenant_id=:tenant', { replacements: { matter: req.params.matterId, tenant: tenantId }, type: QueryTypes.SELECT, transaction });
    if (!matter) { await transaction.rollback(); return res.status(404).json({ error: 'Matter not found in tenant' }); }
    const [next] = await sequelize.query('SELECT COALESCE(max(version),0)+1 AS version FROM lease_document_versions WHERE matter_id=:matter AND tenant_id=:tenant', { replacements: { matter: req.params.matterId, tenant: tenantId }, type: QueryTypes.SELECT, transaction });
    const id = crypto.randomUUID();
    await sequelize.query(`INSERT INTO lease_document_versions(id,tenant_id,matter_id,version,object_key,sha256,mime_type,page_count,source_system,status,uploaded_by) VALUES(:id,:tenant,:matter,:version,:object,:sha,:mime,:pages,:source,'uploaded',:actor)`, { replacements: { id, tenant: tenantId, matter: req.params.matterId, version: next.version, object: objectKey, sha: sha256.toLowerCase(), mime: mimeType, pages: pageCount, source: sourceSystem, actor: req.user.id }, transaction });
    await sequelize.query(`INSERT INTO lease_audit_events(tenant_id,matter_id,actor_id,event_type,payload) VALUES(:tenant,:matter,:actor,'document.uploaded',:payload::jsonb)`, { replacements: { tenant: tenantId, matter: req.params.matterId, actor: req.user.id, payload: JSON.stringify({ documentVersionId: id, sha256, version: next.version }) }, transaction });
    await transaction.commit(); res.status(201).json({ id, version: next.version, status: 'uploaded' });
  } catch (error) { await transaction.rollback(); res.status(409).json({ error: 'Duplicate or invalid document version' }); }
});

router.post('/versions/:id/extraction', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  if (!['analyst','attorney','admin','integration'].includes(req.user.role)) return res.status(403).json({ error: 'Document review role required' });
  const transaction = await sequelize.transaction();
  try {
    const [doc] = await sequelize.query('SELECT * FROM lease_document_versions WHERE id=:id AND tenant_id=:tenant FOR UPDATE', { replacements: { id: req.params.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction });
    if (!doc) { await transaction.rollback(); return res.status(404).json({ error: 'Document version not found' }); }
    const validation = validateExtraction(req.body, doc.page_count);
    if (!validation.readyForReview) { await transaction.rollback(); return res.status(422).json({ error: 'Extraction evidence incomplete', validation }); }
    for (const clause of req.body.clauses) {
      const clauseId = crypto.randomUUID();
      await sequelize.query(`INSERT INTO lease_clauses(id,tenant_id,document_version_id,stable_key,clause_type,clause_text,text_hash,normalized_value,confidence,extraction_provider,extraction_model_version) VALUES(:id,:tenant,:doc,:key,:type,:text,:hash,:value::jsonb,:confidence,:provider,:model)`, { replacements: { id: clauseId, tenant: tenantId, doc: doc.id, key: clause.stableKey, type: clause.type, text: clause.text, hash: clause.textHash, value: JSON.stringify(clause.normalizedValue || {}), confidence: clause.confidence, provider: req.body.provider, model: req.body.modelVersion }, transaction });
      for (const citation of clause.citations) await sequelize.query(`INSERT INTO lease_clause_citations(id,tenant_id,clause_id,page,bounding_box,quote_hash) VALUES(:id,:tenant,:clause,:page,:box::jsonb,:hash)`, { replacements: { id: crypto.randomUUID(), tenant: tenantId, clause: clauseId, page: citation.page, box: JSON.stringify(citation.boundingBox || {}), hash: citation.quoteHash }, transaction });
    }
    await sequelize.query(`UPDATE lease_document_versions SET status='review' WHERE id=:id AND tenant_id=:tenant`, { replacements: { id: doc.id, tenant: tenantId }, transaction });
    await transaction.commit(); res.json({ status: 'review', validation });
  } catch (error) { await transaction.rollback(); res.status(422).json({ error: error.message }); }
});

router.get('/versions/:id/compare/:otherId', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  const load = async (id) => {
    const [doc] = await sequelize.query('SELECT sha256 FROM lease_document_versions WHERE id=:id AND tenant_id=:tenant', { replacements: { id, tenant: tenantId }, type: QueryTypes.SELECT });
    if (!doc) return null;
    const clauses = await sequelize.query('SELECT stable_key AS "stableKey",text_hash AS "textHash" FROM lease_clauses WHERE document_version_id=:id AND tenant_id=:tenant', { replacements: { id, tenant: tenantId }, type: QueryTypes.SELECT });
    return { sha256: doc.sha256, clauses };
  };
  const [previous, current] = await Promise.all([load(req.params.id), load(req.params.otherId)]); if (!previous || !current) return res.status(404).json({ error: 'Version not found in matter scope' });
  res.json(compareVersions(previous, current));
});

router.post('/versions/:id/decision', async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return; const transaction = await sequelize.transaction();
  try {
    const [doc] = await sequelize.query(`SELECT * FROM lease_document_versions WHERE id=:id AND tenant_id=:tenant FOR UPDATE`, { replacements: { id: req.params.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction });
    if (!doc) { await transaction.rollback(); return res.status(404).json({ error: 'Document not found' }); }
    const [open, coverage] = await Promise.all([
      sequelize.query(`SELECT count(*)::int AS count FROM lease_review_decisions WHERE document_version_id=:id AND tenant_id=:tenant AND decision='changes_requested'`, { replacements: { id: doc.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction }),
      sequelize.query(`SELECT count(DISTINCT c.id)::int AS clause_count,count(DISTINCT CASE WHEN ci.id IS NOT NULL THEN c.id END)::int AS cited_count FROM lease_clauses c LEFT JOIN lease_clause_citations ci ON ci.clause_id=c.id WHERE c.document_version_id=:id AND c.tenant_id=:tenant`, { replacements: { id: doc.id, tenant: tenantId }, type: QueryTypes.SELECT, transaction })
    ]);
    const citationCoverage = coverage[0].clause_count > 0 && coverage[0].cited_count === coverage[0].clause_count ? 1 : 0;
    const next = transitionReview(doc.status, req.body.decision, req.user.role, { sourceVerified: Boolean(doc.sha256), citationCoverage, openIssueCount: req.body.resolvePriorIssues ? 0 : open[0].count });
    await sequelize.query(`INSERT INTO lease_review_decisions(id,tenant_id,document_version_id,reviewer_id,reviewer_role,decision,notes) VALUES(:id,:tenant,:doc,:reviewer,:role,:decision,:notes)`, { replacements: { id: crypto.randomUUID(), tenant: tenantId, doc: doc.id, reviewer: req.user.id, role: req.user.role, decision: req.body.decision, notes: req.body.notes || null }, transaction });
    await sequelize.query('UPDATE lease_document_versions SET status=:status WHERE id=:id AND tenant_id=:tenant', { replacements: { status: next, id: doc.id, tenant: tenantId }, transaction });
    await sequelize.query(`INSERT INTO lease_audit_events(tenant_id,matter_id,actor_id,event_type,payload) VALUES(:tenant,:matter,:actor,'review.decision',:payload::jsonb)`, { replacements: { tenant: tenantId, matter: doc.matter_id, actor: String(req.user.id), payload: JSON.stringify({ documentVersionId: doc.id, decision: next, citationCoverage }) }, transaction });
    await transaction.commit(); res.json({ status: next, citationCoverage });
  } catch (error) { await transaction.rollback(); res.status(409).json({ error: error.message }); }
});
module.exports = router;
