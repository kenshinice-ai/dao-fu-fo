import type { ReadModelRelation, ReadModelRelationIndex } from "@drf-museum/domain-schema";
import type { SearchItem, TimelineData, TimelineEvent, Tradition } from "../types";

export function contextEndpointKey(endpoint: { kind: string; slug: string }): string {
  return `${endpoint.kind}:${endpoint.slug}`;
}

export function connectedContextKeys(relations: ReadModelRelationIndex | undefined, focus: string | undefined): Set<string> {
  const keys = new Set<string>();
  if (!relations || !focus) return keys;
  for (const relation of relations.items) {
    const sourceKey = contextEndpointKey(relation.source);
    const targetKey = contextEndpointKey(relation.target);
    if (sourceKey === focus || targetKey === focus) {
      keys.add(sourceKey);
      keys.add(targetKey);
    }
  }
  return keys;
}

/**
 * Build the entity set used by the atlas object panel and contextual timeline.
 *
 * Direct read-model edges are always included. A second hop is only allowed
 * through an event or institution when it completes a figure-place context or
 * reveals another figure in the same documented event/institutional setting.
 * That mirrors the Bible Atlas' entity arrays without turning the whole graph
 * into an unbounded "related to related" search.
 */
export function contextEntityKeys(relations: ReadModelRelationIndex | undefined, focus: string | undefined): Set<string> {
  const keys = connectedContextKeys(relations, focus);
  if (!relations || !focus) return keys;
  keys.add(focus);

  const [focusKind] = focus.split(":");
  const bridgeKinds = focusKind === "figure"
    ? new Set(["event", "institution"])
    : focusKind === "place"
      ? new Set(["event", "institution"])
      : new Set<string>();
  if (bridgeKinds.size === 0) return keys;

  const bridgeKeys = [...keys].filter((key) => bridgeKinds.has(key.split(":")[0] ?? ""));
  for (const bridgeKey of bridgeKeys) {
    for (const relation of relations.items) {
      const sourceKey = contextEndpointKey(relation.source);
      const targetKey = contextEndpointKey(relation.target);
      if (sourceKey !== bridgeKey && targetKey !== bridgeKey) continue;
      const otherKey = sourceKey === bridgeKey ? targetKey : sourceKey;
      const otherKind = otherKey.split(":")[0];
      if ((focusKind === "figure" && (otherKind === "place" || otherKind === "figure"))
        || (focusKind === "place" && otherKind === "figure")) {
        keys.add(otherKey);
      }
    }
  }
  return keys;
}

/**
 * Relations shown for a focus include every direct edge plus edges that explain
 * the bounded contextual entity set. This is intentionally broader than the
 * person-only network: the object panel must expose person-place, person-event,
 * text and reception links instead of silently discarding them.
 */
export function contextRelations(relations: ReadModelRelationIndex | undefined, focus: string | undefined): ReadModelRelation[] {
  if (!relations) return [];
  if (!focus) return relations.items;
  const keys = contextEntityKeys(relations, focus);
  return relations.items
    .filter((relation) => {
      const sourceKey = contextEndpointKey(relation.source);
      const targetKey = contextEndpointKey(relation.target);
      return (sourceKey === focus || targetKey === focus) || (keys.has(sourceKey) && keys.has(targetKey));
    })
    .sort((left, right) => {
      const leftDirect = relationTouches(left, focus) ? 0 : 1;
      const rightDirect = relationTouches(right, focus) ? 0 : 1;
      return leftDirect - rightDirect;
    });
}

export interface PlaceFigureContext {
  figureKey: string;
  relation: ReadModelRelation;
  bridge?: ReadModelRelation;
  connection: "direct" | "event";
}

export interface FigurePlaceContext {
  placeKey: string;
  relation: ReadModelRelation;
  bridge?: ReadModelRelation;
  connection: "direct" | "event";
}

export interface PlaceEventContext {
  eventKey: string;
  relation: ReadModelRelation;
}

export interface EventPlaceContext {
  placeKey: string;
  relation: ReadModelRelation;
}

export interface EventFigureContext {
  figureKey: string;
  relation: ReadModelRelation;
}

function relationTouches(relation: ReadModelRelation, key: string): boolean {
  return contextEndpointKey(relation.source) === key || contextEndpointKey(relation.target) === key;
}

/**
 * Keep person-to-person language narrower than the full figure graph. Later
 * reception, deification and comparative parallels remain available as context
 * edges, but are not presented as real-world personal relations.
 */
export function isPersonToPersonRelation(relation: ReadModelRelation): boolean {
  return relation.source.kind === "figure"
    && relation.target.kind === "figure"
    && ["influenced", "contemporary_with"].includes(relation.relationType);
}

/**
 * Keep the display connector faithful to the relation semantics. An influence
 * has a source and a target; a contemporary relation is intentionally
 * non-directional. The endpoints remain the canonical source/target pair in
 * both cases, so this is presentation only and cannot rewrite the read model.
 */
export function relationConnector(relation: ReadModelRelation): "→" | "↔" {
  return ["contemporary_with", "comparative_parallel", "route_connects"].includes(relation.relationType) ? "↔" : "→";
}

function isFigurePlaceRelation(relation: ReadModelRelation, figureKey: string, placeKey: string): boolean {
  return (contextEndpointKey(relation.source) === figureKey && contextEndpointKey(relation.target) === placeKey)
    || (contextEndpointKey(relation.source) === placeKey && contextEndpointKey(relation.target) === figureKey);
}

const FIGURE_PLACE_LOCATION_RELATIONS = new Set(["active_in", "travelled_through", "born_in", "located_in"]);
const FIGURE_EVENT_PARTICIPATION_RELATIONS = new Set(["participated_in"]);
const EVENT_PLACE_LOCATION_RELATIONS = new Set(["occurred_at"]);

/**
 * A map stop must describe a person's physical, travel, or birthplace link to
 * a place. Reception and memory edges remain visible in the relation network,
 * but must not become a geographic stop or a claim that the person was in the
 * city.
 */
export function isFigurePlaceLocationRelation(relation: ReadModelRelation): boolean {
  return FIGURE_PLACE_LOCATION_RELATIONS.has(relation.relationType)
    && ((relation.source.kind === "figure" && relation.target.kind === "place")
      || (relation.source.kind === "place" && relation.target.kind === "figure"));
}

function isFigureEventParticipationRelation(relation: ReadModelRelation): boolean {
  return FIGURE_EVENT_PARTICIPATION_RELATIONS.has(relation.relationType)
    && ((relation.source.kind === "figure" && relation.target.kind === "event")
      || (relation.source.kind === "event" && relation.target.kind === "figure"));
}

function isFigureEventRelation(relation: ReadModelRelation, figureKey: string): boolean {
  return relationTouches(relation, figureKey)
    && isFigureEventParticipationRelation(relation);
}

function isEventPlaceRelation(relation: ReadModelRelation, eventKey: string): boolean {
  return isEventPlacePair(relation) && relationTouches(relation, eventKey);
}

function isEventPlacePair(relation: ReadModelRelation): boolean {
  return EVENT_PLACE_LOCATION_RELATIONS.has(relation.relationType)
    && ((relation.source.kind === "event" && relation.target.kind === "place")
      || (relation.source.kind === "place" && relation.target.kind === "event"));
}

export function placeFigureContexts(
  relations: ReadModelRelationIndex | undefined,
  placeKey: string,
): PlaceFigureContext[] {
  if (!relations) return [];
  const contexts = new Map<string, PlaceFigureContext>();
  for (const relation of relations.items) {
    const sourceKey = contextEndpointKey(relation.source);
    const targetKey = contextEndpointKey(relation.target);
    if (!isFigurePlaceLocationRelation(relation)) continue;
    if (sourceKey === placeKey && relation.target.kind === "figure") {
      contexts.set(targetKey, { figureKey: targetKey, relation, connection: "direct" });
    } else if (targetKey === placeKey && relation.source.kind === "figure") {
      contexts.set(sourceKey, { figureKey: sourceKey, relation, connection: "direct" });
    }
  }

  for (const figureEvent of relations.items.filter((relation) => relation.source.kind === "figure" || relation.target.kind === "figure")) {
    const figureEndpoint = figureEvent.source.kind === "figure" ? figureEvent.source : figureEvent.target;
    const eventEndpoint = figureEvent.source.kind === "event" ? figureEvent.source : figureEvent.target;
    const figureKey = contextEndpointKey(figureEndpoint);
    if (!isFigureEventRelation(figureEvent, figureKey)) continue;
    const eventKey = contextEndpointKey(eventEndpoint);
    for (const eventPlace of relations.items) {
      if (!isEventPlaceRelation(eventPlace, eventKey)) continue;
      const placeEndpoint = eventPlace.source.kind === "place" ? eventPlace.source : eventPlace.target;
      if (contextEndpointKey(placeEndpoint) !== placeKey) continue;
      if (!contexts.has(figureKey)) {
        contexts.set(figureKey, { figureKey, relation: figureEvent, bridge: eventPlace, connection: "event" });
      }
    }
  }
  return [...contexts.values()];
}

export function figurePlaceContexts(
  relations: ReadModelRelationIndex | undefined,
  figureKey: string,
): FigurePlaceContext[] {
  if (!relations) return [];
  const contexts = new Map<string, FigurePlaceContext>();
  for (const relation of relations.items) {
    const placeEndpoint = relation.source.kind === "place"
      ? relation.source
      : relation.target.kind === "place"
        ? relation.target
        : undefined;
    if (!placeEndpoint) continue;
    const placeKey = contextEndpointKey(placeEndpoint);
    if (isFigurePlaceLocationRelation(relation) && isFigurePlaceRelation(relation, figureKey, placeKey)) {
      contexts.set(placeKey, { placeKey, relation, connection: "direct" });
    }
  }

  for (const figureEvent of relations.items.filter((relation) => isFigureEventRelation(relation, figureKey))) {
    const eventEndpoint = figureEvent.source.kind === "event" ? figureEvent.source : figureEvent.target;
    const eventKey = contextEndpointKey(eventEndpoint);
    for (const eventPlace of relations.items) {
      if (!isEventPlaceRelation(eventPlace, eventKey)) continue;
      const placeEndpoint = eventPlace.source.kind === "place" ? eventPlace.source : eventPlace.target;
      const placeKey = contextEndpointKey(placeEndpoint);
      if (!contexts.has(placeKey)) {
        contexts.set(placeKey, { placeKey, relation: figureEvent, bridge: eventPlace, connection: "event" });
      }
    }
  }
  return [...contexts.values()];
}

export function placeEventContexts(
  relations: ReadModelRelationIndex | undefined,
  placeKey: string,
): PlaceEventContext[] {
  if (!relations) return [];
  return relations.items
    .filter((relation) => isEventPlacePair(relation)
      && (contextEndpointKey(relation.source) === placeKey || contextEndpointKey(relation.target) === placeKey))
    .map((relation) => ({
      eventKey: contextEndpointKey(relation.source.kind === "event" ? relation.source : relation.target),
      relation,
    }))
    .sort((a, b) => (relationStartYear(a.relation) ?? Number.MAX_SAFE_INTEGER) - (relationStartYear(b.relation) ?? Number.MAX_SAFE_INTEGER));
}

export function eventPlaceContexts(
  relations: ReadModelRelationIndex | undefined,
  eventKey: string,
): EventPlaceContext[] {
  if (!relations) return [];
  return relations.items
    .filter((relation) => isEventPlaceRelation(relation, eventKey))
    .map((relation) => ({
      placeKey: contextEndpointKey(relation.source.kind === "place" ? relation.source : relation.target),
      relation,
    }));
}

export function eventFigureContexts(
  relations: ReadModelRelationIndex | undefined,
  eventKey: string,
): EventFigureContext[] {
  if (!relations) return [];
  return relations.items
    .filter((relation) => {
      const sourceKey = contextEndpointKey(relation.source);
      const targetKey = contextEndpointKey(relation.target);
      return (sourceKey === eventKey && relation.target.kind === "figure")
        || (targetKey === eventKey && relation.source.kind === "figure");
    })
    .map((relation) => ({
      figureKey: contextEndpointKey(relation.source.kind === "figure" ? relation.source : relation.target),
      relation,
    }));
}

export function relationStartYear(relation: ReadModelRelation): number | undefined {
  const starts = relation.temporalAssertions
    .map((assertion) => assertion.startYear)
    .filter((year): year is number => year !== undefined);
  return starts.length > 0 ? Math.min(...starts) : undefined;
}

export function relationClass(relation: ReadModelRelation): "direct" | "reception" | "spatial" | "context" {
  if (["received_by", "influenced", "translated_or_transmitted", "commented_on", "deified_as"].includes(relation.relationType)) {
    return "reception";
  }
  if (["active_in", "travelled_through", "located_in", "participated_in", "occurred_at", "route_connects", "born_in"].includes(relation.relationType)) {
    return "spatial";
  }
  if (["comparative_parallel", "remembered_in", "represented_by"].includes(relation.relationType)) {
    return "context";
  }
  return "direct";
}

export function relationNeighbors(
  relations: ReadModelRelationIndex | undefined,
  focus: string | undefined,
): ReadModelRelation[] {
  if (!relations || !focus) return [];
  return relations.items.filter((relation) => relationTouches(relation, focus));
}

export function matchesContextFocus(candidateKeys: string[], focus: string | undefined, connectedKeys: Set<string>): boolean {
  return Boolean(focus && candidateKeys.some((key) => key === focus || connectedKeys.has(key)));
}

function traditionForRelation(relation: ReadModelRelation, searchItems: SearchItem[]): Tradition | "convergence" {
  const source = searchItems.find((item) => `${item.kind}:${item.slug}` === contextEndpointKey(relation.source));
  const target = searchItems.find((item) => `${item.kind}:${item.slug}` === contextEndpointKey(relation.target));
  if (source && target && source.tradition !== target.tradition) return "convergence";
  return source?.tradition ?? target?.tradition ?? "convergence";
}

function titleForEndpoint(endpoint: { kind: string; slug: string }, searchItems: SearchItem[]): string {
  return searchItems.find((item) => `${item.kind}:${item.slug}` === contextEndpointKey(endpoint))?.title
    ?? endpoint.slug.replaceAll("-", " ");
}

function relationTimelineEvents(
  data: TimelineData,
  relations: ReadModelRelationIndex | undefined,
  searchItems: SearchItem[],
  focus: string | undefined,
): TimelineEvent[] {
  if (!relations || !focus) return [];
  return relations.items.flatMap((relation) => {
    const sourceKey = contextEndpointKey(relation.source);
    const targetKey = contextEndpointKey(relation.target);
    if (sourceKey !== focus && targetKey !== focus) return [];
    return relation.temporalAssertions.flatMap((assertion, index) => {
      if (assertion.startYear === undefined) return [];
      const assertionEnd = assertion.endYear ?? assertion.startYear;
      if (assertionEnd < data.startYear || assertion.startYear > data.endYear) return [];
      const sourceTitle = titleForEndpoint(relation.source, searchItems);
      const targetTitle = titleForEndpoint(relation.target, searchItems);
      return [{
        id: `${relation.id}:temporal:${index}`,
        kind: relation.source.kind,
        slug: relation.source.slug,
        year: Math.max(data.startYear, assertion.startYear),
        ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
        type: assertion.timeType,
        tradition: traditionForRelation(relation, searchItems),
        title: `${sourceTitle} → ${targetTitle}`,
        summary: `${relation.label} · ${relation.summary}`,
        predicate: assertion.predicate,
        displayDate: assertion.displayDate,
        confidence: assertion.confidence,
        evidenceLayer: assertion.evidenceLayer,
        sourceId: assertion.sourceId,
        entity: relation.source,
        contextKeys: [sourceKey, targetKey],
        relationId: relation.id,
      } satisfies TimelineEvent];
    });
  });
}

export function projectTimelineEvents(
  data: TimelineData,
  relations: ReadModelRelationIndex | undefined,
  searchItems: SearchItem[],
  focus: string | undefined,
): TimelineEvent[] {
  const contextKeys = contextEntityKeys(relations, focus);
  const entityEvents = focus
    ? data.events.filter((event) => contextKeys.has(`${event.kind}:${event.slug}`))
    : data.events;
  return [...entityEvents, ...relationTimelineEvents(data, relations, searchItems, focus)]
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
}
