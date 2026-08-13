import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const contentRoot = join(repoRoot, "content", "dao-ru-fo");
const readJson = async (relativePath) => JSON.parse(await readFile(join(repoRoot, relativePath), "utf8"));
const readBatch = async (relativePath) => {
  const value = await readJson(relativePath);
  return Array.isArray(value) ? value : [value];
};
const keyOf = (entity) => `${entity.kind}:${entity.slug}`;
const failures = [];
const fail = (message) => failures.push(message);

const figures = await readBatch("content/dao-ru-fo/entities/figure/second-100-batch-2026-08.json");
const events = await readBatch("content/dao-ru-fo/entities/event/second-100-batch-2026-08.json");
const places = await readBatch("content/dao-ru-fo/entities/place/second-100-batch-2026-08.json");
const relations = await readJson("content/dao-ru-fo/relations.json");
const sources = await readJson("content/common/sources.json");

const allEntities = [];
for (const kind of await readdir(join(contentRoot, "entities"))) {
  for (const file of await readdir(join(contentRoot, "entities", kind))) {
    if (!file.endsWith(".json")) continue;
    const value = await readJson(`content/dao-ru-fo/entities/${kind}/${file}`);
    allEntities.push(...(Array.isArray(value) ? value : [value]));
  }
}

const entityKeys = new Set(allEntities.map(keyOf));
const sourceIds = new Set(sources.map((source) => source.id));
const newFigureSlugs = new Set(figures.map((figure) => figure.slug));
const newEventSlugs = new Set(events.map((event) => event.slug));
const newPlaceSlugs = new Set(places.map((place) => place.slug));
const relationIds = new Set();
const relationByFigure = new Map();

if (figures.length !== 40) fail(`second-100 figure batch expected 40, received ${figures.length}`);
if (events.length !== 40) fail(`second-100 event batch expected 40, received ${events.length}`);
if (places.length !== 20) fail(`second-100 place batch expected 20, received ${places.length}`);
if (allEntities.filter((entity) => entity.kind === "figure").length !== 140) fail("total figure count is not 140");
if (allEntities.filter((entity) => entity.kind === "event").length !== 145) fail("total event count is not 145");
if (allEntities.filter((entity) => entity.kind === "place").length !== 80) fail("total place count is not 80");
if (relations.length !== 647) fail(`total relation count is not 647: ${relations.length}`);

for (const entity of [...figures, ...events, ...places]) {
  if (!entity.temporalAssertions?.length) fail(`${keyOf(entity)} has no temporal assertion`);
  for (const sourceId of entity.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) fail(`${keyOf(entity)} references unknown source ${sourceId}`);
  }
}
for (const relation of relations) {
  if (relationIds.has(relation.id)) fail(`duplicate relation ${relation.id}`);
  relationIds.add(relation.id);
  for (const endpoint of [relation.source, relation.target]) {
    if (!entityKeys.has(keyOf(endpoint))) fail(`${relation.id} references missing ${keyOf(endpoint)}`);
    if (endpoint.kind === "figure") {
      const list = relationByFigure.get(endpoint.slug) ?? [];
      list.push(relation);
      relationByFigure.set(endpoint.slug, list);
    }
  }
  for (const sourceId of [...(relation.sourceIds ?? []), ...(relation.temporalAssertions ?? []).map((item) => item.sourceId)]) {
    if (!sourceIds.has(sourceId)) fail(`${relation.id} references unknown source ${sourceId}`);
  }
}
const batchRelations = relations.filter((relation) =>
  [relation.source, relation.target].some((endpoint) =>
    (endpoint.kind === "figure" && newFigureSlugs.has(endpoint.slug)) ||
    (endpoint.kind === "event" && newEventSlugs.has(endpoint.slug)) ||
    (endpoint.kind === "place" && newPlaceSlugs.has(endpoint.slug)),
  ),
);
if (batchRelations.length !== 176) fail(`second-100 relation closure expected 176, received ${batchRelations.length}`);
const newFigureInteractions = relations.filter((relation) =>
  relation.source.kind === "figure" && relation.target.kind === "figure" &&
  newFigureSlugs.has(relation.source.slug) && newFigureSlugs.has(relation.target.slug),
);
if (newFigureInteractions.length < 15) fail(`expected at least 15 new-figure interactions, received ${newFigureInteractions.length}`);

for (const figure of figures) {
  const connected = relationByFigure.get(figure.slug) ?? [];
  const participated = connected.find((relation) =>
    relation.relationType === "participated_in" &&
    relation.source.kind === "figure" && relation.source.slug === figure.slug &&
    relation.target.kind === "event" && newEventSlugs.has(relation.target.slug),
  );
  if (!participated) fail(`${figure.slug} is missing figure → event participation`);
  const figurePlace = connected.find((relation) =>
    ["active_in", "remembered_in", "born_in", "travelled_through"].includes(relation.relationType) &&
    [relation.source, relation.target].some((endpoint) => endpoint.kind === "place"),
  );
  if (!figurePlace) fail(`${figure.slug} is missing figure → place relation`);
  const crossFigure = connected.find((relation) =>
    relation.source.kind === "figure" && relation.target.kind === "figure" &&
    ((newFigureSlugs.has(relation.source.slug) && !newFigureSlugs.has(relation.target.slug)) ||
      (!newFigureSlugs.has(relation.source.slug) && newFigureSlugs.has(relation.target.slug))),
  );
  if (!crossFigure) fail(`${figure.slug} is missing a figure relation to an existing database figure`);
}
for (const event of events) {
  const occurredAt = relations.find((relation) =>
    relation.relationType === "occurred_at" && relation.source.kind === "event" &&
    relation.source.slug === event.slug && relation.target.kind === "place",
  );
  if (!occurredAt) fail(`${event.slug} is missing event → place occurrence`);
}
for (const place of places) {
  if (!relations.some((relation) =>
    [relation.source, relation.target].some((endpoint) => endpoint.kind === "place" && endpoint.slug === place.slug),
  )) fail(`${place.slug} is not referenced by any relation`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Second-100 closure verified: ${figures.length} figures, ${events.length} events, ${places.length} places, ${batchRelations.length} batch relations; new-figure interactions=${newFigureInteractions.length}.`);
