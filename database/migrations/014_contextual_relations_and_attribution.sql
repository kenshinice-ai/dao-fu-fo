BEGIN;

ALTER TABLE museum.figure_profiles
  ADD COLUMN figure_class text NOT NULL DEFAULT 'historical_person'
    CHECK (figure_class IN ('historical_person', 'traditional_sage', 'sacred_figure', 'mythic_persona'));

ALTER TABLE museum.passage_profiles
  ADD COLUMN attribution_status text NOT NULL DEFAULT 'anonymous_or_composite'
    CHECK (attribution_status IN ('direct_attestation', 'attributed_saying', 'recorded_by_others', 'later_literary_voice', 'anonymous_or_composite'));

INSERT INTO museum.relation_type_registry
  (relation_type, inverse_relation_type, source_kind_allowlist, target_kind_allowlist, default_directionality, graph_categories, is_symmetric, requires_time, requires_source)
VALUES
  ('participated_in', NULL, ARRAY['figure','institution'], ARRAY['event'], 'directed', ARRAY['figure-influence','historical-timeline'], false, true, true),
  ('occurred_at', NULL, ARRAY['event'], ARRAY['place','institution','route'], 'directed', ARRAY['historical-timeline','three-traditions'], false, true, true),
  ('attributed_to', NULL, ARRAY['passage','text'], ARRAY['figure','text'], 'directed', ARRAY['text-lineage','figure-influence'], false, false, true),
  ('received_by', NULL, ARRAY['figure','text','concept','tradition'], ARRAY['figure','institution','text','school','tradition','practice'], 'directed', ARRAY['later-reception','figure-influence','concept-evolution'], false, true, true),
  ('remembered_in', NULL, ARRAY['figure','event'], ARRAY['place','institution','practice','text'], 'directed', ARRAY['later-reception','three-traditions'], false, true, true),
  ('deified_as', NULL, ARRAY['figure'], ARRAY['figure','concept','tradition'], 'directed', ARRAY['later-reception','sacred-cosmos'], false, true, true);

COMMIT;
