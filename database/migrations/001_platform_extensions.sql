BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS museum;

CREATE TYPE museum.publication_state AS ENUM ('private', 'preview', 'public', 'withdrawn');
CREATE TYPE museum.review_status AS ENUM ('draft', 'fact_checked', 'tradition_reviewed', 'bilingual_reviewed', 'rights_cleared', 'publishable');
CREATE TYPE museum.evidence_layer AS ENUM ('historical_documented', 'historical_inferred', 'traditional_account', 'mythic_symbolic', 'later_deification', 'literary_representation', 'scholarly_interpretation');
CREATE TYPE museum.confidence AS ENUM ('high', 'medium', 'low', 'unknown');
CREATE TYPE museum.rights_status AS ENUM ('public_domain', 'open_licensed', 'permission_granted', 'quotation_only', 'external_reference_only', 'restricted', 'unknown');

CREATE TABLE museum.migration_history (
  version text PRIMARY KEY,
  checksum_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE museum.content_build_history (
  id uuid PRIMARY KEY,
  content_version text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('preview', 'public')),
  source_checksum_sha256 text NOT NULL,
  artifact_checksum_sha256 text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  UNIQUE (content_version, visibility, source_checksum_sha256)
);

COMMIT;
