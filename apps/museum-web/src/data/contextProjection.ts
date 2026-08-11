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

function relationTouches(relation: ReadModelRelation, key: string): boolean {
  return contextEndpointKey(relation.source) === key || contextEndpointKey(relation.target) === key;
}

function isFigurePlaceRelation(relation: ReadModelRelation, figureKey: string, placeKey: string): boolean {
  return (contextEndpointKey(relation.source) === figureKey && contextEndpointKey(relation.target) === placeKey)
    || (contextEndpointKey(relation.source) === placeKey && contextEndpointKey(relation.target) === figureKey);
}

function isFigureEventRelation(relation: ReadModelRelation, figureKey: string): boolean {
  return relationTouches(relation, figureKey)
    && ((relation.source.kind === "figure" && relation.target.kind === "event")
      || (relation.source.kind === "event" && relation.target.kind === "figure"));
}

function isEventPlaceRelation(relation: ReadModelRelation, eventKey: string): boolean {
  return relationTouches(relation, eventKey)
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
    if (isFigurePlaceRelation(relation, figureKey, placeKey)) {
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
  if (["active_in", "travelled_through", "located_in", "participated_in", "occurred_at", "route_connects"].includes(relation.relationType)) {
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
  return [...data.events, ...relationTimelineEvents(data, relations, searchItems, focus)]
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
}
