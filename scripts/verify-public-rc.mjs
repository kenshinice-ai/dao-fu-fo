import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  AudioRecordSchema,
  EntityContentSchema,
  PassageProfileSchema,
  PublicReleaseCandidateSchema,
  RelationRecordSchema,
  SourceRecordSchema,
  TextVersionProfileSchema,
  InstitutionProfileSchema,
  RouteProfileSchema,
} from "@drf-museum/domain-schema";

const readyOnly = process.argv.includes("--ready");
const repoRoot = resolve(process.cwd());
const contentRoot = resolve(repoRoot, "content");
const outputPath = resolve(repoRoot, ".artifacts/content/public-rc-plan.json");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function listJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

function entityKey(entity) {
  return `${entity.kind}:${entity.slug}`;
}

function sourceIdsFor(entity) {
  return [...new Set([
    ...entity.sourceIds,
    ...entity.traditions.map((assignment) => assignment.sourceId),
    ...entity.temporalAssertions.map((assertion) => assertion.sourceId),
  ])];
}

function structuralDependencies(entity) {
  if (entity.kind === "text_version") {
    return [`text:${TextVersionProfileSchema.parse(entity.profile).textSlug}`];
  }
  if (entity.kind === "passage") {
    const profile = PassageProfileSchema.parse(entity.profile);
    return [`text:${profile.textSlug}`, `text_version:${profile.textVersionSlug}`];
  }
  if (entity.kind === "institution") {
    const slug = InstitutionProfileSchema.parse(entity.profile).physicalPlaceSlug;
    return slug ? [`place:${slug}`] : [];
  }
  if (entity.kind === "route") {
    return RouteProfileSchema.parse(entity.profile).waypointSlugs.map((slug) => `place:${slug}`);
  }
  return [];
}

function requiredChecks(entity) {
  const checks = ["schema", "fact", "bilingual", "rights", "accessibility", "editorial"];
  return entity.isFeatured || ["figure", "concept", "institution", "practice"].includes(entity.kind)
    ? [...checks, "tradition"]
    : checks;
}

function checkSummary(required, reviews) {
  const completed = [...new Set(reviews.filter((review) => ["passed", "waived"].includes(review.status)).map((review) => review.checkKind))];
  const failed = [...new Set(reviews.filter((review) => review.status === "failed").map((review) => review.checkKind))];
  const missing = required.filter((kind) => !completed.includes(kind));
  return { required, completed, failed, missing };
}

function verifiedClaimSource(source) {
  return source.id !== "source:editorial-method" &&
    source.evidenceGrade !== "D" &&
    ["edition", "item", "precise"].includes(source.locatorLevel) &&
    source.citationStatus === "verified";
}

function checksum(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const candidate = PublicReleaseCandidateSchema.parse(await readJson(resolve(contentRoot, "dao-ru-fo/public-rc.json")));
const profile = await readJson(resolve(contentRoot, "dao-ru-fo/profile.json"));
if (candidate.contentVersion !== profile.contentVersion) throw new Error(`Candidate targets ${candidate.contentVersion}, current content is ${profile.contentVersion}`);

const sources = SourceRecordSchema.array().parse(await readJson(resolve(contentRoot, "common/sources.json")));
const sourceMap = new Map(sources.map((source) => [source.id, source]));
const entities = [];
for (const path of await listJsonFiles(resolve(contentRoot, "dao-ru-fo/entities"))) {
  const raw = await readJson(path);
  for (const value of Array.isArray(raw) ? raw : [raw]) entities.push(EntityContentSchema.parse(value));
}
const entityMap = new Map(entities.map((entity) => [entityKey(entity), entity]));
const relations = RelationRecordSchema.array().parse(await readJson(resolve(contentRoot, "dao-ru-fo/relations.json")));
const relationMap = new Map(relations.map((relation) => [relation.id, relation]));
const audio = AudioRecordSchema.array().parse(await readJson(resolve(contentRoot, "dao-ru-fo/audio.json")));
const audioMap = new Map(audio.map((record) => [record.id, record]));
const reviews = JSON.parse(await readFile(resolve(contentRoot, "dao-ru-fo/reviews.json"), "utf8"));
for (const review of reviews) {
  if (!["passed", "waived"].includes(review.status)) continue;
  if (review.reviewer.startsWith("agent:") || review.reviewer.startsWith("role:")) {
    throw new Error(`Completed Public RC checks require an identified reviewer: ${review.id}`);
  }
  if (review.reviewer.startsWith("automated:") && (review.checkKind !== "schema" || review.status !== "passed")) {
    throw new Error(`Automated reviewers may only pass schema checks: ${review.id}`);
  }
}
const reviewsFor = (subjectKind, subjectKey) => reviews.filter((review) => review.subjectKind === subjectKind && review.subjectKey === subjectKey);

const selectedEntityKeys = [...candidate.coreEntities, ...candidate.dependencyEntities];
const selectedEntitySet = new Set(selectedEntityKeys);
const selectedRelationSet = new Set(candidate.relations);
const excludedRelationSet = new Set(candidate.excludedRelations.map((relation) => relation.id));
const blockers = [];
const warnings = [];
const spatialRelationTypes = new Set(["active_in", "travelled_through", "institutional_context", "located_in"]);

function addBlocker(subject, code, detail) {
  blockers.push({ subject, code, detail });
}

function hasSelectedSpatialAnchor(key) {
  return relations.some((relation) => {
    if (!selectedRelationSet.has(relation.id) || !spatialRelationTypes.has(relation.relationType)) return false;
    const source = `${relation.source.kind}:${relation.source.slug}`;
    const target = `${relation.target.kind}:${relation.target.slug}`;
    const other = source === key ? relation.target : target === key ? relation.source : null;
    return Boolean(other && ["place", "institution", "route"].includes(other.kind));
  });
}

for (const key of selectedEntityKeys) {
  const entity = entityMap.get(key);
  if (!entity) {
    addBlocker(key, "MISSING_SUBJECT", "Selected entity is not present in source content");
    continue;
  }
  for (const dependency of structuralDependencies(entity)) {
    if (!selectedEntitySet.has(dependency)) addBlocker(key, "MISSING_DEPENDENCY", `Requires ${dependency} in the same Public collection`);
  }
  if (["private", "withdrawn"].includes(entity.publicationState)) addBlocker(key, "INVALID_STATE", `publicationState=${entity.publicationState}`);
  const subjectReviews = checkSummary(requiredChecks(entity), reviewsFor("entity", key));
  if (subjectReviews.missing.length || subjectReviews.failed.length) {
    addBlocker(key, "REVIEW_CHECKS_INCOMPLETE", `missing=${subjectReviews.missing.join(",")}; failed=${subjectReviews.failed.join(",")}`);
  }
  const sourceIds = sourceIdsFor(entity);
  const linkedSources = sourceIds.map((id) => sourceMap.get(id)).filter(Boolean);
  if (linkedSources.length !== sourceIds.length) addBlocker(key, "MISSING_SOURCE", "One or more source IDs are not present");
  if (!linkedSources.some(verifiedClaimSource)) addBlocker(key, "NO_VERIFIED_LOCATOR", "Requires an edition, item or precise verified external source");
  if (linkedSources.some((source) => ["unknown", "restricted"].includes(source.rightsStatus))) addBlocker(key, "SOURCE_RIGHTS_BLOCKED", "A linked source has unknown or restricted rights");
  if (entity.kind === "figure" && !entity.temporalAssertions.length) addBlocker(key, "MISSING_TIME_ANCHOR", "Featured figures require at least one temporal assertion");
  if (entity.kind === "figure" && !hasSelectedSpatialAnchor(key)) addBlocker(key, "MISSING_SPATIAL_ANCHOR", "Featured figures require a selected relation to a place, institution or route");
  if (entity.profile.collectionStatus === "placeholder") addBlocker(key, "OBJECT_PLACEHOLDER", "Museum object collection record is still a placeholder");
  if (entity.reviewStatus !== "publishable") warnings.push({ subject: key, code: "PUBLISHABLE_STATE_PENDING", detail: `reviewStatus=${entity.reviewStatus}; promotion will set it only after all checks pass` });
}

for (const relationId of candidate.relations) {
  const relation = relationMap.get(relationId);
  if (!relation) {
    addBlocker(relationId, "MISSING_SUBJECT", "Selected relation is not present in source content");
    continue;
  }
  const source = `${relation.source.kind}:${relation.source.slug}`;
  const target = `${relation.target.kind}:${relation.target.slug}`;
  if (!selectedEntitySet.has(source) || !selectedEntitySet.has(target)) addBlocker(relationId, "MISSING_DEPENDENCY", "Both relation endpoints must be selected");
  const subjectReviews = checkSummary(["schema", "fact", "rights", "editorial"], reviewsFor("relation", relationId));
  if (subjectReviews.missing.length || subjectReviews.failed.length) addBlocker(relationId, "REVIEW_CHECKS_INCOMPLETE", `missing=${subjectReviews.missing.join(",")}; failed=${subjectReviews.failed.join(",")}`);
  const sourceIds = [...new Set([...relation.sourceIds, ...relation.temporalAssertions.map((assertion) => assertion.sourceId)])];
  const linkedSources = sourceIds.map((id) => sourceMap.get(id)).filter(Boolean);
  if (!linkedSources.some(verifiedClaimSource)) addBlocker(relationId, "NO_VERIFIED_LOCATOR", "Requires a verified external relation source");
  if (linkedSources.some((source) => ["unknown", "restricted"].includes(source.rightsStatus))) addBlocker(relationId, "SOURCE_RIGHTS_BLOCKED", "A linked relation source has unknown or restricted rights");
  if (relation.reviewStatus !== "publishable") warnings.push({ subject: relationId, code: "PUBLISHABLE_STATE_PENDING", detail: `reviewStatus=${relation.reviewStatus}` });
}

for (const audioId of candidate.audio) {
  const record = audioMap.get(audioId);
  if (!record) {
    addBlocker(audioId, "MISSING_SUBJECT", "Selected audio is not present in source content");
    continue;
  }
  const subjectReviews = checkSummary(["schema", "bilingual", "rights", "accessibility", "editorial"], reviewsFor("audio", audioId));
  if (subjectReviews.missing.length || subjectReviews.failed.length) addBlocker(audioId, "REVIEW_CHECKS_INCOMPLETE", `missing=${subjectReviews.missing.join(",")}; failed=${subjectReviews.failed.join(",")}`);
  if (!["ready", "published"].includes(record.assetStatus)) addBlocker(audioId, "AUDIO_ASSET_NOT_READY", `assetStatus=${record.assetStatus}`);
  if (["unknown", "restricted"].includes(record.rightsStatus)) addBlocker(audioId, "AUDIO_RIGHTS_BLOCKED", `rightsStatus=${record.rightsStatus}`);
}

for (const relation of relations) {
  const source = `${relation.source.kind}:${relation.source.slug}`;
  const target = `${relation.target.kind}:${relation.target.slug}`;
  if (selectedEntitySet.has(source) && selectedEntitySet.has(target) && !selectedRelationSet.has(relation.id) && !excludedRelationSet.has(relation.id)) {
    addBlocker(relation.id, "INTERNAL_RELATION_UNACCOUNTED", "Select the relation or record an explicit exclusion reason");
  }
}

const selection = {
  coreEntities: candidate.coreEntities,
  dependencyEntities: candidate.dependencyEntities,
  relations: candidate.relations,
  excludedRelations: candidate.excludedRelations,
  audio: candidate.audio,
};
const report = {
  schemaVersion: "1.0",
  candidateId: candidate.id,
  contentVersion: candidate.contentVersion,
  status: candidate.status,
  targetReleaseStage: candidate.targetReleaseStage,
  selection,
  selectionChecksumSha256: checksum(selection),
  counts: {
    coreEntities: candidate.coreEntities.length,
    dependencyEntities: candidate.dependencyEntities.length,
    relations: candidate.relations.length,
    audio: candidate.audio.length,
    blockers: blockers.length,
    warnings: warnings.length,
  },
  ready: ["ready", "promoted"].includes(candidate.status) && blockers.length === 0,
  blockers,
  warnings,
};

await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Public RC verified: ${candidate.id}; ${report.counts.coreEntities} core entities; ${report.counts.dependencyEntities} dependencies; ${report.counts.blockers} blockers`);
if (readyOnly && !report.ready) throw new Error(`Public RC is not ready: ${blockers.length} blockers and status=${candidate.status}`);
