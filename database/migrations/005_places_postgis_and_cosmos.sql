BEGIN;

CREATE TABLE museum.place_profiles (
  entity_id uuid PRIMARY KEY REFERENCES museum.entities(id) ON DELETE CASCADE,
  place_reality text NOT NULL CHECK (place_reality IN ('real_current', 'real_historical', 'approximate_region', 'legendary_uncertain', 'sacred_symbolic')),
  geometry_type text NOT NULL CHECK (geometry_type IN ('point', 'polygon', 'line', 'symbolic_node')),
  geom geometry(Geometry, 4326),
  coordinate_confidence text NOT NULL CHECK (coordinate_confidence IN ('exact', 'approximate', 'centroid', 'inferred', 'not_applicable')),
  modern_country_code text,
  preferred_zoom numeric,
  cosmos_zone text,
  canvas_x numeric,
  canvas_y numeric,
  parent_symbolic_place_id uuid REFERENCES museum.entities(id),
  location_note text,
  CHECK (place_reality <> 'sacred_symbolic' OR geom IS NULL),
  CHECK (place_reality <> 'sacred_symbolic' OR (geometry_type = 'symbolic_node' AND cosmos_zone IS NOT NULL AND canvas_x IS NOT NULL AND canvas_y IS NOT NULL)),
  CHECK (place_reality = 'sacred_symbolic' OR geometry_type <> 'symbolic_node'),
  CHECK (place_reality IN ('approximate_region', 'legendary_uncertain', 'sacred_symbolic') OR geom IS NOT NULL)
);

CREATE TABLE museum.place_names (
  id uuid PRIMARY KEY,
  place_id uuid NOT NULL REFERENCES museum.entities(id) ON DELETE CASCADE,
  locale text NOT NULL,
  name text NOT NULL,
  name_kind text NOT NULL CHECK (name_kind IN ('current', 'historical', 'alternative', 'transliteration', 'administrative')),
  valid_from_year integer CHECK (valid_from_year IS NULL OR valid_from_year <> 0),
  valid_to_year integer CHECK (valid_to_year IS NULL OR valid_to_year <> 0),
  historical_region text,
  is_preferred boolean NOT NULL DEFAULT false,
  source_id uuid NOT NULL REFERENCES museum.sources(id),
  CHECK (valid_from_year IS NULL OR valid_to_year IS NULL OR valid_to_year >= valid_from_year)
);

CREATE INDEX place_profiles_geom_gix ON museum.place_profiles USING gist (geom);

COMMIT;
