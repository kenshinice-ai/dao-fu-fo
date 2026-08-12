import { describe, expect, it } from "vitest";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import { connectedContextKeys, contextEntityKeys, contextRelations, figurePlaceContexts, isPersonToPersonRelation, placeFigureContexts, projectTimelineEvents, relationConnector } from "./data/contextProjection";
import type { SearchItem, TimelineData } from "./types";

const timeline: TimelineData = {
  locale: "en",
  title: "Test timeline",
  startYear: 581,
  endYear: 907,
  events: [{
    id: "entity-event",
    kind: "event",
    slug: "kaiyuan-institutional-expansion",
    year: 713,
    type: "range",
    tradition: "daoism",
    title: "Kaiyuan institutional expansion",
    summary: "A test entity event",
  }],
};

const searchItems: SearchItem[] = [
  { kind: "figure", slug: "laozi", title: "Laozi", context: "A test figure", tradition: "daoism" },
  { kind: "place", slug: "luoyang", title: "Luoyang", context: "A test place", tradition: "convergence" },
];

const relations = {
  locale: "en",
  items: [{
    id: "relation:laozi-remembered-luoyang",
    source: { kind: "figure", slug: "laozi" },
    target: { kind: "place", slug: "luoyang" },
    relationType: "remembered_in",
    label: "Remembered in Luoyang",
    summary: "A later-reception context",
    confidence: "medium",
    evidenceLayer: "historical_inferred",
    sourceIds: ["source:test"],
    temporalAssertions: [{
      predicate: "institutional_and_memory_scope",
      timeType: "range",
      startYear: 618,
      endYear: 907,
      displayDate: "618–907",
      confidence: "medium",
      evidenceLayer: "historical_inferred",
      sourceId: "source:test",
    }],
    qualifiers: {},
    publicationState: "preview",
    reviewStatus: "bilingual_reviewed",
  }],
} as unknown as ReadModelRelationIndex;

describe("context projections", () => {
  it("adds relation-time assertions only to a focused timeline", () => {
    expect(projectTimelineEvents(timeline, relations, searchItems, undefined)).toHaveLength(1);
    const projected = projectTimelineEvents(timeline, relations, searchItems, "figure:laozi");
    expect(projected).toHaveLength(1);
    expect(projected[0]).toMatchObject({ relationId: "relation:laozi-remembered-luoyang", year: 618, contextKeys: ["figure:laozi", "place:luoyang"] });
    expect(projected[0].title).toBe("Laozi → Luoyang");
  });

  it("keeps both endpoints in a shared context set", () => {
    expect([...connectedContextKeys(relations, "figure:laozi")]).toEqual(["figure:laozi", "place:luoyang"]);
  });

  it("projects every direct entity kind and bounded event bridges into the object panel", () => {
    const participatedEvent = {
      ...relations.items[0],
      id: "relation:laozi-participated-kaiyuan",
      source: { kind: "figure", slug: "laozi" },
      target: { kind: "event", slug: "kaiyuan-institutional-expansion" },
      relationType: "participated_in",
    } as (typeof relations.items)[number];
    const eventPlace = {
      ...relations.items[0],
      id: "relation:kaiyuan-occurred-luoyang",
      source: { kind: "event", slug: "kaiyuan-institutional-expansion" },
      target: { kind: "place", slug: "luoyang" },
      relationType: "occurred_at",
    } as (typeof relations.items)[number];
    const coParticipant = {
      ...relations.items[0],
      id: "relation:confucius-participated-kaiyuan",
      source: { kind: "figure", slug: "confucius" },
      target: { kind: "event", slug: "kaiyuan-institutional-expansion" },
      relationType: "participated_in",
    } as (typeof relations.items)[number];
    const index = { ...relations, items: [participatedEvent, eventPlace, coParticipant] };
    expect([...contextEntityKeys(index, "figure:laozi")]).toEqual([
      "figure:laozi",
      "event:kaiyuan-institutional-expansion",
      "place:luoyang",
      "figure:confucius",
    ]);
    expect(contextRelations(index, "figure:laozi").map((relation) => relation.id)).toEqual([
      "relation:laozi-participated-kaiyuan",
      "relation:kaiyuan-occurred-luoyang",
      "relation:confucius-participated-kaiyuan",
    ]);
  });

  it("keeps the global relation index complete when there is no focus", () => {
    expect(contextRelations(relations, undefined)).toEqual(relations.items);
  });

  it("projects a city into its directly related figures", () => {
    const activeRelation = {
      ...relations.items[0],
      id: "relation:laozi-active-luoyang",
      relationType: "active_in",
      label: "Active in Luoyang",
    } as (typeof relations.items)[number];
    expect(placeFigureContexts({ ...relations, items: [activeRelation] }, "place:luoyang")).toMatchObject([
      { figureKey: "figure:laozi", connection: "direct" },
    ]);
    expect(placeFigureContexts(relations, "place:luoyang")).toEqual([]);
  });

  it("projects a figure into map-ready place stops", () => {
    const activeRelation = {
      ...relations.items[0],
      id: "relation:laozi-active-luoyang",
      relationType: "active_in",
      label: "Active in Luoyang",
    } as (typeof relations.items)[number];
    expect(figurePlaceContexts({ ...relations, items: [activeRelation] }, "figure:laozi")).toMatchObject([
      { placeKey: "place:luoyang", connection: "direct" },
    ]);
    expect(figurePlaceContexts(relations, "figure:laozi")).toEqual([]);
  });

  it("bridges only participation events to event locations", () => {
    const eventPlace = {
      ...relations.items[0],
      id: "relation:event-occurred-luoyang",
      source: { kind: "event", slug: "kaiyuan-institutional-expansion" },
      target: { kind: "place", slug: "luoyang" },
      relationType: "occurred_at",
      label: "Occurred at Luoyang",
    } as (typeof relations.items)[number];
    const influencedEvent = {
      ...relations.items[0],
      id: "relation:laozi-influenced-kaiyuan",
      source: { kind: "figure", slug: "laozi" },
      target: { kind: "event", slug: "kaiyuan-institutional-expansion" },
      relationType: "influenced",
      label: "Influenced the event",
    } as (typeof relations.items)[number];
    expect(placeFigureContexts({ ...relations, items: [influencedEvent, eventPlace] }, "place:luoyang")).toEqual([]);

    const participatedEvent = { ...influencedEvent, id: "relation:laozi-participated-kaiyuan", relationType: "participated_in" } as (typeof relations.items)[number];
    expect(placeFigureContexts({ ...relations, items: [participatedEvent, eventPlace] }, "place:luoyang")).toMatchObject([
      { figureKey: "figure:laozi", connection: "event", bridge: { id: "relation:event-occurred-luoyang" } },
    ]);
  });

  it("keeps figure relations together while excluding deification and comparison edges", () => {
    const base = relations.items[0];
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "influenced" })).toBe(true);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "contemporary_with" })).toBe(true);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "received_by" })).toBe(true);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "deified_as" })).toBe(false);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "comparative_parallel" })).toBe(false);
  });

  it("keeps directional influence distinct from reciprocal contemporaneity", () => {
    const base = relations.items[0];
    expect(relationConnector({ ...base, relationType: "influenced" })).toBe("→");
    expect(relationConnector({ ...base, relationType: "contemporary_with" })).toBe("↔");
    expect(relationConnector({ ...base, relationType: "active_in" })).toBe("→");
  });
});
