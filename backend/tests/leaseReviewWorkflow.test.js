const test = require('node:test');
const assert = require('node:assert/strict');
const { validateExtraction, compareVersions, transitionReview } = require('../src/domain/leaseReviewWorkflow');

test('requires page-bounded hashed citations and normalized obligation dates', () => {
  assert.equal(validateExtraction({ clauses: [{ type: 'rent', text: 'Rent', citations: [{ page: 2, quoteHash: 'abc' }] }] }, 3).readyForReview, true);
  assert.equal(validateExtraction({ clauses: [{ type: 'obligation', text: 'Notify', citations: [{ page: 4, quoteHash: 'abc' }] }] }, 3).readyForReview, false);
});
test('compares stable clause identities across checksummed versions', () => {
  assert.deepEqual(compareVersions({ sha256: 'a', clauses: [{ stableKey: 'rent', textHash: '1' }] }, { sha256: 'b', clauses: [{ stableKey: 'rent', textHash: '2' }, { stableKey: 'cam', textHash: '3' }] }), { changed: true, added: ['cam'], removed: [], modified: ['rent'] });
});
test('requires attorney approval with complete evidence', () => {
  assert.throws(() => transitionReview('review', 'approved', 'analyst', { sourceVerified: true, citationCoverage: 1, openIssueCount: 0 }), /attorney/);
  assert.equal(transitionReview('review', 'approved', 'attorney', { sourceVerified: true, citationCoverage: 1, openIssueCount: 0 }), 'approved');
});
