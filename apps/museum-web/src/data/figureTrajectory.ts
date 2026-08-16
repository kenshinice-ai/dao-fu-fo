import type { ReadModelRelation } from "@drf-museum/domain-schema";
import { contextEndpointKey } from "./contextProjection";
import type { EntityData, MuseumMapData, SearchItem } from "../types";

export type FigureTrajectoryRole = "birth" | "activity" | "travel" | "event" | "route" | "memory";

export interface FigureTrajectoryTime {
  startYear?: number;
  endYear?: number;
  displayDate?: string;
}

export interface FigureTrajectoryWaypoint {
  id: string;
  figureKey: string;
  placeKey: string;
  placeSlug: string;
  placeTitle: string;
  role: FigureTrajectoryRole;
  relationId: string;
  bridgeRelationId?: string;
  eventKey?: string;
  routeKey?: string;
  sequence?: number;
  orderCertain: boolean;
  reconstructed: boolean;
  laterMemory: boolean;
  summary: string;
  label: string;
  confidence: ReadModelRelation["confidence"];
  evidenceLayer: ReadModelRelation["evidenceLayer"];
  sourceIds: string[];
  time?: FigureTrajectoryTime;
  coordinates?: [number, number];
}

export interface FigureTrajectory {
  figureKey: string;
  physical: FigureTrajectoryWaypoint[];
  reconstructed: FigureTrajectoryWaypoint[];
  memory: FigureTrajectoryWaypoint[];
  unresolved: FigureTrajectoryWaypoint[];
  mapped: FigureTrajectoryWaypoint[];
  routeKeys: string[];
}

export interface DeriveFigureTrajectoryInput {
  figureKey: string;
  relations: ReadModelRelation[];
  places: MuseumMapData["features"];
  routes: EntityData[];
  searchItems?: SearchItem[];
}

const PHYSICAL_RELATIONS = new Set(["active_in", "travelled_through", "born_in", "located_in"]);
const ROUTE_FIGURE_RELATIONS = new Set(["travelled_through", "located_in", "active_in"]);

function touches(relation: ReadModelRelation, key: string): boolean {
  return contextEndpointKey(relation.source) === key || contextEndpointKey(relation.target) === key;
}

function endpointOfKind(relation: ReadModelRelation, kind: string): { kind: string; slug: string } | undefined {
  if (relation.source.kind === kind) return relation.source;
  if (relation.target.kind === kind) return relation.target;
  return undefined;
}

function otherEndpoint(relation: ReadModelRelation, key: string): { kind: string; slug: string } | undefined {
  if (contextEndpointKey(relation.source) === key) return relation.target;
  if (contextEndpointKey(relation.target) === key) return relation.source;
  return undefined;
}

function relationTime(relation: ReadModelRelation | undefined): FigureTrajectoryTime | undefined {
  const assertion = [...(relation?.temporalAssertions ?? [])]
    .filter((candidate) => candidate.startYear !== undefined || candidate.endYear !== undefined)
    .sort((left, right) => (left.startYear ?? left.endYear ?? Number.MAX_SAFE_INTEGER) - (right.startYear ?? right.endYear ?? Number.MAX_SAFE_INTEGER))[0];
  if (!assertion) return undefined;
  return {
    ...(assertion.startYear !== undefined ? { startYear: assertion.startYear } : {}),
    ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
    displayDate: assertion.displayDate,
  };
}

function relationSortYear(waypoint: FigureTrajectoryWaypoint): number {
  return waypoint.time?.startYear ?? Number.MAX_SAFE_INTEGER;
}

function routeWaypointSlugs(route: EntityData): string[] {
  const value = route.profile?.waypointSlugs;
  return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === "string") : [];
}

function routeCertainty(route: EntityData): string {
  return typeof route.profile?.certainty === "string" ? route.profile.certainty : "reconstructed";
}

function placeTitle(
  slug: string,
  placeMap: Map<string, MuseumMapData["features"][number]>,
  searchMap: Map<string, SearchItem>,
): string {
  return placeMap.get(slug)?.properties.title ?? searchMap.get(`place:${slug}`)?.title ?? slug.replaceAll("-", " ");
}

function coordinatesFor(slug: string, placeMap: Map<string, MuseumMapData["features"][number]>): [number, number] | undefined {
  const feature = placeMap.get(slug);
  return feature ? [...feature.geometry.coordinates] as [number, number] : undefined;
}

function combineSourceIds(...relations: Array<ReadModelRelation | undefined>): string[] {
  return [...new Set(relations.flatMap((relation) => relation?.sourceIds ?? []))];
}

function buildWaypoint(
  input: {
    figureKey: string;
    placeSlug: string;
    role: FigureTrajectoryRole;
    relation: ReadModelRelation;
    bridgeRelation?: ReadModelRelation;
    eventKey?: string;
    routeKey?: string;
    sequence?: number;
    reconstructed?: boolean;
    laterMemory?: boolean;
    label?: string;
    summary?: string;
    timeRelation?: ReadModelRelation;
  },
  placeMap: Map<string, MuseumMapData["features"][number]>,
  searchMap: Map<string, SearchItem>,
): FigureTrajectoryWaypoint {
  const time = relationTime(input.timeRelation ?? input.relation);
  const reconstructed = input.reconstructed ?? false;
  const laterMemory = input.laterMemory ?? false;
  return {
    id: `${input.relation.id}:${input.placeSlug}:${input.role}:${input.sequence ?? "context"}`,
    figureKey: input.figureKey,
    placeKey: `place:${input.placeSlug}`,
    placeSlug: input.placeSlug,
    placeTitle: placeTitle(input.placeSlug, placeMap, searchMap),
    role: input.role,
    relationId: input.relation.id,
    ...(input.bridgeRelation ? { bridgeRelationId: input.bridgeRelation.id } : {}),
    ...(input.eventKey ? { eventKey: input.eventKey } : {}),
    ...(input.routeKey ? { routeKey: input.routeKey } : {}),
    ...(input.sequence !== undefined ? { sequence: input.sequence } : {}),
    orderCertain: !reconstructed && Boolean(time?.startYear !== undefined),
    reconstructed,
    laterMemory,
    summary: input.summary ?? input.relation.summary,
    label: input.label ?? input.relation.label,
    confidence: input.relation.confidence,
    evidenceLayer: input.relation.evidenceLayer,
    sourceIds: combineSourceIds(input.relation, input.bridgeRelation),
    ...(time ? { time } : {}),
    ...(coordinatesFor(input.placeSlug, placeMap) ? { coordinates: coordinatesFor(input.placeSlug, placeMap) } : {}),
  };
}

function sortWaypoints(left: FigureTrajectoryWaypoint, right: FigureTrajectoryWaypoint): number {
  return relationSortYear(left) - relationSortYear(right)
    || (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER)
    || left.placeTitle.localeCompare(right.placeTitle)
    || left.id.localeCompare(right.id);
}

function dedupeByPlace(waypoints: FigureTrajectoryWaypoint[]): FigureTrajectoryWaypoint[] {
  const selected = new Map<string, FigureTrajectoryWaypoint>();
  for (const waypoint of waypoints) {
    const existing = selected.get(waypoint.placeKey);
    if (!existing || (existing.reconstructed && !waypoint.reconstructed) || (existing.role === "event" && waypoint.role !== "event")) {
      selected.set(waypoint.placeKey, waypoint);
    }
  }
  return [...selected.values()].sort(sortWaypoints);
}

function routeRelationForPlace(
  relations: ReadModelRelation[],
  routeKey: string,
  placeSlug: string,
): ReadModelRelation | undefined {
  return relations
    .filter((relation) => relation.relationType === "route_connects")
    .filter((relation) => touches(relation, routeKey))
    .find((relation) => contextEndpointKey(endpointOfKind(relation, "place") ?? { kind: "", slug: "" }) === `place:${placeSlug}`);
}

function routeIsSupported(
  route: EntityData,
  routeKey: string,
  figureKey: string,
  relations: ReadModelRelation[],
  physical: FigureTrajectoryWaypoint[],
): boolean {
  const directFigureRoute = relations.some((relation) =>
    ROUTE_FIGURE_RELATIONS.has(relation.relationType)
      && touches(relation, figureKey)
      && contextEndpointKey(otherEndpoint(relation, figureKey) ?? { kind: "", slug: "" }) === routeKey,
  );
  if (directFigureRoute) return true;
  const figureSlug = figureKey.slice("figure:".length);
  if (!route.slug.includes(figureSlug)) return false;
  const routePlaces = relations
    .filter((relation) => relation.relationType === "route_connects" && touches(relation, routeKey))
    .map((relation) => endpointOfKind(relation, "place"))
    .filter((endpoint): endpoint is { kind: string; slug: string } => Boolean(endpoint));
  const physicalSlugs = new Set(physical.map((waypoint) => waypoint.placeSlug));
  return routePlaces.length > 0 || routeWaypointSlugs(route).some((slug) => physicalSlugs.has(slug));
}

/**
 * Derive a figure's spatial evidence from read-model relations and explicit
 * route entities. Direct locations and event bridges are physical context;
 * route waypoints are visibly reconstructed; remembered_in is never a stop.
 */
export function deriveFigureTrajectory({
  figureKey,
  relations,
  places,
  routes,
  searchItems = [],
}: DeriveFigureTrajectoryInput): FigureTrajectory {
  const placeMap = new Map(places.map((feature) => [feature.properties.slug, feature]));
  const searchMap = new Map(searchItems.map((item) => [`${item.kind}:${item.slug}`, item]));
  const sortedRelations = [...relations].sort((left, right) => left.id.localeCompare(right.id));
  const physical: FigureTrajectoryWaypoint[] = [];
  const memory: FigureTrajectoryWaypoint[] = [];

  for (const relation of sortedRelations) {
    if (!touches(relation, figureKey)) continue;
    const place = otherEndpoint(relation, figureKey);
    if (!place || place.kind !== "place") continue;
    if (PHYSICAL_RELATIONS.has(relation.relationType)) {
      const role: FigureTrajectoryRole = relation.relationType === "born_in"
        ? "birth"
        : relation.relationType === "travelled_through" ? "travel" : "activity";
      physical.push(buildWaypoint({ figureKey, placeSlug: place.slug, role, relation }, placeMap, searchMap));
    } else if (relation.relationType === "remembered_in") {
      memory.push(buildWaypoint({ figureKey, placeSlug: place.slug, role: "memory", relation, laterMemory: true }, placeMap, searchMap));
    }
  }

  const participationRelations = sortedRelations.filter((relation) =>
    relation.relationType === "participated_in" && touches(relation, figureKey) && Boolean(otherEndpoint(relation, figureKey)?.kind === "event"),
  );
  for (const participation of participationRelations) {
    const event = otherEndpoint(participation, figureKey);
    if (!event) continue;
    for (const eventPlace of sortedRelations) {
      if (eventPlace.relationType !== "occurred_at" || !touches(eventPlace, contextEndpointKey(event))) continue;
      const place = endpointOfKind(eventPlace, "place");
      if (!place) continue;
      physical.push(buildWaypoint({
        figureKey,
        placeSlug: place.slug,
        role: "event",
        relation: participation,
        bridgeRelation: eventPlace,
        eventKey: contextEndpointKey(event),
        summary: `${participation.summary} · ${eventPlace.summary}`,
        timeRelation: participation.temporalAssertions.length > 0 ? participation : eventPlace,
      }, placeMap, searchMap));
    }
  }

  const physicalContext = dedupeByPlace(physical);
  const reconstructed: FigureTrajectoryWaypoint[] = [];
  const routeKeys: string[] = [];
  for (const route of routes) {
    const routeKey = `route:${route.slug}`;
    if (!routeIsSupported(route, routeKey, figureKey, sortedRelations, physicalContext)) continue;
    const routeWaypoints = routeWaypointSlugs(route);
    if (routeWaypoints.length < 2) continue;
    routeKeys.push(routeKey);
    routeWaypoints.forEach((placeSlug, index) => {
      const relation = routeRelationForPlace(sortedRelations, routeKey, placeSlug)
        ?? sortedRelations.find((candidate) => candidate.id === routeKey)
        ?? sortedRelations.find((candidate) => candidate.relationType === "route_connects" && touches(candidate, routeKey))
        ?? {
          id: `${routeKey}:waypoint:${placeSlug}`,
          source: { kind: "route", slug: route.slug },
          target: { kind: "place", slug: placeSlug },
          relationType: "route_connects",
          label: route.title,
          summary: route.shortSummary,
          confidence: "low",
          evidenceLayer: "historical_inferred",
          sourceIds: [],
          temporalAssertions: [],
        } as unknown as ReadModelRelation;
      reconstructed.push(buildWaypoint({
        figureKey,
        placeSlug,
        role: "route",
        relation,
        routeKey,
        sequence: index,
        reconstructed: routeCertainty(route) !== "documented",
        summary: route.profile?.corridorNote && typeof route.profile.corridorNote === "object"
          ? String((route.profile.corridorNote as Record<string, unknown>)["zh-CN"] ?? (route.profile.corridorNote as Record<string, unknown>).en ?? route.shortSummary)
          : route.shortSummary,
        label: route.title,
        timeRelation: relation,
      }, placeMap, searchMap));
    });
  }

  const uniqueRouteKeys = [...new Set(routeKeys)].sort();
  const routeMapped = uniqueRouteKeys.flatMap((routeKey) => reconstructed.filter((waypoint) => waypoint.routeKey === routeKey && waypoint.coordinates));
  const mapped = routeMapped.length >= 2 ? routeMapped.sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || left.id.localeCompare(right.id)) : physicalContext.filter((waypoint) => waypoint.coordinates);
  const unresolved = [...physicalContext, ...reconstructed, ...memory]
    .filter((waypoint) => !waypoint.coordinates)
    .sort(sortWaypoints);

  return {
    figureKey,
    physical: physicalContext,
    reconstructed,
    memory: dedupeByPlace(memory),
    unresolved,
    mapped,
    routeKeys: uniqueRouteKeys,
  };
}
