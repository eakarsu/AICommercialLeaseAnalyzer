'use strict';

const TRANSITIONS = Object.freeze({ uploaded: ['extracting', 'failed'], extracting: ['review', 'failed'], review: ['changes_requested', 'approved'], changes_requested: ['extracting'], approved: ['executed'], executed: [], failed: ['extracting'] });

function validateExtraction(extraction, pageCount) {
  if (!extraction || !Array.isArray(extraction.clauses) || extraction.clauses.length === 0) throw new Error('extracted clauses required');
  const invalid = extraction.clauses.filter((clause) => !clause.type || !clause.text || !Array.isArray(clause.citations) || clause.citations.length === 0 || clause.citations.some((citation) => !Number.isInteger(citation.page) || citation.page < 1 || citation.page > pageCount || !citation.quoteHash));
  const obligationsWithoutDate = extraction.clauses.filter((clause) => clause.type === 'obligation' && !clause.normalizedDate);
  const coverage = (extraction.clauses.length - invalid.length) / extraction.clauses.length;
  return { citationCoverage: coverage, invalidClauseCount: invalid.length, obligationsWithoutDate: obligationsWithoutDate.length, readyForReview: invalid.length === 0 && obligationsWithoutDate.length === 0 };
}

function compareVersions(previous, current) {
  if (!previous?.sha256 || !current?.sha256) throw new Error('checksummed document versions required');
  if (previous.sha256 === current.sha256) return { changed: false, added: [], removed: [], modified: [] };
  const prior = new Map((previous.clauses || []).map((c) => [c.stableKey, c.textHash]));
  const next = new Map((current.clauses || []).map((c) => [c.stableKey, c.textHash]));
  return {
    changed: true,
    added: [...next.keys()].filter((key) => !prior.has(key)),
    removed: [...prior.keys()].filter((key) => !next.has(key)),
    modified: [...next.keys()].filter((key) => prior.has(key) && prior.get(key) !== next.get(key))
  };
}

function transitionReview(current, next, actorRole, context = {}) {
  if (!(TRANSITIONS[current] || []).includes(next)) throw new Error(`invalid transition ${current} -> ${next}`);
  if (next === 'approved') {
    if (!['attorney', 'admin'].includes(actorRole)) throw new Error('attorney approval required');
    if (!context.sourceVerified || context.citationCoverage !== 1 || context.openIssueCount > 0) throw new Error('verified source, complete citations, and resolved issues required');
  }
  if (next === 'executed' && !context.signatureEnvelopeVerified) throw new Error('verified e-signature envelope required');
  return next;
}

module.exports = { TRANSITIONS, validateExtraction, compareVersions, transitionReview };
