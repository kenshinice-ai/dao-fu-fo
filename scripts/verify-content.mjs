import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import { getContentArtifactRoot } from "./artifact-roots.mjs";

const root = resolve(process.env.DRF_CONTENT_ARTIFACT_ROOT ?? getContentArtifactRoot("preview", process.cwd()));
const manifestPath = resolve(root, "manifest/content-version.json");
const reportPath = resolve(root, "manifest/content-report.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const manifest = await readJson(manifestPath);
const report = await readJson(reportPath);
const quality = await readJson(resolve(root, "manifest/quality-report.json"));
const reviewQueue = await readJson(resolve(root, "manifest/review-queue.json"));
const routes = await readJson(resolve(root, "manifest/routes.json"));
const checksums = await readJson(resolve(root, "manifest/checksums.json"));

if (manifest.schemaVersion !== "2.0" || manifest.profile !== "dao-ru-fo") {
  throw new Error("Compiled content manifest identity is invalid");
}
if (report.schemaVersion !== "2.0" || report.profile !== "dao-ru-fo") {
  throw new Error("Compiled content report identity is invalid");
}
if (manifest.contentVersion !== report.contentVersion) {
  throw new Error("Manifest and report content versions differ");
}
if (manifest.visibility !== report.visibility) {
  throw new Error("Manifest and report visibility differ");
}
if (manifest.relationCount !== report.relationCount) {
  throw new Error("Manifest and report relation counts differ");
}
if (manifest.audioCount !== report.audioCount) {
  throw new Error("Manifest and report audio counts differ");
}
if (quality.contentVersion !== manifest.contentVersion || quality.visibility !== manifest.visibility) {
  throw new Error("Quality report identity differs from manifest");
}
if (quality.counts.entities !== Object.values(report.entityCounts).reduce((sum, count) => sum + count, 0)) {
  throw new Error("Quality report entity count differs from report");
}
if (quality.counts.sources !== report.sourceCount || quality.counts.relations !== report.relationCount || quality.counts.audio !== report.audioCount) {
  throw new Error("Quality report aggregate counts differ from content report");
}

const entityFiles = [];
const walk = async (directory) => {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && entry.name.endsWith(".json")) entityFiles.push(path);
  }
};
await walk(resolve(root, "entities"));

const ids = new Map();
const localeKinds = new Map();
for (const path of entityFiles) {
  const artifact = await readJson(path);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(artifact.id)) {
    throw new Error(`Invalid UUIDv5 in ${path}`);
  }
  const identityKey = `${artifact.kind}:${artifact.slug}`;
  const previousKey = ids.get(artifact.id);
  if (previousKey && previousKey !== identityKey) throw new Error(`Stable ID collision: ${artifact.id}`);
  ids.set(artifact.id, identityKey);
  if (!manifest.locales.includes(artifact.locale)) throw new Error(`Unsupported locale in ${path}`);
  if (!artifact.title || !artifact.shortSummary || !artifact.timeLabel || artifact.sources.length === 0) {
    throw new Error(`Incomplete compiled entity: ${path}`);
  }
  const key = identityKey;
  const locales = localeKinds.get(key) ?? new Set();
  locales.add(artifact.locale);
  localeKinds.set(key, locales);
}

for (const [key, locales] of localeKinds) {
  if (locales.size !== manifest.locales.length) throw new Error(`Missing bilingual artifact for ${key}`);
}

const expectedEntityCount = Object.values(report.entityCounts).reduce((sum, count) => sum + count, 0);
if (entityFiles.length !== expectedEntityCount * manifest.locales.length) {
  throw new Error(`Entity artifact count mismatch: ${entityFiles.length}`);
}
if (routes.contentVersion !== manifest.contentVersion || routes.routes.length !== expectedEntityCount) {
  throw new Error("Route manifest does not cover every visible entity");
}
if (reviewQueue.contentVersion !== manifest.contentVersion || reviewQueue.items.length !== expectedEntityCount + report.relationCount + report.audioCount) {
  throw new Error("Review queue does not cover every visible review subject");
}
if (manifest.visibility === "public" && (quality.publicBlockers.length > 0 || reviewQueue.items.some((item) => item.blocking))) {
  throw new Error("Public artifact contains unresolved publication blockers");
}
if (manifest.visibility === "public" && routes.routes.some((route) => route.publicationState !== "public")) {
  throw new Error("Public route manifest contains a non-public entity");
}

for (const locale of manifest.locales) {
  const relationIndex = await readJson(resolve(root, "relations", `${locale}.json`));
  if (relationIndex.locale !== locale || relationIndex.items.length !== report.relationCount) {
    throw new Error(`Relation artifact count mismatch for ${locale}`);
  }
  const relationIds = new Set(relationIndex.items.map((item) => item.id));
  if (relationIds.size !== relationIndex.items.length) throw new Error(`Duplicate relation IDs for ${locale}`);
  const audioIndex = await readJson(resolve(root, "audio", `${locale}.json`));
  if (audioIndex.locale !== locale || audioIndex.items.length !== report.audioCount) {
    throw new Error(`Audio artifact count mismatch for ${locale}`);
  }
  const audioIds = new Set(audioIndex.items.map((item) => item.id));
  if (audioIds.size !== audioIndex.items.length) throw new Error(`Duplicate audio IDs for ${locale}`);
  const sourceIndex = await readJson(resolve(root, "sources", locale, "index.json"));
  if (sourceIndex.locale !== locale || sourceIndex.items.length !== report.sourceCount) {
    throw new Error(`Source artifact count mismatch for ${locale}`);
  }
  const realMap = await readJson(resolve(root, "maps", "real", `overview.${locale}.geojson`));
  if (realMap.locale !== locale || realMap.features.some((feature) => feature.properties.placeReality === "sacred_symbolic" || feature.geometry.type !== "Point")) {
    throw new Error(`Real map contains invalid or sacred geometry for ${locale}`);
  }
  const sacredCosmos = await readJson(resolve(root, "maps", "cosmos", `overview.${locale}.json`));
  const cosmosNodeIds = new Set(sacredCosmos.nodes.map((node) => node.id));
  if (sacredCosmos.locale !== locale || sacredCosmos.layer !== "sacred_symbolic" || sacredCosmos.nodes.length < 4 || sacredCosmos.nodes.some((node) => "coordinates" in node) || sacredCosmos.edges.some((edge) => !cosmosNodeIds.has(edge.source) || !cosmosNodeIds.has(edge.target))) {
    throw new Error(`Sacred cosmos read model is invalid for ${locale}`);
  }
  const historicalTimeline = await readJson(resolve(root, "timeline", `overview.${locale}.json`));
  if (
    historicalTimeline.locale !== locale ||
    historicalTimeline.startYear >= 581 ||
    historicalTimeline.endYear <= 907 ||
    historicalTimeline.events.length === 0 ||
    historicalTimeline.events.some((event) => event.year === 0)
  ) {
    throw new Error(`Historical timeline contract is invalid for ${locale}`);
  }
  const suitangTimeline = await readJson(resolve(root, "timeline", `suitang.${locale}.json`));
  if (suitangTimeline.locale !== locale || suitangTimeline.startYear !== 581 || suitangTimeline.endYear !== 907 || suitangTimeline.events.some((event) => event.year === 0)) {
    throw new Error(`Sui–Tang timeline contract is invalid for ${locale}`);
  }
  const graph = await readJson(resolve(root, "graphs", "three-traditions", `overview.${locale}.json`));
  const graphNodeIds = new Set(graph.nodes.map((node) => node.id));
  if (graph.locale !== locale || graph.edges.some((edge) => !graphNodeIds.has(edge.source) || !graphNodeIds.has(edge.target))) {
    throw new Error(`Graph contains a missing endpoint for ${locale}`);
  }
  if (manifest.visibility === "preview") {
    const comparison = await readJson(resolve(root, "comparisons", `cross-era-figures.${locale}.json`));
    const comparisonKeys = new Set(comparison.entities.map((entity) => entity.key));
    if (comparison.schemaVersion !== "1.0" || comparison.locale !== locale || comparison.entities.length !== 3 || comparison.axes.length < 8 || comparison.axes.some((axis) => axis.cells.some((cell) => !comparisonKeys.has(cell.entityKey)))) {
      throw new Error(`Comparison read model is invalid for ${locale}`);
    }
    const textReading = await readJson(resolve(root, "text-readings", `three-traditions-passage-reading.${locale}.json`));
    const readingKeys = new Set(textReading.readings.map((reading) => reading.key));
    if (textReading.schemaVersion !== "1.0" || textReading.locale !== locale || textReading.readings.length !== 3 || textReading.axes.length < 6 || textReading.axes.some((axis) => axis.cells.some((cell) => !readingKeys.has(cell.passageKey)))) {
      throw new Error(`Text reading model is invalid for ${locale}`);
    }
    const versionReading = await readJson(resolve(root, "text-readings", `dhammacakkappavattana-version-reading.${locale}.json`));
    const versionKeys = new Set(versionReading.readings.map((reading) => reading.version.key));
    if (
      versionReading.schemaVersion !== "1.0" ||
      versionReading.locale !== locale ||
      versionReading.readingMode !== "same_text_versions" ||
      versionReading.textSlug !== "dhammacakkappavattana-sutta" ||
      versionReading.readings.length !== 2 ||
      versionKeys.size !== 2 ||
      versionReading.axes.length < 6 ||
      versionReading.axes.some((axis) => axis.cells.some((cell) => !cell.reviewEvidence || !Array.isArray(cell.reviewEvidence)))
    ) {
      throw new Error(`Same-text version reading model is invalid for ${locale}`);
    }
    if (!versionReading.readings.some((reading) => reading.passage.variantReadings.some((variant) => variant.kind === "translation"))) {
      throw new Error(`Same-text version reading has no explicit translation wording record for ${locale}`);
    }
  }
}

if (checksums.algorithm !== "sha256" || checksums.contentVersion !== manifest.contentVersion) {
  throw new Error("Checksum manifest identity is invalid");
}
const allJsonFiles = [];
const walkAll = async (directory) => {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walkAll(path);
    else if (entry.isFile() && entry.name.endsWith(".json") && !path.endsWith("/checksums.json")) allJsonFiles.push(path);
  }
};
await walkAll(root);
const actualPaths = allJsonFiles.map((path) => relative(root, path)).sort();
const declaredPaths = Object.keys(checksums.files).sort();
if (JSON.stringify(actualPaths) !== JSON.stringify(declaredPaths)) throw new Error("Checksum manifest file list is incomplete or stale");
for (const path of allJsonFiles) {
  const value = await readFile(path);
  const key = relative(root, path);
  const expected = checksums.files[key];
  const actual = createHash("sha256").update(value).digest("hex");
  if (actual !== expected.sha256 || value.length !== expected.bytes) throw new Error(`Checksum mismatch: ${key}`);
}

console.log(`Compiled content verified: ${report.contentVersion}; ${expectedEntityCount} entities; ${report.relationCount} relations; ${report.audioCount} audio records; ${entityFiles.length} locale artifacts`);
