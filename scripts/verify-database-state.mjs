import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseImportBundleSchema } from "@drf-museum/domain-schema";

const bundleBytes = await readFile(resolve(".artifacts/database/import-v1.json"));
const bundle = DatabaseImportBundleSchema.parse(JSON.parse(bundleBytes.toString("utf8")));
const bundleChecksum = createHash("sha256").update(bundleBytes).digest("hex");
const migrationCount = (await readdir(resolve("database/migrations"))).filter((file) => /^\d{3}_.+\.sql$/.test(file)).length;

function psql(sql) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("psql", ["-X", "--set", "ON_ERROR_STOP=1", "--tuples-only", "--no-align", "--command", sql], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise(stdout.trim()) : reject(new Error(stderr.trim() || `psql exited with code ${code}`)));
  });
}

const countTables = {
  migrations: "migration_history",
  sources: "sources",
  entities: "entities",
  translations: "entity_translations",
  entitySources: "entity_sources",
  entityTraditions: "entity_traditions",
  temporalAssertions: "temporal_assertions",
  relations: "entity_relations",
  relationSources: "relation_sources",
  traditions: "tradition_profiles",
  figures: "figure_profiles",
  texts: "text_profiles",
  textVersions: "text_version_profiles",
  passages: "passage_profiles",
  concepts: "concept_profiles",
  institutions: "institution_profiles",
  places: "place_profiles",
  events: "event_profiles",
  routes: "route_profiles",
  routeWaypoints: "route_waypoints",
  museumObjects: "museum_object_profiles",
  audioScripts: "audio_scripts",
  audioScriptSources: "audio_script_sources",
  reviews: "review_checks",
  builds: "content_build_history",
  publicEntities: "public_entities",
  publicRelations: "public_relations",
};

const countPairs = await Promise.all(Object.entries(countTables).map(async ([key, table]) => [key, Number(await psql(`SELECT count(*) FROM museum.${table};`))]));
const counts = Object.fromEntries(countPairs);

const kindCounts = Object.fromEntries(bundle.entities.reduce((map, entity) => map.set(entity.kind, (map.get(entity.kind) ?? 0) + 1), new Map()));
const expected = {
  migrations: migrationCount,
  sources: bundle.sources.length,
  entities: bundle.entities.length,
  translations: bundle.translations.length,
  entitySources: bundle.entitySources.length,
  entityTraditions: bundle.entityTraditions.length,
  temporalAssertions: bundle.temporalAssertions.length,
  relations: bundle.relations.length,
  relationSources: bundle.relations.reduce((sum, relation) => sum + relation.sourceIds.length, 0),
  traditions: kindCounts.tradition ?? 0,
  figures: kindCounts.figure ?? 0,
  texts: kindCounts.text ?? 0,
  textVersions: kindCounts.text_version ?? 0,
  passages: kindCounts.passage ?? 0,
  concepts: kindCounts.concept ?? 0,
  institutions: kindCounts.institution ?? 0,
  places: kindCounts.place ?? 0,
  events: kindCounts.event ?? 0,
  routes: kindCounts.route ?? 0,
  routeWaypoints: bundle.profiles.filter((profile) => profile.kind === "route").reduce((sum, profile) => sum + profile.value.waypointSlugs.length, 0),
  museumObjects: kindCounts.museum_object ?? 0,
  audioScripts: bundle.audio.length,
  audioScriptSources: bundle.audio.reduce((sum, audio) => sum + audio.sourceIds.length, 0),
  reviews: bundle.reviews.length,
  builds: 1,
  publicEntities: bundle.entities.filter((entity) => entity.publicationState === "public" && entity.reviewStatus === "publishable").length,
  publicRelations: bundle.relations.filter((relation) => relation.publicationState === "public" && relation.reviewStatus === "publishable").length,
};

for (const [key, value] of Object.entries(expected)) {
  if (counts[key] !== value) throw new Error(`Database count mismatch for ${key}: expected ${value}, found ${counts[key]}`);
}

const expectedEntityIdentity = bundle.entities.map((entity) => `${entity.kind}:${entity.slug}:${entity.id}`).sort();
const actualEntityIdentity = JSON.parse(await psql("SELECT coalesce(json_agg(kind || ':' || slug || ':' || id ORDER BY kind, slug), '[]'::json)::text FROM museum.entities;"));
if (JSON.stringify(actualEntityIdentity) !== JSON.stringify(expectedEntityIdentity)) throw new Error("Database entity identities differ from import bundle");

const expectedSourceIdentity = bundle.sources.map((source) => `${source.canonicalKey}:${source.id}`).sort();
const actualSourceIdentity = JSON.parse(await psql("SELECT coalesce(json_agg(canonical_key || ':' || id ORDER BY canonical_key), '[]'::json)::text FROM museum.sources;"));
if (JSON.stringify(actualSourceIdentity) !== JSON.stringify(expectedSourceIdentity)) throw new Error("Database source identities differ from import bundle");

const expectedRelationIdentity = bundle.relations.map((relation) => `${relation.canonicalKey}:${relation.id}`).sort();
const actualRelationIdentity = JSON.parse(await psql("SELECT coalesce(json_agg(canonical_key || ':' || id ORDER BY canonical_key), '[]'::json)::text FROM museum.entity_relations;"));
if (JSON.stringify(actualRelationIdentity) !== JSON.stringify(expectedRelationIdentity)) throw new Error("Database relation identities differ from import bundle");

const placeGeometryCount = Number(await psql("SELECT count(*) FROM museum.place_profiles WHERE geom IS NOT NULL;"));
const expectedPlaceGeometryCount = bundle.profiles.filter((profile) => profile.kind === "place" && profile.value.coordinates).length;
if (placeGeometryCount !== expectedPlaceGeometryCount) throw new Error(`Expected ${expectedPlaceGeometryCount} place geometries, found ${placeGeometryCount}`);
const invalidSridCount = Number(await psql("SELECT count(*) FROM museum.place_profiles WHERE geom IS NOT NULL AND ST_SRID(geom) <> 4326;"));
if (invalidSridCount !== 0) throw new Error(`Found ${invalidSridCount} place geometries outside SRID 4326`);

const recordedChecksum = await psql(`SELECT source_checksum_sha256 FROM museum.content_build_history WHERE content_version = '${bundle.contentVersion.replaceAll("'", "''")}' AND visibility = 'preview';`);
if (recordedChecksum !== bundleChecksum) throw new Error("Database build history checksum differs from import bundle");

const fingerprintTables = [
  ["sources", ""], ["entities", " - 'created_at' - 'updated_at'"], ["entity_translations", ""], ["entity_sources", ""],
  ["entity_traditions", ""], ["temporal_assertions", ""], ["entity_relations", ""], ["relation_sources", ""],
  ["tradition_profiles", ""], ["figure_profiles", ""], ["text_profiles", ""], ["text_version_profiles", ""],
  ["passage_profiles", ""], ["concept_profiles", ""], ["institution_profiles", ""], ["place_profiles", ""],
  ["event_profiles", ""], ["route_profiles", ""], ["route_waypoints", ""], ["museum_object_profiles", ""],
  ["audio_scripts", ""], ["audio_script_sources", ""], ["review_checks", ""],
  ["content_build_history", " - 'started_at' - 'completed_at'"],
];
const fingerprintUnion = fingerprintTables.map(([table, subtraction]) => `SELECT ${`'${table}:'`} || (to_jsonb(t)${subtraction})::text AS value FROM museum.${table} t`).join(" UNION ALL ");
const fingerprint = await psql(`SELECT md5(coalesce(string_agg(value, E'\\n' ORDER BY value), '')) FROM (${fingerprintUnion}) rows;`);
const postgisVersion = await psql("SELECT postgis_version();");

console.log(JSON.stringify({ contentVersion: bundle.contentVersion, bundleChecksum, fingerprint, postgisVersion, counts }));
