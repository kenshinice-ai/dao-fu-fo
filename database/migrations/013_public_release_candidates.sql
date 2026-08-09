BEGIN;

CREATE TABLE museum.release_candidates (
  id uuid PRIMARY KEY,
  canonical_key text NOT NULL UNIQUE,
  content_version text NOT NULL,
  target_release_stage text NOT NULL CHECK (target_release_stage IN ('lean-public-mvp', 'public')),
  status text NOT NULL CHECK (status IN ('planning', 'in_review', 'ready', 'promoting', 'promoted', 'withdrawn')),
  title_zh text NOT NULL,
  title_en text NOT NULL,
  scope_zh text NOT NULL,
  scope_en text NOT NULL,
  selection_checksum_sha256 text NOT NULL CHECK (selection_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE museum.release_candidate_subjects (
  release_candidate_id uuid NOT NULL REFERENCES museum.release_candidates(id) ON DELETE CASCADE,
  subject_kind text NOT NULL CHECK (subject_kind IN ('entity', 'relation', 'audio')),
  subject_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('core', 'dependency', 'supporting')),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  PRIMARY KEY (release_candidate_id, subject_kind, subject_id),
  UNIQUE (release_candidate_id, subject_kind, role, sort_order)
);

CREATE TABLE museum.content_promotions (
  id uuid PRIMARY KEY,
  release_candidate_id uuid NOT NULL REFERENCES museum.release_candidates(id),
  promoted_by text NOT NULL,
  promoted_at timestamptz NOT NULL,
  source_checksum_sha256 text NOT NULL CHECK (source_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_checksum_sha256 text NOT NULL CHECK (artifact_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  target_visibility text NOT NULL CHECK (target_visibility = 'public'),
  notes text,
  UNIQUE (release_candidate_id, artifact_checksum_sha256)
);

CREATE INDEX release_candidates_status_idx
  ON museum.release_candidates (status, content_version);

CREATE INDEX release_candidate_subjects_subject_idx
  ON museum.release_candidate_subjects (subject_kind, subject_id);

COMMIT;
