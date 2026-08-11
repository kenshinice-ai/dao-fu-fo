import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EntityContentSchema, RelationRecordSchema, SourceRecordSchema } from "@drf-museum/domain-schema";

const repoRoot = resolve(process.cwd());
const contentRoot = resolve(repoRoot, "content");
const dossierKeys = [
  "figure:xuanzang",
  "figure:sima-chengzhen",
  "figure:kong-yingda",
  "figure:laozi",
  "figure:confucius",
  "figure:sakyamuni",
  "figure:zhuangzi",
  "figure:mengzi",
  "figure:zhang-daoling",
  "figure:ge-hong",
  "figure:ashoka",
  "figure:nagarjuna",
  "figure:kumarajiva",
  "figure:faxian",
  "figure:pangu",
  "figure:nuwa",
  "figure:fuxi",
  "figure:huangdi",
  "figure:xi-wangmu",
  "figure:taishang-laojun",
];
const errors = [];

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

function key(endpoint) {
  return `${endpoint.kind}:${endpoint.slug}`;
}

function relationTouches(relation, subjectKey) {
  return key(relation.source) === subjectKey || key(relation.target) === subjectKey;
}

const sources = SourceRecordSchema.array().parse(await readJson(resolve(contentRoot, "common/sources.json")));
const sourceIds = new Set(sources.map((source) => source.id));
const entities = [];
for (const path of await listJsonFiles(resolve(contentRoot, "dao-ru-fo/entities"))) {
  const raw = await readJson(path);
  for (const value of Array.isArray(raw) ? raw : [raw]) entities.push(EntityContentSchema.parse(value));
}
const entityMap = new Map(entities.map((entity) => [`${entity.kind}:${entity.slug}`, entity]));
const relations = RelationRecordSchema.array().parse(await readJson(resolve(contentRoot, "dao-ru-fo/relations.json")));

for (const relation of relations) {
  const sourceKey = key(relation.source);
  const targetKey = key(relation.target);
  if (!entityMap.has(sourceKey)) errors.push(`${relation.id}: missing source endpoint ${sourceKey}`);
  if (!entityMap.has(targetKey)) errors.push(`${relation.id}: missing target endpoint ${targetKey}`);
  for (const sourceId of [...relation.sourceIds, ...relation.temporalAssertions.map((assertion) => assertion.sourceId)]) {
    if (!sourceIds.has(sourceId)) errors.push(`${relation.id}: unknown source ${sourceId}`);
  }

  if (["participated_in", "occurred_at", "received_by", "remembered_in", "deified_as"].includes(relation.relationType) && relation.temporalAssertions.length === 0) {
    errors.push(`${relation.id}: ${relation.relationType} requires at least one temporal assertion`);
  }
  if (relation.relationType === "participated_in" && !["figure", "institution"].includes(relation.source.kind)) {
    errors.push(`${relation.id}: participated_in source must be a figure or institution`);
  }
  if (relation.relationType === "participated_in" && relation.target.kind !== "event") {
    errors.push(`${relation.id}: participated_in target must be an event`);
  }
  if (relation.relationType === "occurred_at" && relation.source.kind !== "event") {
    errors.push(`${relation.id}: occurred_at source must be an event`);
  }
  if (relation.relationType === "occurred_at" && !["place", "institution", "route"].includes(relation.target.kind)) {
    errors.push(`${relation.id}: occurred_at target must be a place, institution or route`);
  }
  if (relation.relationType === "attributed_to" && !["passage", "text"].includes(relation.source.kind)) {
    errors.push(`${relation.id}: attributed_to source must be a passage or text`);
  }
  if (relation.relationType === "attributed_to" && !["figure", "text"].includes(relation.target.kind)) {
    errors.push(`${relation.id}: attributed_to target must be a figure or text`);
  }
  if (relation.relationType === "attributed_to" && !relation.qualifiers.attributionStatus) {
    errors.push(`${relation.id}: attributed_to requires an attributionStatus qualifier`);
  }
  if (["received_by", "remembered_in"].includes(relation.relationType) && !relation.qualifiers.historicity) {
    errors.push(`${relation.id}: ${relation.relationType} requires a historicity qualifier`);
  }
  if (relation.relationType === "occurred_at" && !relation.qualifiers.spatialRole) {
    errors.push(`${relation.id}: occurred_at requires a spatialRole qualifier`);
  }
}

for (const dossierKey of dossierKeys) {
  const dossier = entityMap.get(dossierKey);
  if (!dossier) errors.push(`Missing dossier subject ${dossierKey}`);
  else {
    const connected = relations.filter((relation) => relationTouches(relation, dossierKey));
    const hasTime = dossier.temporalAssertions.length > 0;
    const hasSpatial = connected.some((relation) =>
      ["active_in", "travelled_through", "institutional_context", "located_in", "remembered_in"].includes(relation.relationType) &&
      [relation.source, relation.target].some((endpoint) => ["place", "institution", "route"].includes(endpoint.kind)),
    );
    const hasEvent = connected.some((relation) => relation.relationType === "participated_in" && relation.target.kind === "event");
    const hasTextOrSpeech = connected.some((relation) =>
      ["translated_or_transmitted", "commented_on", "attributed_to", "represented_by", "received_by"].includes(relation.relationType) &&
      [relation.source, relation.target].some((endpoint) => ["text", "text_version", "passage"].includes(endpoint.kind)),
    );
    const hasReception = connected.some((relation) => ["received_by", "remembered_in", "deified_as", "influenced"].includes(relation.relationType));
    const figureProfile = dossier.kind === "figure" ? dossier.profile : {};
    const symbolicFigure = ["mythic_persona", "sacred_figure"].includes(figureProfile.figureClass);
    const hasRealPlace = connected.some((relation) => [relation.source, relation.target].some((endpoint) => {
      if (endpoint.kind !== "place") return false;
      const place = entityMap.get(key(endpoint));
      return place?.profile?.placeReality !== "sacred_symbolic";
    }));
    if (!hasTime) errors.push(`${dossierKey}: dossier is missing a time anchor`);
    if (!hasSpatial) errors.push(`${dossierKey}: dossier is missing a spatial or institutional anchor`);
    if (!hasEvent) errors.push(`${dossierKey}: dossier is missing a participated_in event relation`);
    if (!hasTextOrSpeech) errors.push(`${dossierKey}: dossier is missing a text or speech relation`);
    if (!hasReception) errors.push(`${dossierKey}: dossier is missing a later-reception relation`);
    if (symbolicFigure && hasRealPlace) errors.push(`${dossierKey}: sacred/mythic figure is connected to a real place; use sacred_symbolic space instead`);
    console.log(`Domain dossier ${dossierKey}: class=${figureProfile.figureClass ?? "unknown"} historicity=${figureProfile.historicity ?? "unknown"}; time=${hasTime} spatial=${hasSpatial} event=${hasEvent} text=${hasTextOrSpeech} reception=${hasReception}; connected relations=${connected.length}`);
  }
}

if (errors.length) throw new Error(`Domain architecture verification failed:\n${errors.join("\n")}`);
console.log(`Domain architecture verified: ${entities.length} entities; ${relations.length} relations; ${sources.length} sources`);
