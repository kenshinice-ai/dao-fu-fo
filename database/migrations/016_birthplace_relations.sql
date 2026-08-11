BEGIN;

INSERT INTO museum.relation_type_registry
  (relation_type, inverse_relation_type, source_kind_allowlist, target_kind_allowlist, default_directionality, graph_categories, is_symmetric, requires_time, requires_source)
VALUES
  ('born_in', NULL, ARRAY['figure'], ARRAY['place'], 'directed', ARRAY['historical-timeline','figure-influence'], false, true, true);

COMMIT;
