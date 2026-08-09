BEGIN;

ALTER TABLE museum.sources
  ADD COLUMN locator_level text NOT NULL DEFAULT 'topic'
    CHECK (locator_level IN ('collection', 'topic', 'edition', 'item', 'precise')),
  ADD COLUMN citation_status text NOT NULL DEFAULT 'draft'
    CHECK (citation_status IN ('draft', 'verified'));

CREATE INDEX sources_publication_quality_idx
  ON museum.sources (citation_status, locator_level, rights_status, evidence_grade);

COMMIT;
