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

const figures = await readBatch("content/dao-ru-fo/entities/figure/third-batch-2026-08.json");
const events = await readBatch("content/dao-ru-fo/entities/event/third-batch-2026-08.json");
const places = await readBatch("content/dao-ru-fo/entities/place/third-batch-2026-08.json");
const routes = await readBatch("content/dao-ru-fo/entities/route/third-batch-2026-08.json");
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
const entityByKey = new Map(allEntities.map((entity) => [keyOf(entity), entity]));
const sourceIds = new Set(sources.map((source) => source.id));
const newFigureSlugs = new Set(figures.map((entity) => entity.slug));
const newEventSlugs = new Set(events.map((entity) => entity.slug));
const newPlaceSlugs = new Set(places.map((entity) => entity.slug));
const newRouteSlugs = new Set(routes.map((entity) => entity.slug));
const batchEntityKeys = new Set([...figures, ...events, ...places, ...routes].map(keyOf));
const relationIds = new Set();
const relationByFigure = new Map();

const firstRange = (entity) => {
  const assertion = entity?.temporalAssertions?.find((item) => item.startYear !== undefined);
  return assertion?.startYear === undefined ? undefined : {
    startYear: assertion.startYear,
    endYear: assertion.endYear ?? assertion.startYear,
  };
};

if (figures.length !== 12) fail(`third batch expected 12 figures, received ${figures.length}`);
if (events.length !== 12) fail(`third batch expected 12 events, received ${events.length}`);
if (places.length !== 10) fail(`third batch expected 10 places, received ${places.length}`);
if (routes.length !== 3) fail(`third batch expected 3 routes, received ${routes.length}`);
if (allEntities.filter((entity) => entity.kind === "figure").length !== 152) fail("total figure count is not 152");
if (allEntities.filter((entity) => entity.kind === "event").length !== 157) fail("total event count is not 157");
if (allEntities.filter((entity) => entity.kind === "place").length !== 90) fail("total place count is not 90");
if (allEntities.filter((entity) => entity.kind === "route").length !== 7) fail("total route count is not 7");
if (relations.length !== 716) fail(`total relation count is not 716: ${relations.length}`);
if (sources.length !== 105) fail(`total source count is not 105: ${sources.length}`);

for (const entity of [...figures, ...events, ...places, ...routes]) {
  if (!entity.temporalAssertions?.length) fail(`${keyOf(entity)} has no temporal assertion`);
  if (!entity.sourceIds?.length) fail(`${keyOf(entity)} has no sources`);
  for (const sourceId of entity.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) fail(`${keyOf(entity)} references unknown source ${sourceId}`);
  }
  for (const assertion of entity.temporalAssertions ?? []) {
    if (!entity.sourceIds.includes(assertion.sourceId)) {
      fail(`${keyOf(entity)} temporal assertion source ${assertion.sourceId} is absent from entity.sourceIds`);
    }
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
  for (const sourceId of relation.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) fail(`${relation.id} references unknown source ${sourceId}`);
  }
  for (const assertion of relation.temporalAssertions ?? []) {
    if (!relation.sourceIds.includes(assertion.sourceId)) {
      fail(`${relation.id} temporal assertion source ${assertion.sourceId} is absent from relation.sourceIds`);
    }
  }
  if (relation.relationType === "received_by" && relation.source.kind === "figure" && relation.target.kind === "figure") {
    const sourceRange = firstRange(entityByKey.get(keyOf(relation.source)));
    const targetRange = firstRange(entityByKey.get(keyOf(relation.target)));
    if (sourceRange && targetRange && sourceRange.startYear > targetRange.startYear) {
      fail(`${relation.id} received_by direction is later-to-earlier`);
    }
  }
}

const batchRelations = relations.filter((relation) =>
  batchEntityKeys.has(keyOf(relation.source)) || batchEntityKeys.has(keyOf(relation.target)),
);
if (batchRelations.length !== 69) fail(`third-batch relation closure expected 69, received ${batchRelations.length}`);

const newFigureInteractions = relations.filter((relation) =>
  relation.source.kind === "figure" && relation.target.kind === "figure"
  && newFigureSlugs.has(relation.source.slug) && newFigureSlugs.has(relation.target.slug),
);
if (newFigureInteractions.length < 6) fail(`expected at least 6 new-figure interactions, received ${newFigureInteractions.length}`);

for (const figure of figures) {
  const connected = relationByFigure.get(figure.slug) ?? [];
  const participated = connected.find((relation) =>
    relation.relationType === "participated_in"
    && relation.source.kind === "figure" && relation.source.slug === figure.slug
    && relation.target.kind === "event" && newEventSlugs.has(relation.target.slug),
  );
  if (!participated) fail(`${figure.slug} is missing figure → event participation`);
  const spatial = connected.find((relation) =>
    ["active_in", "remembered_in", "born_in", "travelled_through"].includes(relation.relationType)
    && [relation.source, relation.target].some((endpoint) => endpoint.kind === "place"),
  );
  if (!spatial) fail(`${figure.slug} is missing a controlled figure → place relation`);
  const crossExisting = connected.find((relation) =>
    relation.source.kind === "figure" && relation.target.kind === "figure"
    && [relation.source, relation.target].some((endpoint) => endpoint.kind === "figure" && newFigureSlugs.has(endpoint.slug))
    && [relation.source, relation.target].some((endpoint) => endpoint.kind === "figure" && !newFigureSlugs.has(endpoint.slug)),
  );
  if (!crossExisting) fail(`${figure.slug} is missing a relation to an existing figure`);
}

for (const event of events) {
  if (!relations.some((relation) =>
    relation.relationType === "occurred_at"
    && relation.source.kind === "event" && relation.source.slug === event.slug
    && relation.target.kind === "place",
  )) fail(`${event.slug} is missing event → place occurrence`);
}

for (const place of places) {
  if (!place.profile?.coordinates) fail(`${place.slug} has no map coordinates`);
  if (!relations.some((relation) =>
    [relation.source, relation.target].some((endpoint) => endpoint.kind === "place" && endpoint.slug === place.slug),
  )) fail(`${place.slug} is not referenced by a relation`);
}

for (const route of routes) {
  const waypoints = route.profile?.waypointSlugs ?? [];
  if (waypoints.length !== 3) fail(`${route.slug} must have exactly 3 frozen waypoints`);
  const traveller = relations.find((relation) =>
    relation.relationType === "travelled_through"
    && relation.target.kind === "route" && relation.target.slug === route.slug
    && relation.source.kind === "figure",
  );
  if (!traveller) fail(`${route.slug} is missing figure → route travel relation`);
  const routePlaces = relations.filter((relation) =>
    relation.relationType === "route_connects"
    && relation.source.kind === "route" && relation.source.slug === route.slug
    && relation.target.kind === "place",
  );
  if (routePlaces.length !== waypoints.length) fail(`${route.slug} route_connects count does not match waypoints`);
  const connectedSlugs = new Set(routePlaces.map((relation) => relation.target.slug));
  for (const waypoint of waypoints) {
    if (!connectedSlugs.has(waypoint)) fail(`${route.slug} is missing route connection to ${waypoint}`);
  }
}

for (const slug of ["lu-dongbin", "zhang-sanfeng"]) {
  const figure = figures.find((item) => item.slug === slug);
  if (figure?.profile?.figureClass !== "traditional_sage" || figure.profile.historicity !== "traditional") {
    fail(`${slug} must remain a traditional_sage with traditional historicity`);
  }
  if (figure.temporalAssertions.some((assertion) => assertion.startYear !== undefined || assertion.endYear !== undefined)) {
    fail(`${slug} must not receive fabricated historical years`);
  }
  const spatial = relationByFigure.get(slug)?.find((relation) => relation.relationType === "remembered_in");
  if (!spatial) fail(`${slug} must use remembered_in rather than a fabricated historical activity place`);
}

for (const routeSlug of ["kumarajiva-kucha-changan-corridor", "jianzhen-eastward-transmission-route", "qiu-chuji-western-journey-route"]) {
  if (!newRouteSlugs.has(routeSlug)) fail(`frozen route ${routeSlug} is missing`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Third-batch closure verified: ${figures.length} figures, ${events.length} events, `
  + `${places.length} places, ${routes.length} routes, ${batchRelations.length} relations; `
  + `new-figure interactions=${newFigureInteractions.length}.`,
);
