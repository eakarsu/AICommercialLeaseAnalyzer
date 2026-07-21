BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE TABLE IF NOT EXISTS lease_matters (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, matter_number text NOT NULL, name text NOT NULL, privilege_status text NOT NULL,
  status text NOT NULL DEFAULT 'open', retention_until date, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,matter_number)
);
CREATE TABLE IF NOT EXISTS lease_document_versions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, matter_id uuid NOT NULL REFERENCES lease_matters(id), version integer NOT NULL,
  object_key text NOT NULL, sha256 char(64) NOT NULL, mime_type text NOT NULL, page_count integer CHECK(page_count > 0), source_system text NOT NULL,
  status text NOT NULL CHECK(status IN ('uploaded','extracting','review','changes_requested','approved','executed','failed')),
  uploaded_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(matter_id,version), UNIQUE(tenant_id,sha256)
);
CREATE TABLE IF NOT EXISTS lease_clauses (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, document_version_id uuid NOT NULL REFERENCES lease_document_versions(id), stable_key text NOT NULL,
  clause_type text NOT NULL, clause_text text NOT NULL, text_hash char(64) NOT NULL, normalized_value jsonb, confidence numeric CHECK(confidence BETWEEN 0 AND 1),
  extraction_provider text NOT NULL, extraction_model_version text NOT NULL, UNIQUE(document_version_id,stable_key)
);
CREATE TABLE IF NOT EXISTS lease_clause_citations (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, clause_id uuid NOT NULL REFERENCES lease_clauses(id), page integer NOT NULL CHECK(page > 0),
  bounding_box jsonb, quote_hash char(64) NOT NULL
);
CREATE TABLE IF NOT EXISTS lease_obligations (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, clause_id uuid NOT NULL REFERENCES lease_clauses(id), party text NOT NULL, due_date date,
  recurrence_rule text, calendar_external_id text, status text NOT NULL CHECK(status IN ('draft','verified','scheduled','completed','cancelled')), verified_by text
);
CREATE TABLE IF NOT EXISTS lease_review_decisions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, document_version_id uuid NOT NULL REFERENCES lease_document_versions(id), reviewer_id text NOT NULL,
  reviewer_role text NOT NULL, decision text NOT NULL CHECK(decision IN ('approved','changes_requested')), notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lease_integration_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, provider text NOT NULL, direction text NOT NULL,
  idempotency_key text NOT NULL, status text NOT NULL CHECK(status IN ('pending','succeeded','failed')), external_id text, failure_code text,
  occurred_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,provider,idempotency_key)
);
CREATE TABLE IF NOT EXISTS lease_audit_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, matter_id uuid NOT NULL, actor_id text,
  event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lease_documents_matter ON lease_document_versions(tenant_id,matter_id,version DESC);
COMMIT;
