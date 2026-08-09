BEGIN;

CREATE TABLE museum.sources (
  id uuid PRIMARY KEY,
  canonical_key text NOT NULL UNIQUE,
  source_type text NOT NULL,
  evidence_grade text NOT NULL CHECK (evidence_grade IN ('A', 'B', 'C', 'D')),
  title_original text NOT NULL,
  title_zh text,
  title_en text,
  creator_or_editor text,
  publisher_or_institution text,
  publication_year integer CHECK (publication_year IS NULL OR publication_year <> 0),
  url text,
  accessed_at date,
  rights_status museum.rights_status NOT NULL,
  citation_zh text NOT NULL,
  citation_en text NOT NULL
);

CREATE TABLE museum.source_versions (
  id uuid PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES museum.sources(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  language_code text,
  edition_statement text,
  digital_identifier text,
  checksum_sha256 text,
  url text,
  rights_status museum.rights_status NOT NULL,
  UNIQUE (source_id, version_label)
);

CREATE TABLE museum.source_locators (
  id uuid PRIMARY KEY,
  source_version_id uuid NOT NULL REFERENCES museum.source_versions(id) ON DELETE CASCADE,
  locator_type text NOT NULL CHECK (locator_type IN ('volume', 'chapter', 'section', 'page', 'line', 'paragraph', 'inscription_number', 'catalogue_number', 'canonical_reference', 'timestamp', 'URL_fragment')),
  locator_value text NOT NULL,
  locator_normalised text NOT NULL,
  quote_excerpt text
);

CREATE TABLE museum.entity_sources (
  entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES museum.sources(id),
  source_locator_id uuid REFERENCES museum.source_locators(id),
  support_role text NOT NULL CHECK (support_role IN ('documents', 'supports', 'contextualises', 'disputes', 'traditional_basis', 'rights_basis', 'translation_basis', 'geographic_basis', 'chronological_basis')),
  claim_summary text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (entity_id, source_id, support_role)
);

CREATE TABLE museum.review_checks (
  id uuid PRIMARY KEY,
  subject_kind text NOT NULL CHECK (subject_kind IN ('entity', 'relation', 'media', 'exhibition', 'audio')),
  subject_id uuid NOT NULL,
  check_kind text NOT NULL CHECK (check_kind IN ('schema', 'fact', 'tradition', 'bilingual', 'rights', 'accessibility', 'editorial')),
  locale text CHECK (locale IS NULL OR locale IN ('zh-CN', 'en')),
  status text NOT NULL CHECK (status IN ('pending', 'passed', 'failed', 'waived')),
  reviewer text NOT NULL,
  reviewed_at timestamptz NOT NULL,
  note text
);

CREATE TABLE museum.entity_revisions (
  id uuid PRIMARY KEY,
  entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  changed_fields jsonb NOT NULL,
  previous_values jsonb,
  new_values jsonb NOT NULL,
  change_reason text NOT NULL,
  editor text NOT NULL,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_content_version text
);

ALTER TABLE museum.entity_aliases ADD CONSTRAINT entity_aliases_source_fk FOREIGN KEY (source_id) REFERENCES museum.sources(id);

COMMIT;
