import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseImportBundleSchema } from "@drf-museum/domain-schema";

const bundle = DatabaseImportBundleSchema.parse(JSON.parse(await readFile(resolve(".artifacts/database/import-v1.json"), "utf8")));
const unique = (values, label) => {
  const set = new Set(values);
  if (set.size !== values.length) throw new Error(`Duplicate ${label}`);
  return set;
};

const entityIds = unique(bundle.entities.map((row) => row.id), "database entity IDs");
unique(bundle.entities.map((row) => `${row.kind}:${row.slug}`), "database entity keys");
const sourceIds = unique(bundle.sources.map((row) => row.id), "database source IDs");
unique(bundle.sources.map((row) => row.canonicalKey), "database source keys");
for (const source of bundle.sources) {
  if (!source.citationZh.trim() || !source.citationEn.trim()) throw new Error(`Source lacks bilingual citation: ${source.canonicalKey}`);
}
unique(bundle.relations.map((row) => row.id), "database relation IDs");
unique(bundle.relations.map((row) => row.canonicalKey), "database relation keys");

for (const row of bundle.translations) if (!entityIds.has(row.entityId)) throw new Error(`Translation references missing entity ${row.entityId}`);
for (const row of bundle.profiles) if (!entityIds.has(row.entityId)) throw new Error(`Profile references missing entity ${row.entityId}`);
for (const row of bundle.entitySources) {
  if (!entityIds.has(row.entityId) || !sourceIds.has(row.sourceId)) throw new Error("Entity-source link has a missing endpoint");
}
for (const row of bundle.entityTraditions) {
  if (!entityIds.has(row.entityId) || !entityIds.has(row.traditionId) || !sourceIds.has(row.sourceId)) throw new Error("Tradition assignment has a missing endpoint");
}
for (const row of bundle.temporalAssertions) {
  if (!entityIds.has(row.entityId) || !sourceIds.has(row.sourceId)) throw new Error("Temporal assertion has a missing endpoint");
}
for (const row of bundle.relations) {
  if (!entityIds.has(row.sourceEntityId) || !entityIds.has(row.targetEntityId)) throw new Error("Relation has a missing entity endpoint");
  if (row.sourceIds.some((id) => !sourceIds.has(id))) throw new Error("Relation has a missing source endpoint");
}

for (const entity of bundle.entities) {
  const locales = new Set(bundle.translations.filter((row) => row.entityId === entity.id).map((row) => row.locale));
  if (!locales.has("zh-CN") || !locales.has("en")) throw new Error(`Database entity lacks bilingual translations: ${entity.kind}:${entity.slug}`);
}
const profilesByEntity = new Map();
for (const profile of bundle.profiles) {
  if (profilesByEntity.has(profile.entityId)) throw new Error(`Duplicate database profile for ${profile.entityId}`);
  profilesByEntity.set(profile.entityId, profile);
}
for (const entity of bundle.entities) {
  const profile = profilesByEntity.get(entity.id);
  if (!profile || profile.kind !== entity.kind) throw new Error(`Database entity lacks a matching profile contract: ${entity.kind}:${entity.slug}`);
  if (Object.keys(profile.value).length === 0) throw new Error(`Database profile is empty: ${entity.kind}:${entity.slug}`);
}
const topTraditions = bundle.entities.filter((row) => row.kind === "tradition");
if (topTraditions.length !== 3) throw new Error(`Expected three canonical top traditions, found ${topTraditions.length}`);

console.log(`Database import bundle verified: ${bundle.entities.length} entities; ${bundle.sources.length} sources; ${bundle.relations.length} relations; ${bundle.temporalAssertions.length} temporal assertions`);
