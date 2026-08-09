BEGIN;

CREATE TABLE museum.concept_profiles (entity_id uuid PRIMARY KEY REFERENCES museum.entities(id) ON DELETE CASCADE, concept_kind text NOT NULL DEFAULT 'other', terminology_note_zh text, terminology_note_en text);
CREATE TABLE museum.school_profiles (entity_id uuid PRIMARY KEY REFERENCES museum.entities(id) ON DELETE CASCADE, school_kind text NOT NULL, parent_school_id uuid REFERENCES museum.entities(id));
CREATE TABLE museum.institution_profiles (entity_id uuid PRIMARY KEY REFERENCES museum.entities(id) ON DELETE CASCADE, institution_kind text NOT NULL, physical_place_id uuid REFERENCES museum.entities(id), network_scope boolean NOT NULL DEFAULT false);
CREATE TABLE museum.practice_profiles (entity_id uuid PRIMARY KEY REFERENCES museum.entities(id) ON DELETE CASCADE, practice_kind text NOT NULL CHECK (practice_kind IN ('ethical','educational','contemplative','ritual','liturgical','cultivation','social','pilgrimage')), public_explanation_level text NOT NULL CHECK (public_explanation_level IN ('general','context_required','restricted')), safety_note text);

COMMIT;
