import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), "database/migrations");
const expected = [
  "001_platform_extensions.sql", "002_entity_registry_and_i18n.sql", "003_sources_reviews_and_revisions.sql",
  "004_traditions_time_and_relations.sql", "005_places_postgis_and_cosmos.sql", "006_figures_texts_versions_passages.sql",
  "007_concepts_schools_institutions_practices.sql", "008_events_routes_and_objects.sql",
  "009_exhibitions_media_and_audio.sql", "010_read_model_indexes.sql", "011_source_quality_and_import_contract.sql",
  "012_audio_scripts_and_pending_reviews.sql", "013_public_release_candidates.sql",
];
const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
if (JSON.stringify(files) !== JSON.stringify(expected)) throw new Error(`Migration order mismatch: ${files.join(", ")}`);

const joined = (await Promise.all(files.map((file) => readFile(path.join(directory, file), "utf8")))).join("\n");
for (const token of ["CREATE EXTENSION IF NOT EXISTS postgis", "CREATE TABLE museum.entities", "CREATE TABLE museum.sources", "CREATE TABLE museum.temporal_assertions", "CREATE TABLE museum.entity_relations", "CREATE TABLE museum.place_profiles", "CREATE TABLE museum.passage_profiles", "CREATE TABLE museum.museum_object_profiles", "CREATE TABLE museum.media_assets", "CREATE TABLE museum.audio_scripts", "CREATE TABLE museum.release_candidates", "CREATE TABLE museum.content_promotions", "CREATE VIEW museum.public_entities", "ADD COLUMN locator_level", "ADD COLUMN citation_status", "ADD COLUMN collection_status"]) {
  if (!joined.includes(token)) throw new Error(`Missing migration contract token: ${token}`);
}
if (/\b(?:DROP\s+(?:TABLE|SCHEMA|TYPE)|TRUNCATE)\b/i.test(joined)) throw new Error("Forward-only migrations may not drop tables, schemas or types, or truncate data");
for (const file of files) {
  const sql = await readFile(path.join(directory, file), "utf8");
  if (!sql.trimStart().startsWith("BEGIN;") || !sql.trimEnd().endsWith("COMMIT;")) throw new Error(`${file} must be transaction-wrapped`);
}

console.log(`Migration contract verified: ${files.length} forward-only files`);
