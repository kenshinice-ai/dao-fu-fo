BEGIN;

ALTER TABLE museum.review_checks
  ALTER COLUMN reviewed_at DROP NOT NULL,
  ADD CONSTRAINT review_checks_completion_time_ck
    CHECK (status = 'pending' OR reviewed_at IS NOT NULL);

ALTER TABLE museum.museum_object_profiles
  ADD COLUMN collection_status text NOT NULL DEFAULT 'placeholder'
    CHECK (collection_status IN ('placeholder', 'identified', 'catalogued'));

CREATE TABLE museum.audio_scripts (
  id uuid PRIMARY KEY,
  canonical_key text NOT NULL UNIQUE,
  title_zh text NOT NULL,
  title_en text NOT NULL,
  description_zh text NOT NULL,
  description_en text NOT NULL,
  transcript_zh text NOT NULL,
  transcript_en text NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  asset_status text NOT NULL CHECK (asset_status IN ('not_recorded', 'draft', 'ready', 'published')),
  publication_state museum.publication_state NOT NULL,
  review_status museum.review_status NOT NULL,
  rights_status museum.rights_status NOT NULL,
  content_version text NOT NULL,
  CHECK (publication_state <> 'public' OR review_status = 'publishable'),
  CHECK (publication_state <> 'public' OR asset_status IN ('ready', 'published'))
);

CREATE TABLE museum.audio_script_sources (
  audio_script_id uuid NOT NULL REFERENCES museum.audio_scripts(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES museum.sources(id),
  PRIMARY KEY (audio_script_id, source_id)
);

CREATE INDEX audio_scripts_publication_idx
  ON museum.audio_scripts (publication_state, review_status, asset_status);

COMMIT;
