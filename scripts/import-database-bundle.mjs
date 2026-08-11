import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseImportBundleSchema } from "@drf-museum/domain-schema";

const apply = process.argv.includes("--apply");
const printSql = process.argv.includes("--print-sql");
const bundlePath = resolve(".artifacts/database/import-v1.json");
const bundleBytes = await readFile(bundlePath);
const bundleChecksum = createHash("sha256").update(bundleBytes).digest("hex");
const bundle = DatabaseImportBundleSchema.parse(JSON.parse(bundleBytes.toString("utf8")));
const expectedMigrationCount = (await readdir(resolve("database/migrations"))).filter((file) => /^\d{3}_.+\.sql$/.test(file)).length;

function uuidBytes(value) {
  return Buffer.from(value.replaceAll("-", ""), "hex");
}

function uuidV5(namespace, name) {
  const hash = createHash("sha1").update(Buffer.concat([uuidBytes(namespace), Buffer.from(name, "utf8")])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function literal(value) {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

const raw = (sql) => ({ sql });
const json = (value) => raw(`${literal(JSON.stringify(value))}::jsonb`);
const sqlValue = (value) => value?.sql ?? literal(value);

function upsert(table, values, conflictColumns, immutableColumns = []) {
  const columns = Object.keys(values);
  const updates = columns.filter((column) => !conflictColumns.includes(column) && !immutableColumns.includes(column));
  const conflict = conflictColumns.join(", ");
  const action = updates.length
    ? `DO UPDATE SET ${updates.map((column) => `${column} = EXCLUDED.${column}`).join(", ")}`
    : "DO NOTHING";
  return `INSERT INTO museum.${table} (${columns.join(", ")}) VALUES (${columns.map((column) => sqlValue(values[column])).join(", ")}) ON CONFLICT (${conflict}) ${action};`;
}

const entityById = new Map(bundle.entities.map((entity) => [entity.id, entity]));
const entityIdByKey = new Map(bundle.entities.map((entity) => [`${entity.kind}:${entity.slug}`, entity.id]));
const sourceById = new Map(bundle.sources.map((source) => [source.id, source]));
const sourceIdByKey = new Map(bundle.sources.map((source) => [source.canonicalKey, source.id]));
const relationByKey = new Map(bundle.relations.map((relation) => [relation.canonicalKey, relation]));
const audioIdByKey = new Map(bundle.audio.map((audio) => [audio.id, uuidV5(bundle.idNamespace, audio.id)]));

function entityId(kind, slug) {
  const id = entityIdByKey.get(`${kind}:${slug}`);
  if (!id) throw new Error(`Missing database entity ${kind}:${slug}`);
  return id;
}

function sourceId(canonicalKey) {
  const id = sourceIdByKey.get(canonicalKey);
  if (!id) throw new Error(`Missing database source ${canonicalKey}`);
  return id;
}

const statements = ["BEGIN;", "SET CONSTRAINTS ALL IMMEDIATE;"];

for (const source of bundle.sources) statements.push(upsert("sources", {
  id: source.id,
  canonical_key: source.canonicalKey,
  source_type: source.sourceType,
  evidence_grade: source.evidenceGrade,
  title_original: source.titleOriginal,
  title_zh: source.titleZh,
  title_en: source.titleEn,
  url: source.url,
  rights_status: source.rightsStatus,
  citation_zh: source.citationZh,
  citation_en: source.citationEn,
  locator_level: source.locatorLevel,
  citation_status: source.citationStatus,
}, ["id"]));

for (const entity of bundle.entities) statements.push(upsert("entities", {
  id: entity.id,
  kind: entity.kind,
  slug: entity.slug,
  default_locale: "zh-CN",
  publication_state: entity.publicationState,
  review_status: entity.reviewStatus,
  primary_evidence_layer: entity.primaryEvidenceLayer,
  importance: entity.importance,
  is_featured: entity.isFeatured,
  content_version: entity.contentVersion,
}, ["id"], ["created_at"]));

for (const translation of bundle.translations) statements.push(upsert("entity_translations", {
  entity_id: translation.entityId,
  locale: translation.locale,
  title: translation.title,
  subtitle: translation.subtitle,
  short_summary: translation.shortSummary,
  curatorial_description: translation.curatorialDescription,
  research_note: translation.researchNote,
  time_label: translation.timeLabel,
  key_facts: json(translation.keyFacts),
  quote: translation.quote ? json(translation.quote) : null,
}, ["entity_id", "locale"]));

const traditionColors = { daoism: "tradition-daoism", confucianism: "tradition-confucianism", buddhism: "tradition-buddhism" };
for (const profile of bundle.profiles) {
  const entity = entityById.get(profile.entityId);
  if (!entity) throw new Error(`Profile references missing entity ${profile.entityId}`);
  const value = profile.value;
  switch (profile.kind) {
    case "tradition":
      statements.push(upsert("tradition_profiles", {
        entity_id: profile.entityId, tradition_level: value.traditionLevel, tradition_kind: value.traditionKind,
        color_token: traditionColors[entity.slug], sort_order: value.sortOrder,
      }, ["entity_id"]));
      break;
    case "figure":
      statements.push(upsert("figure_profiles", {
        entity_id: profile.entityId, historicity: value.historicity, gender: value.gender,
        figure_class: value.figureClass,
        canonical_name_original: value.canonicalNameOriginal, name_language_code: value.nameLanguageCode,
      }, ["entity_id"]));
      break;
    case "text":
      statements.push(upsert("text_profiles", {
        entity_id: profile.entityId, text_kind: value.textKind, original_language_code: value.originalLanguageCode,
        canonical_status: value.canonicalStatus, attribution_status: value.attributionStatus,
      }, ["entity_id"]));
      break;
    case "text_version":
      statements.push(upsert("text_version_profiles", {
        entity_id: profile.entityId, text_id: entityId("text", value.textSlug), version_kind: value.versionKind,
        language_code: value.languageCode, citation_label: value.citationLabel, rights_status: value.rightsStatus,
      }, ["entity_id"]));
      break;
    case "passage":
      statements.push(upsert("passage_profiles", {
        entity_id: profile.entityId, text_id: entityId("text", value.textSlug), text_version_id: entityId("text_version", value.textVersionSlug),
        passage_kind: value.passageKind, locator_original: value.locatorOriginal, locator_normalised: value.locatorNormalised,
        original_text: value.originalText, punctuated_text: value.punctuatedText, modern_zh: value.modernZh,
        translation_en: value.translationEn, ritual_sensitivity: value.ritualSensitivity, attribution_status: value.attributionStatus,
        rights_status: "unknown", variant_readings: json(value.variantReadings),
      }, ["entity_id"]));
      break;
    case "concept":
      statements.push(upsert("concept_profiles", {
        entity_id: profile.entityId, concept_kind: value.conceptKind,
        terminology_note_zh: value.terminologyNote?.["zh-CN"], terminology_note_en: value.terminologyNote?.en,
      }, ["entity_id"]));
      break;
    case "institution":
      statements.push(upsert("institution_profiles", {
        entity_id: profile.entityId, institution_kind: value.institutionKind,
        physical_place_id: value.physicalPlaceSlug ? entityId("place", value.physicalPlaceSlug) : null,
        network_scope: value.networkScope,
      }, ["entity_id"]));
      break;
    case "place": {
      const geometry = value.coordinates
        ? raw(`ST_SetSRID(ST_MakePoint(${literal(value.coordinates[0])}, ${literal(value.coordinates[1])}), 4326)`)
        : null;
      statements.push(upsert("place_profiles", {
        entity_id: profile.entityId, place_reality: value.placeReality, geometry_type: value.geometryType,
        geom: geometry, coordinate_confidence: value.coordinateConfidence, cosmos_zone: value.cosmosZone,
        canvas_x: value.canvasX, canvas_y: value.canvasY,
        location_note: value.geographicSourceId ? `geographic source: ${value.geographicSourceId}` : undefined,
      }, ["entity_id"]));
      break;
    }
    case "event":
      statements.push(upsert("event_profiles", {
        entity_id: profile.entityId, event_kind: value.eventKind, historicity: value.historicity,
        sequence_order: value.sequenceOrder, event_scope: value.eventScope,
      }, ["entity_id"]));
      break;
    case "route": {
      statements.push(upsert("route_profiles", {
        entity_id: profile.entityId, route_kind: value.routeKind, certainty: value.certainty,
        corridor_note: value.corridorNote["zh-CN"], animation_allowed: value.animationAllowed,
      }, ["entity_id"]));
      const waypointConfidence = value.certainty === "documented" ? "high" : value.certainty === "reconstructed" ? "medium" : "low";
      value.waypointSlugs.forEach((slug, position) => statements.push(upsert("route_waypoints", {
        route_id: profile.entityId, position, place_id: entityId("place", slug), certainty: waypointConfidence,
      }, ["route_id", "position"])));
      break;
    }
    case "museum_object":
      statements.push(upsert("museum_object_profiles", {
        entity_id: profile.entityId, object_kind: value.objectType, attribution_status: "unknown",
        current_repository: value.currentRepository, repository_object_id: value.repositoryObjectId,
        rights_status: value.rightsStatus, crop_policy: "unknown", colour_edit_policy: "unknown",
        collection_status: value.collectionStatus,
      }, ["entity_id"]));
      break;
    default:
      throw new Error(`Unsupported database profile kind: ${profile.kind}`);
  }
}

for (const link of bundle.entitySources) statements.push(upsert("entity_sources", {
  entity_id: link.entityId, source_id: link.sourceId, support_role: link.supportRole,
  claim_summary: link.claimSummary, is_primary: link.isPrimary,
}, ["entity_id", "source_id", "support_role"]));

for (const assignment of bundle.entityTraditions) statements.push(upsert("entity_traditions", {
  entity_id: assignment.entityId, tradition_id: assignment.traditionId, role: assignment.role,
  is_primary: assignment.isPrimary, confidence: assignment.confidence, evidence_layer: assignment.evidenceLayer,
  source_id: assignment.sourceId, note: assignment.note ? json(assignment.note) : null,
}, ["entity_id", "tradition_id", "role"]));

for (const assertion of bundle.temporalAssertions) statements.push(upsert("temporal_assertions", {
  id: assertion.id, entity_id: assertion.entityId, predicate: assertion.predicate, time_type: assertion.timeType,
  historical_start_year: assertion.startYear, historical_end_year: assertion.endYear,
  display_date_zh: assertion.displayDate["zh-CN"], display_date_en: assertion.displayDate.en,
  confidence: assertion.confidence, evidence_layer: assertion.evidenceLayer, source_id: assertion.sourceId,
}, ["id"]));

for (const relation of bundle.relations) {
  const starts = relation.temporalAssertions.map((item) => item.startYear).filter((value) => value !== undefined);
  const ends = relation.temporalAssertions.map((item) => item.endYear ?? item.startYear).filter((value) => value !== undefined);
  statements.push(upsert("entity_relations", {
    id: relation.id, canonical_key: relation.canonicalKey, source_entity_id: relation.sourceEntityId,
    target_entity_id: relation.targetEntityId, relation_type: relation.relationType,
    directionality: raw(`(SELECT default_directionality FROM museum.relation_type_registry WHERE relation_type = ${literal(relation.relationType)})`),
    start_year: starts.length ? Math.min(...starts) : undefined, end_year: ends.length ? Math.max(...ends) : undefined,
    evidence_layer: relation.evidenceLayer, confidence: relation.confidence, publication_state: relation.publicationState,
    review_status: relation.reviewStatus, context_zh: relation.summary["zh-CN"], context_en: relation.summary.en,
    qualifiers: json({ ...relation.qualifiers, label: relation.label, temporalAssertions: relation.temporalAssertions }),
  }, ["id"]));
  for (const relationSourceId of relation.sourceIds) statements.push(upsert("relation_sources", {
    relation_id: relation.id, source_id: relationSourceId,
  }, ["relation_id", "source_id"]));
}

for (const audio of bundle.audio) {
  const id = audioIdByKey.get(audio.id);
  statements.push(upsert("audio_scripts", {
    id, canonical_key: audio.id, title_zh: audio.title["zh-CN"], title_en: audio.title.en,
    description_zh: audio.description["zh-CN"], description_en: audio.description.en,
    transcript_zh: audio.transcript["zh-CN"], transcript_en: audio.transcript.en,
    duration_seconds: audio.durationSeconds, asset_status: audio.assetStatus, publication_state: audio.publicationState,
    review_status: audio.reviewStatus, rights_status: audio.rightsStatus, content_version: bundle.contentVersion,
  }, ["id"]));
  for (const key of audio.sourceIds) statements.push(upsert("audio_script_sources", {
    audio_script_id: id, source_id: sourceId(key),
  }, ["audio_script_id", "source_id"]));
}

for (const review of bundle.reviews) {
  let subjectId;
  if (review.subjectKind === "entity") subjectId = entityIdByKey.get(review.subjectKey);
  else if (review.subjectKind === "relation") subjectId = relationByKey.get(review.subjectKey)?.id;
  else subjectId = audioIdByKey.get(review.subjectKey);
  if (!subjectId) throw new Error(`Review has unknown subject ${review.subjectKind}:${review.subjectKey}`);
  statements.push(upsert("review_checks", {
    id: uuidV5(bundle.idNamespace, review.id), subject_kind: review.subjectKind, subject_id: subjectId,
    check_kind: review.checkKind, locale: review.locale, status: review.status, reviewer: review.reviewer,
    reviewed_at: review.reviewedAt, note: review.note,
  }, ["id"]));
}

for (const candidate of bundle.releaseCandidates) statements.push(upsert("release_candidates", {
  id: candidate.id,
  canonical_key: candidate.canonicalKey,
  content_version: candidate.contentVersion,
  target_release_stage: candidate.targetReleaseStage,
  status: candidate.status,
  title_zh: candidate.titleZh,
  title_en: candidate.titleEn,
  scope_zh: candidate.scopeZh,
  scope_en: candidate.scopeEn,
  selection_checksum_sha256: candidate.selectionChecksumSha256,
}, ["id"], ["created_at"]));

for (const subject of bundle.releaseCandidateSubjects) statements.push(upsert("release_candidate_subjects", {
  release_candidate_id: subject.releaseCandidateId,
  subject_kind: subject.subjectKind,
  subject_id: subject.subjectId,
  role: subject.role,
  sort_order: subject.sortOrder,
}, ["release_candidate_id", "subject_kind", "subject_id"]));

for (const promotion of bundle.promotions) statements.push(upsert("content_promotions", {
  id: promotion.id,
  release_candidate_id: promotion.releaseCandidateId,
  promoted_by: promotion.promotedBy,
  promoted_at: promotion.promotedAt,
  source_checksum_sha256: promotion.sourceChecksumSha256,
  artifact_checksum_sha256: promotion.artifactChecksumSha256,
  target_visibility: promotion.targetVisibility,
  notes: promotion.note,
}, ["id"]));

const buildId = uuidV5(bundle.idNamespace, `database-build:${bundle.contentVersion}:${bundleChecksum}`);
statements.push(upsert("content_build_history", {
  id: buildId, content_version: bundle.contentVersion, visibility: "preview",
  source_checksum_sha256: bundleChecksum, artifact_checksum_sha256: bundleChecksum,
  completed_at: raw("CURRENT_TIMESTAMP"), status: "succeeded",
}, ["id"], ["started_at", "completed_at"]));
statements.push("COMMIT;");

const sql = `${statements.join("\n")}\n`;
const sqlChecksum = createHash("sha256").update(sql).digest("hex");
if (printSql) process.stdout.write(sql);

const summary = {
  contentVersion: bundle.contentVersion,
  bundleChecksum,
  sqlChecksum,
  statements: statements.length,
  sources: bundle.sources.length,
  entities: bundle.entities.length,
  translations: bundle.translations.length,
  profiles: bundle.profiles.length,
  entitySources: bundle.entitySources.length,
  entityTraditions: bundle.entityTraditions.length,
  temporalAssertions: bundle.temporalAssertions.length,
  relations: bundle.relations.length,
  reviews: bundle.reviews.length,
  audioScripts: bundle.audio.length,
  releaseCandidates: bundle.releaseCandidates.length,
  releaseCandidateSubjects: bundle.releaseCandidateSubjects.length,
  promotions: bundle.promotions.length,
};

if (!apply) {
  console.log(`Database import plan verified: ${JSON.stringify(summary)}`);
  process.exit(0);
}

function psql(args, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("psql", ["-X", "--set", "ON_ERROR_STOP=1", ...args], { env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise(stdout.trim()) : reject(new Error(stderr.trim() || `psql exited with code ${code}`)));
    child.stdin.end(input);
  });
}

const appliedMigrationCount = Number(await psql(["--tuples-only", "--no-align", "--command", "SELECT count(*) FROM museum.migration_history;"], ""));
if (appliedMigrationCount < expectedMigrationCount) throw new Error(`Database has ${appliedMigrationCount} migrations; apply all ${expectedMigrationCount} before importing`);
await psql(["--file", "-"], sql);
console.log(`Database import applied: ${JSON.stringify(summary)}`);
