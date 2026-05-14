# Audit Note — AICommercialLeaseAnalyzer

Source: `_AUDIT/reports/batch_01.md` (Project 36)

## Maturity: PARTIAL-BUILD (10 routes, 5 AI endpoints)

## Original audit recommendations

### Gaps & Opportunities
- Limited AI Coverage.
- Missing Notifications (project has lease-specific alerts but no generic notification inbox).

### Strategic Feature Suggestions
1. Agentic Workflow Orchestration
2. RAG over Domain Documents
3. Real-time Anomaly Detection
4. White-label/Reseller Platform

## Categorization
- **MECHANICAL:** generic notifications inbox.
- **NEEDS-PRODUCT-DECISION:** agentic, RAG, white-label.

## Implementations applied
1. **`backend/src/routes/notifications.js`** — in-memory per-user notification inbox CRUD.
2. **`backend/src/server.js`** — mounted at `/api/notifications`.

Syntax-checked with `node --check`.

## Backlog (prioritized)

### High priority
- **Promote in-memory notifications to a Sequelize Notification model** (sibling to LeaseAlert).
- **Wire lease-alert resolution events to push notifications**.

### Medium priority
- **`POST /api/ai/extract-clauses`** — clause-level extraction from a lease PDF (project already supports up to 50MB uploads).
- **RAG over jurisdictional case law** for `/api/ai/analyze-negotiation`.

### Low priority
- White-label per-broker branding.
- Agentic continuous-portfolio rebalancing recommendation.

## Apply pass 3 (frontend)

LEFT-AS-IS. FE already wires every backend AI endpoint (`/api/ai/analyze-*`, `/api/ai/lease-comparison`, `/sublease-analysis`, `/early-termination`, `/lease-audit`) and the notifications inbox via `frontend/src/services/api.js` (axios with JWT Bearer interceptor reading `localStorage.token`). Pages: `AILab.js`, `Notifications.js`, `LeaseComparison.js`, etc. No FE changes needed.

## Apply pass 4 (mechanical backlog)

LEFT-AS-IS. The only previously-mechanical backlog item — `POST /api/ai/extract-clauses` — has already been implemented in `backend/src/routes/aiNew.js` (with 503 short-circuit when `OPENROUTER_API_KEY` is missing) and is wired in the FE through `frontend/src/services/api.js#extractClauses` and the "clauses" tab in `frontend/src/pages/AILab.js`. The remaining backlog items are explicitly NEEDS-PRODUCT-DECISION (RAG over case-law, white-label branding, agentic portfolio rebalancing, push-notification channel choice) or require a DB migration to a Sequelize Notification model (TOO-RISKY without runtime DB boot in this sandbox). No new endpoints or pages added this pass.
