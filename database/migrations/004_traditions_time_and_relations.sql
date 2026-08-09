BEGIN;

CREATE TABLE museum.tradition_profiles (
  entity_id uuid PRIMARY KEY REFERENCES museum.entities(id) ON DELETE CASCADE,
  parent_tradition_id uuid REFERENCES museum.entities(id),
  tradition_level smallint NOT NULL CHECK (tradition_level >= 0),
  tradition_kind text NOT NULL,
  color_token text NOT NULL,
  sort_order integer NOT NULL CHECK (sort_order > 0)
);

CREATE TABLE museum.entity_traditions (
  entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  tradition_id uuid NOT NULL REFERENCES museum.entities(id),
  role text NOT NULL CHECK (role IN ('primary', 'secondary', 'influenced_by', 'adopted_by', 'contested_by', 'syncretic', 'later_associated', 'comparative_only')),
  is_primary boolean NOT NULL,
  start_year integer CHECK (start_year IS NULL OR start_year <> 0),
  end_year integer CHECK (end_year IS NULL OR end_year <> 0),
  confidence museum.confidence NOT NULL,
  evidence_layer museum.evidence_layer NOT NULL,
  source_id uuid NOT NULL REFERENCES museum.sources(id),
  note jsonb,
  PRIMARY KEY (entity_id, tradition_id, role),
  CHECK (start_year IS NULL OR end_year IS NULL OR end_year >= start_year)
);

CREATE TABLE museum.temporal_predicate_registry (
  predicate text PRIMARY KEY,
  label_zh text NOT NULL,
  label_en text NOT NULL
);

INSERT INTO museum.temporal_predicate_registry (predicate, label_zh, label_en) VALUES
  ('birth','出生','Birth'), ('death','去世','Death'), ('life','生平范围','Life span'), ('activity','活动','Activity'),
  ('composition','成书','Composition'), ('compilation','编纂','Compilation'), ('translation','翻译','Translation'),
  ('commentary','注释','Commentary'), ('publication','出版或颁行','Publication'), ('foundation','建立','Foundation'),
  ('founding','创立','Founding'), ('dissolution','终止','Dissolution'), ('event_time','事件时间','Event time'),
  ('route_time','路线时间','Route time'), ('route_activity','路线活动','Route activity'), ('departure','出发','Departure'),
  ('return','归来','Return'), ('cult_emergence','崇奉出现','Cult emergence'), ('deification','神格化','Deification'),
  ('textual_attestation','文献见证','Textual attestation'), ('traditional_occurrence','传统发生时间','Traditional occurrence'),
  ('object_creation','对象制作','Object creation'), ('object_discovery','对象发现','Object discovery'),
  ('object_collection','对象入藏','Object collection'), ('object_date','对象年代','Object date'),
  ('construction','营造','Construction'), ('policy','政策','Policy'), ('conflict_begins','冲突开始','Conflict begins'),
  ('conflict_ends','冲突结束','Conflict ends'), ('dynastic_transition','王朝转型','Dynastic transition'),
  ('period_boundary','时期边界','Period boundary'), ('site_activity','地点活动','Site activity'),
  ('analytic_scope','分析范围','Analytic scope'), ('analytic_period','分析时期','Analytic period'),
  ('cultural_landscape','文化地景','Cultural landscape'), ('circulation_scope','流通范围','Circulation scope'),
  ('composition_context','成书语境','Composition context'), ('geographic_and_religious_scope','地理与宗教范围','Geographic and religious scope'),
  ('institutional_activity','机构活动','Institutional activity'), ('institutional_and_memory_scope','制度与记忆范围','Institutional and memory scope'),
  ('institutional_circulation','制度流通','Institutional circulation'), ('institutional_scope','机构范围','Institutional scope'),
  ('pilgrimage_and_learning_scope','求法与学习范围','Pilgrimage and learning scope'), ('regional_exchange','区域交流','Regional exchange'),
  ('research_scope','研究范围','Research scope'), ('textual_circulation','文本流通','Textual circulation'), ('version_scope','版本范围','Version scope');

CREATE TABLE museum.temporal_assertions (
  id uuid PRIMARY KEY,
  entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  predicate text NOT NULL REFERENCES museum.temporal_predicate_registry(predicate),
  time_type text NOT NULL CHECK (time_type IN ('exact', 'range', 'circa', 'century', 'relative_sequence', 'traditional_date', 'atemporal')),
  historical_start_year integer CHECK (historical_start_year IS NULL OR historical_start_year <> 0),
  historical_end_year integer CHECK (historical_end_year IS NULL OR historical_end_year <> 0),
  calendar_system text NOT NULL DEFAULT 'gregorian_proleptic' CHECK (calendar_system IN ('gregorian_proleptic', 'julian', 'chinese_regnal', 'buddhist_traditional', 'narrative', 'atemporal', 'unknown')),
  display_date_zh text NOT NULL,
  display_date_en text NOT NULL,
  traditional_time_label text,
  sequence_order integer,
  confidence museum.confidence NOT NULL,
  evidence_layer museum.evidence_layer NOT NULL,
  source_id uuid NOT NULL REFERENCES museum.sources(id),
  note text,
  CHECK (historical_start_year IS NULL OR historical_end_year IS NULL OR historical_end_year >= historical_start_year),
  CHECK (time_type <> 'atemporal' OR (historical_start_year IS NULL AND historical_end_year IS NULL)),
  CHECK (time_type <> 'relative_sequence' OR sequence_order IS NOT NULL)
);

CREATE TABLE museum.relation_type_registry (
  relation_type text PRIMARY KEY,
  inverse_relation_type text,
  source_kind_allowlist text[] NOT NULL,
  target_kind_allowlist text[] NOT NULL,
  default_directionality text NOT NULL CHECK (default_directionality IN ('directed', 'bidirectional')),
  graph_categories text[] NOT NULL DEFAULT '{}',
  is_symmetric boolean NOT NULL DEFAULT false,
  requires_time boolean NOT NULL DEFAULT false,
  requires_source boolean NOT NULL DEFAULT true
);

INSERT INTO museum.relation_type_registry
  (relation_type, inverse_relation_type, source_kind_allowlist, target_kind_allowlist, default_directionality, graph_categories, is_symmetric, requires_time, requires_source)
VALUES
  ('located_in', NULL, ARRAY['institution','place','museum_object'], ARRAY['place'], 'directed', ARRAY['three-traditions'], false, false, true),
  ('active_in', NULL, ARRAY['figure'], ARRAY['place','institution'], 'directed', ARRAY['figure-influence','three-traditions'], false, false, true),
  ('travelled_through', NULL, ARRAY['figure'], ARRAY['place'], 'directed', ARRAY['figure-influence'], false, true, true),
  ('translated_or_transmitted', NULL, ARRAY['figure','institution'], ARRAY['text','text_version'], 'directed', ARRAY['text-lineage'], false, false, true),
  ('has_version', NULL, ARRAY['text'], ARRAY['text_version'], 'directed', ARRAY['text-lineage'], false, false, true),
  ('passage_of', NULL, ARRAY['passage'], ARRAY['text'], 'directed', ARRAY['text-lineage'], false, false, true),
  ('quoted_from_version', NULL, ARRAY['passage'], ARRAY['text_version'], 'directed', ARRAY['text-lineage'], false, false, true),
  ('commented_on', NULL, ARRAY['figure','text'], ARRAY['text'], 'directed', ARRAY['text-lineage','figure-influence'], false, false, true),
  ('institutional_context', NULL, ARRAY['figure','text','institution'], ARRAY['institution'], 'directed', ARRAY['three-traditions'], false, false, true),
  ('influenced', NULL, ARRAY['figure','text','concept','school'], ARRAY['figure','text','concept','school'], 'directed', ARRAY['figure-influence','concept-evolution','school-lineage'], false, true, true),
  ('contemporary_with', 'contemporary_with', ARRAY['figure','event','institution'], ARRAY['figure','event','institution'], 'bidirectional', ARRAY['figure-influence'], true, true, true),
  ('represented_by', NULL, ARRAY['text','concept','institution','event'], ARRAY['museum_object'], 'directed', ARRAY['three-traditions'], false, false, true),
  ('route_connects', 'route_connects', ARRAY['place','route'], ARRAY['place'], 'bidirectional', ARRAY['three-traditions'], true, true, true),
  ('comparative_parallel', 'comparative_parallel', ARRAY['text','concept','practice'], ARRAY['text','concept','practice'], 'bidirectional', ARRAY['concept-evolution','three-traditions'], true, false, true);

CREATE TABLE museum.entity_relations (
  id uuid PRIMARY KEY,
  canonical_key text NOT NULL UNIQUE,
  source_entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  target_entity_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  relation_type text NOT NULL REFERENCES museum.relation_type_registry(relation_type),
  directionality text NOT NULL CHECK (directionality IN ('directed', 'bidirectional')),
  start_year integer CHECK (start_year IS NULL OR start_year <> 0),
  end_year integer CHECK (end_year IS NULL OR end_year <> 0),
  evidence_layer museum.evidence_layer NOT NULL,
  confidence museum.confidence NOT NULL,
  weight numeric(4,3) NOT NULL DEFAULT 0.5 CHECK (weight BETWEEN 0 AND 1),
  publication_state museum.publication_state NOT NULL DEFAULT 'preview',
  review_status museum.review_status NOT NULL DEFAULT 'bilingual_reviewed',
  context_zh text NOT NULL,
  context_en text NOT NULL,
  qualifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (source_entity_id <> target_entity_id),
  CHECK (start_year IS NULL OR end_year IS NULL OR end_year >= start_year),
  CHECK (publication_state <> 'public' OR review_status = 'publishable')
);

CREATE TABLE museum.relation_sources (
  relation_id uuid NOT NULL REFERENCES museum.entity_relations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES museum.sources(id),
  source_locator_id uuid REFERENCES museum.source_locators(id),
  PRIMARY KEY (relation_id, source_id)
);

COMMIT;
