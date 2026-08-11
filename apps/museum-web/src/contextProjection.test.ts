import { describe, expect, it } from "vitest";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import { connectedContextKeys, figurePlaceContexts, isPersonToPersonRelation, placeFigureContexts, projectTimelineEvents } from "./data/contextProjection";
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
    expect(projected).toHaveLength(2);
    expect(projected[0]).toMatchObject({ relationId: "relation:laozi-remembered-luoyang", year: 618, contextKeys: ["figure:laozi", "place:luoyang"] });
    expect(projected[0].title).toBe("Laozi → Luoyang");
  });

  it("keeps both endpoints in a shared context set", () => {
    expect([...connectedContextKeys(relations, "figure:laozi")]).toEqual(["figure:laozi", "place:luoyang"]);
  });

  it("projects a city into its directly related figures", () => {
    expect(placeFigureContexts(relations, "place:luoyang")).toMatchObject([
      { figureKey: "figure:laozi", connection: "direct" },
    ]);
  });

  it("projects a figure into map-ready place stops", () => {
    expect(figurePlaceContexts(relations, "figure:laozi")).toMatchObject([
      { placeKey: "place:luoyang", connection: "direct" },
    ]);
  });

  it("keeps real figure relations separate from reception and comparison edges", () => {
    const base = relations.items[0];
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "influenced" })).toBe(true);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "contemporary_with" })).toBe(true);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "received_by" })).toBe(false);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "deified_as" })).toBe(false);
    expect(isPersonToPersonRelation({ ...base, source: { kind: "figure", slug: "laozi" }, target: { kind: "figure", slug: "confucius" }, relationType: "comparative_parallel" })).toBe(false);
  });
});
