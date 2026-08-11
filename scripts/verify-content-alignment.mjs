import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DatabaseImportBundleSchema } from "@drf-museum/domain-schema";
import { getContentArtifactRoot } from "./artifact-roots.mjs";

const repoRoot = resolve(process.cwd());
const artifactRoot = resolve(process.env.DRF_CONTENT_ARTIFACT_ROOT ?? getContentArtifactRoot("preview", repoRoot));
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const keyOf = (entity) => `${entity.kind}:${entity.slug}`;
const pairOf = (source, target) => [source.kind, target.kind].sort().join("|");
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function uuidV5(namespace, name) {
  const namespaceBytes = Buffer.from(namespace.replaceAll("-", ""), "hex");
  const hash = createHash("sha1").update(Buffer.concat([namespaceBytes, Buffer.from(name, "utf8")])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJson(value[key])]));
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
}

async function readSourceEntities() {
  const entities = [];
  const root = join(repoRoot, "content/dao-ru-fo/entities");
  for (const kind of await readdir(root)) {
    for (const file of await readdir(join(root, kind))) {
      if (!file.endsWith(".json")) continue;
      const value = await readJson(join(root, kind, file));
      entities.push(...(Array.isArray(value) ? value : [value]));
    }
  }
  return entities;
}

async function readGeneratedEntities(locale) {
  const entities = [];
  const root = join(artifactRoot, "entities");
  for (const kind of await readdir(root)) {
    for (const file of await readdir(join(root, kind))) {
      if (!file.endsWith(`.${locale}.json`)) continue;
      entities.push(await readJson(join(root, kind, file)));
    }
  }
  return entities;
}

const sourceEntities = await readSourceEntities();
const sourceRelations = await readJson(join(repoRoot, "content/dao-ru-fo/relations.json"));
const database = DatabaseImportBundleSchema.parse(await readJson(join(repoRoot, ".artifacts/database/import-v1.json")));
const manifest = await readJson(join(artifactRoot, "manifest/content-version.json"));
const routeManifest = await readJson(join(artifactRoot, "manifest/routes.json"));
const sourceByKey = new Map(sourceEntities.map((entity) => [keyOf(entity), entity]));
const generatedByLocale = new Map();

for (const locale of ["en", "zh-CN"]) {
  const generated = await readGeneratedEntities(locale);
  generatedByLocale.set(locale, new Map(generated.map((entity) => [keyOf(entity), entity])));
}

const generatedByKey = generatedByLocale.get("en");
const generatedRelationsByLocale = new Map([
  ["en", (await readJson(join(artifactRoot, "relations/en.json"))).items],
  ["zh-CN", (await readJson(join(artifactRoot, "relations/zh-CN.json"))).items],
]);
const generatedRelations = generatedRelationsByLocale.get("en");
const databaseEntitiesByKey = new Map(database.entities.map((entity) => [`${entity.kind}:${entity.slug}`, entity]));
const databaseRelationsByKey = new Map(database.relations.map((relation) => [relation.canonicalKey, relation]));
const databaseSourceIdsByKey = new Map(database.sources.map((source) => [source.canonicalKey, source.id]));

if (sourceEntities.length !== generatedByKey.size) {
  fail(`entity count differs: source=${sourceEntities.length}, read-model=${generatedByKey.size}`);
}
for (const key of sourceByKey.keys()) {
  if (!generatedByKey.has(key)) fail(`read-model entity missing source entity: ${key}`);
}
for (const key of generatedByKey.keys()) {
  if (!sourceByKey.has(key)) fail(`read-model entity has no source entity: ${key}`);
}

for (const locale of ["en", "zh-CN"]) {
  const generated = generatedByLocale.get(locale);
  if (generated.size !== sourceEntities.length) fail(`${locale} entity artifact count is ${generated.size}, expected ${sourceEntities.length}`);
  for (const source of sourceEntities) {
    const key = keyOf(source);
    const artifact = generated.get(key);
    if (!artifact) continue;
    if (artifact.id !== uuidV5(database.idNamespace, key)) fail(`${locale} stable ID mismatch: ${key}`);
    if (artifact.title !== source.translations[locale].title) fail(`${locale} title mismatch: ${key}`);
    if (artifact.shortSummary !== source.translations[locale].shortSummary) fail(`${locale} summary mismatch: ${key}`);
  }

  const search = await readJson(join(artifactRoot, `search/${locale}/index.json`));
  const searchByKey = new Map(search.items.map((item) => [keyOf(item), item]));
  if (searchByKey.size !== generated.size) fail(`${locale} search index has duplicate or missing keys`);
  for (const [key, artifact] of generated) {
    const item = searchByKey.get(key);
    if (!item) {
      fail(`${locale} search index missing ${key}`);
      continue;
    }
    if (item.id !== artifact.id || item.title !== artifact.title || item.context !== artifact.shortSummary) {
      fail(`${locale} search index does not match entity artifact: ${key}`);
    }
  }

  const relationItems = generatedRelationsByLocale.get(locale);
  const relationIds = new Set(relationItems.map((relation) => relation.id));
  if (relationIds.size !== sourceRelations.length) fail(`${locale} relation index has duplicate or missing IDs`);
  for (const sourceRelation of sourceRelations) {
    const relation = relationItems.find((candidate) => candidate.id === sourceRelation.id);
    if (!relation) {
      fail(`${locale} relation missing ${sourceRelation.id}`);
      continue;
    }
    if (!sameJson(relation.source, sourceRelation.source) || !sameJson(relation.target, sourceRelation.target) || relation.relationType !== sourceRelation.relationType) {
      fail(`${locale} relation endpoint/type mismatch: ${sourceRelation.id}`);
    }
    if (relation.label !== sourceRelation.label[locale] || relation.summary !== sourceRelation.summary[locale]) {
      fail(`${locale} relation translation mismatch: ${sourceRelation.id}`);
    }
    if (!sameJson(relation.sourceIds, sourceRelation.sourceIds)) fail(`${locale} relation source IDs mismatch: ${sourceRelation.id}`);
    const sourceTemporal = (sourceRelation.temporalAssertions ?? []).map((assertion) => ({
      predicate: assertion.predicate,
      timeType: assertion.timeType,
      ...(assertion.startYear !== undefined ? { startYear: assertion.startYear } : {}),
      ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
      displayDate: assertion.displayDate[locale],
      confidence: assertion.confidence,
      evidenceLayer: assertion.evidenceLayer,
      sourceId: assertion.sourceId,
    }));
    if (!sameJson(relation.temporalAssertions, sourceTemporal) || !sameJson(relation.qualifiers, sourceRelation.qualifiers ?? {})) {
      fail(`${locale} relation qualifiers or temporal assertions mismatch: ${sourceRelation.id}`);
    }
  }
}

if (manifest.entityCounts && Object.values(manifest.entityCounts).reduce((sum, count) => sum + count, 0) !== sourceEntities.length) {
  fail("content manifest entity counts do not cover the source entity set");
}
const routeKeys = new Set(routeManifest.routes.map((route) => `${route.kind}:${route.slug}`));
if (routeKeys.size !== generatedByKey.size) fail("route manifest does not cover every read-model entity");
for (const key of generatedByKey.keys()) if (!routeKeys.has(key)) fail(`route manifest missing ${key}`);

const expectedRelationPairs = {
  active_in: ["figure|institution", "figure|place"],
  travelled_through: ["figure|place", "figure|route"],
  has_version: ["text|text_version"],
  passage_of: ["passage|text"],
  quoted_from_version: ["passage|text_version"],
  route_connects: ["place|place", "place|route"],
  comparative_parallel: ["figure|figure", "passage|passage", "text|text"],
  commented_on: ["figure|text"],
  institutional_context: ["event|institution", "figure|institution"],
  located_in: ["institution|place", "place|place"],
  participated_in: ["event|figure"],
  occurred_at: ["event|place"],
  attributed_to: ["figure|passage", "figure|text"],
  remembered_in: ["figure|institution", "figure|place"],
  received_by: ["figure|figure", "figure|text", "institution|text"],
  influenced: ["event|figure", "figure|figure"],
  represented_by: ["figure|text"],
  translated_or_transmitted: ["figure|text"],
  deified_as: ["figure|figure"],
  contemporary_with: ["figure|figure"],
  born_in: ["figure|place"],
};

for (const sourceRelation of sourceRelations) {
  const pair = pairOf(sourceRelation.source, sourceRelation.target);
  if (!expectedRelationPairs[sourceRelation.relationType]?.includes(pair)) {
    fail(`relation endpoint semantics are not declared: ${sourceRelation.id} (${sourceRelation.relationType}, ${pair})`);
  }
  const databaseRelation = databaseRelationsByKey.get(sourceRelation.id);
  const sourceEntity = databaseEntitiesByKey.get(keyOf(sourceRelation.source));
  const targetEntity = databaseEntitiesByKey.get(keyOf(sourceRelation.target));
  if (!databaseRelation || !sourceEntity || !targetEntity) {
    fail(`database relation endpoint missing: ${sourceRelation.id}`);
    continue;
  }
  if (databaseRelation.sourceEntityId !== sourceEntity.id || databaseRelation.targetEntityId !== targetEntity.id || databaseRelation.relationType !== sourceRelation.relationType) {
    fail(`database relation endpoint/type mismatch: ${sourceRelation.id}`);
  }
  if (!sameJson(databaseRelation.label, sourceRelation.label) || !sameJson(databaseRelation.summary, sourceRelation.summary) || databaseRelation.confidence !== sourceRelation.confidence || databaseRelation.evidenceLayer !== sourceRelation.evidenceLayer) {
    fail(`database relation metadata mismatch: ${sourceRelation.id}`);
  }
  const expectedSourceIds = sourceRelation.sourceIds.map((sourceId) => databaseSourceIdsByKey.get(sourceId));
  if (expectedSourceIds.some((sourceId) => !sourceId) || !sameJson(databaseRelation.sourceIds, expectedSourceIds)) {
    fail(`database relation source alignment mismatch: ${sourceRelation.id}`);
  }
}

if (databaseRelationsByKey.size !== sourceRelations.length) fail("database relation count differs from source relation count");
for (const source of sourceEntities) {
  const key = keyOf(source);
  const databaseEntity = databaseEntitiesByKey.get(key);
  if (!databaseEntity) {
    fail(`database entity missing: ${key}`);
    continue;
  }
  if (databaseEntity.id !== uuidV5(database.idNamespace, key)) fail(`database entity stable ID mismatch: ${key}`);
  for (const locale of ["en", "zh-CN"]) {
    const translation = database.translations.find((candidate) => candidate.entityId === databaseEntity.id && candidate.locale === locale);
    if (!translation || translation.title !== source.translations[locale].title) fail(`database translation mismatch: ${key}/${locale}`);
  }
  const profile = database.profiles.find((candidate) => candidate.entityId === databaseEntity.id);
  if (!profile || profile.kind !== source.kind) fail(`database profile missing or misclassified: ${key}`);
  for (const [index, assertion] of (source.temporalAssertions ?? []).entries()) {
    const temporalId = uuidV5(database.idNamespace, `temporal:${source.kind}:${source.slug}:${index}`);
    const databaseAssertion = database.temporalAssertions.find((candidate) => candidate.id === temporalId);
    const expected = {
      entityId: databaseEntity.id,
      predicate: assertion.predicate,
      timeType: assertion.timeType,
      ...(assertion.startYear !== undefined ? { startYear: assertion.startYear } : {}),
      ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
      displayDate: assertion.displayDate,
      confidence: assertion.confidence,
      evidenceLayer: assertion.evidenceLayer,
      sourceId: databaseSourceIdsByKey.get(assertion.sourceId),
    };
    if (!databaseAssertion || !sameJson({ ...databaseAssertion, id: undefined }, { id: undefined, ...expected })) {
      fail(`database temporal assertion mismatch: ${key}#${index}`);
    }
  }
}

for (const locale of ["en", "zh-CN"]) {
  const map = await readJson(join(artifactRoot, `maps/real/overview.${locale}.geojson`));
  const featuresBySlug = new Map(map.features.map((feature) => [feature.properties.slug, feature]));
  const expectedPlaces = sourceEntities.filter((entity) => entity.kind === "place" && entity.profile?.coordinates && entity.profile.placeReality !== "sacred_symbolic");
  if (featuresBySlug.size !== expectedPlaces.length) fail(`${locale} real map place count differs from coordinate-bearing places`);
  for (const place of expectedPlaces) {
    const feature = featuresBySlug.get(place.slug);
    if (!feature) {
      fail(`${locale} real map missing ${keyOf(place)}`);
      continue;
    }
    if (!sameJson(feature.geometry.coordinates, place.profile.coordinates)) fail(`${locale} map coordinate mismatch: ${keyOf(place)}`);
  }
  for (const feature of map.features) {
    if (!sourceByKey.has(`place:${feature.properties.slug}`) || feature.properties.placeReality === "sacred_symbolic") {
      fail(`${locale} real map contains an invalid place feature: ${feature.properties.slug}`);
    }
  }
}

const physicalFigurePlaceTypes = new Set(["active_in", "travelled_through", "born_in", "located_in"]);
const unresolvedFigurePlaces = new Set();
for (const relation of sourceRelations) {
  if (!physicalFigurePlaceTypes.has(relation.relationType)) continue;
  if (pairOf(relation.source, relation.target) !== "figure|place") continue;
  const place = relation.source.kind === "place" ? relation.source : relation.target;
  const sourcePlace = sourceByKey.get(keyOf(place));
  if (sourcePlace && !sourcePlace.profile?.coordinates) unresolvedFigurePlaces.add(keyOf(place));
}
if (unresolvedFigurePlaces.size > 0) {
  warnings.push(`physical figure-place relations without drawable coordinates: ${[...unresolvedFigurePlaces].join(", ")}`);
}

const unresolvedRouteWaypoints = [];
for (const route of sourceEntities.filter((entity) => entity.kind === "route")) {
  const pending = (route.profile?.waypointSlugs ?? []).filter((slug) => !sourceByKey.get(`place:${slug}`)?.profile?.coordinates);
  if (pending.length > 0) unresolvedRouteWaypoints.push(`${keyOf(route)}: ${pending.join(", ")}`);
}
if (unresolvedRouteWaypoints.length > 0) warnings.push(`route waypoints without drawable coordinates: ${unresolvedRouteWaypoints.join("; ")}`);

if (failures.length > 0) {
  throw new Error(`Content/database alignment failed (${failures.length} findings):\n${failures.slice(0, 80).join("\n")}${failures.length > 80 ? `\n…and ${failures.length - 80} more` : ""}`);
}

console.log(JSON.stringify({
  artifactRoot,
  contentVersion: manifest.contentVersion,
  sourceEntities: sourceEntities.length,
  readModelEntities: generatedByKey.size,
  sourceRelations: sourceRelations.length,
  readModelRelations: generatedRelations.length,
  databaseEntities: database.entities.length,
  databaseRelations: database.relations.length,
  realMapPlaces: sourceEntities.filter((entity) => entity.kind === "place" && entity.profile?.coordinates && entity.profile.placeReality !== "sacred_symbolic").length,
  routes: routeManifest.routes.filter((route) => route.kind === "route").length,
  warnings,
}, null, 2));
