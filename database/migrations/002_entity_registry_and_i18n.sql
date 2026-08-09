BEGIN;

CREATE TABLE museum.entity_kind_registry (
  kind text PRIMARY KEY,
  label_zh text NOT NULL,
  label_en text NOT NULL
);

INSERT INTO museum.entity_kind_registry (kind, label_zh, label_en) VALUES
  ('tradition', '传统', 'Tradition'), ('figure', '人物', 'Figure'), ('text', '文本', 'Text'),
  ('text_version', '文本版本', 'Text version'), ('passage', '原典摘录', 'Passage'), ('concept', '理念', 'Concept'),
  ('school', '学派或宗派', 'School'), ('institution', '机构', 'Institution'), ('practice', '实践', 'Practice'),
  ('place', '地点', 'Place'), ('event', '事件', 'Event'), ('route', '路线', 'Route'), ('museum_object', '数字藏品', 'Museum object');

CREATE TABLE museum.entities (
  id uuid PRIMARY KEY,
  kind text NOT NULL REFERENCES museum.entity_kind_registry(kind),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  default_locale text NOT NULL DEFAULT 'zh-CN' CHECK (default_locale IN ('zh-CN', 'en')),
  publication_state museum.publication_state NOT NULL,
  review_status museum.review_status NOT NULL,
  primary_evidence_layer museum.evidence_layer NOT NULL,
  importance smallint NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  is_featured boolean NOT NULL DEFAULT false,
  content_version text NOT NULL,
  withdrawal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug),
  CHECK (publication_state <> 'public' OR review_status = 'publishable'),
  CHECK (publication_state <> 'withdrawn' OR withdrawal_reason IS NOT NULL)
);

CREATE TABLE museum.entity_translations (
  entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('zh-CN', 'en')),
  title text NOT NULL CHECK (btrim(title) <> ''),
  subtitle text,
  short_summary text NOT NULL CHECK (btrim(short_summary) <> ''),
  curatorial_description text NOT NULL,
  research_note text NOT NULL,
  time_label text NOT NULL,
  key_facts jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(key_facts) = 'array'),
  quote jsonb,
  PRIMARY KEY (entity_id, locale)
);

CREATE TABLE museum.entity_aliases (
  id uuid PRIMARY KEY,
  entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  locale text CHECK (locale IS NULL OR locale IN ('zh-CN', 'en')),
  script_code text,
  alias text NOT NULL,
  alias_kind text NOT NULL CHECK (alias_kind IN ('alternate', 'historical', 'courtesy', 'dharma', 'posthumous', 'transliteration', 'former_name', 'typo_variant')),
  valid_from_year integer CHECK (valid_from_year IS NULL OR valid_from_year <> 0),
  valid_to_year integer CHECK (valid_to_year IS NULL OR valid_to_year <> 0),
  is_searchable boolean NOT NULL DEFAULT true,
  is_preferred boolean NOT NULL DEFAULT false,
  source_id uuid,
  CHECK (valid_from_year IS NULL OR valid_to_year IS NULL OR valid_to_year >= valid_from_year)
);

COMMIT;
