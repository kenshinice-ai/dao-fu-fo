BEGIN;

CREATE INDEX entities_publication_idx ON museum.entities (publication_state, review_status, kind);
CREATE INDEX entities_slug_trgm_idx ON museum.entities USING gin (slug gin_trgm_ops);
CREATE INDEX entity_translations_title_trgm_idx ON museum.entity_translations USING gin (title gin_trgm_ops);
CREATE INDEX temporal_assertions_entity_idx ON museum.temporal_assertions (entity_id, predicate);
CREATE INDEX temporal_assertions_year_idx ON museum.temporal_assertions (historical_start_year, historical_end_year);
CREATE INDEX entity_relations_source_idx ON museum.entity_relations (source_entity_id, relation_type);
CREATE INDEX entity_relations_target_idx ON museum.entity_relations (target_entity_id, relation_type);
CREATE INDEX review_checks_subject_idx ON museum.review_checks (subject_kind, subject_id, check_kind);

CREATE VIEW museum.public_entities AS
SELECT * FROM museum.entities
WHERE publication_state = 'public' AND review_status = 'publishable';

CREATE VIEW museum.public_relations AS
SELECT relation.*
FROM museum.entity_relations relation
JOIN museum.public_entities source_entity ON source_entity.id = relation.source_entity_id
JOIN museum.public_entities target_entity ON target_entity.id = relation.target_entity_id
WHERE relation.publication_state = 'public' AND relation.review_status = 'publishable';

COMMIT;
