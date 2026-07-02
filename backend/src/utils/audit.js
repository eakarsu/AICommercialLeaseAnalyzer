const { AuditLog } = require('../models');

function safeTitle(action, entityType, entityId) {
  const entity = String(entityType || 'record').replace(/[_-]/g, ' ');
  return `${action || 'updated'} ${entity}${entityId ? ` #${entityId}` : ''}`;
}

async function recordAudit(req, event = {}) {
  try {
    if (!AuditLog) return null;
    const action = event.action || 'updated';
    const entityType = event.entityType || 'record';
    const entityId = event.entityId === undefined || event.entityId === null ? null : String(event.entityId);
    return await AuditLog.create({
      userId: req?.user?.id || event.userId || null,
      action,
      entityType,
      entityId,
      title: event.title || safeTitle(action, entityType, entityId),
      status: event.status || 'completed',
      source: event.source || 'app',
      details: event.details || {}
    });
  } catch (error) {
    console.warn('Audit log skipped:', error.message);
    return null;
  }
}

module.exports = { recordAudit };
