import { describe, expect, it } from "vitest";
import type { ReadModelRelation } from "@drf-museum/domain-schema";
import { buildRelationshipGraph, graphTierForZoomLevel, zoomLevelForGraphTier } from "./relationshipGraph";
import type { SearchItem } from "../types";

const searchItems: SearchItem[] = [
  { kind: "figure", slug: "a", title: "甲", context: "A", tradition: "daoism" },
  { kind: "figure", slug: "b", title: "乙", context: "B", tradition: "confucianism" },
  { kind: "figure", slug: "c", title: "丙", context: "C", tradition: "buddhism" },
  { kind: "figure", slug: "d", title: "丁", context: "D", tradition: "daoism" },
  { kind: "place", slug: "luoyang", title: "洛阳", context: "Place", tradition: "convergence" },
];

function relation(id: string, source: ReadModelRelation["source"], target: ReadModelRelation["target"], relationType: ReadModelRelation["relationType"]): ReadModelRelation {
  return {
    id: `relation:${id}`,
    source,
    target,
    relationType,
    label: relationType,
    summary: `${source.slug} ${relationType} ${target.slug}`,
    confidence: "medium",
    evidenceLayer: "historical_inferred",
    sourceIds: ["source:test"],
    temporalAssertions: [],
  } as unknown as ReadModelRelation;
}

const aa = relation("aa", { kind: "figure", slug: "a" }, { kind: "figure", slug: "b" }, "influenced");
const bc = relation("bc", { kind: "figure", slug: "b" }, { kind: "figure", slug: "c" }, "contemporary_with");
const cd = relation("cd", { kind: "figure", slug: "c" }, { kind: "figure", slug: "d" }, "comparative_parallel");
const received = relation("received", { kind: "figure", slug: "a" }, { kind: "figure", slug: "c" }, "received_by");
const aPlace = relation("a-place", { kind: "figure", slug: "a" }, { kind: "place", slug: "luoyang" }, "active_in");
const cPlace = relation("c-place", { kind: "figure", slug: "c" }, { kind: "place", slug: "luoyang" }, "active_in");

describe("relationship graph projection", () => {
  it("keeps person edges separate from location edges", () => {
    const model = buildRelationshipGraph({
      relations: [aa, bc, cd, aPlace, cPlace],
      scopeRelations: [aa, bc, cd, aPlace, cPlace],
      searchItems,
      traditions: ["daoism", "confucianism", "buddhism"],
      tier: "all",
      locale: "zh-CN",
    });

    expect(model.scopedPeople).toBe(4);
    expect(model.nodes.every((node) => node.kind === "person")).toBe(true);
    expect(model.edges).toHaveLength(2);
    expect(model.relationRows.every((item) => item.source.kind === "figure" && item.target.kind === "figure")).toBe(true);
  });

  it("uses a place context to scope a complete interaction subgraph", () => {
    const model = buildRelationshipGraph({
      relations: [aa, bc, cd, aPlace, cPlace],
      scopeRelations: [aPlace, cPlace],
      searchItems,
      focus: "place:luoyang",
      traditions: ["daoism", "confucianism", "buddhism"],
      tier: "all",
      locale: "zh-CN",
    });

    expect(model.scopedPeople).toBe(2);
    expect(model.nodes.map((node) => node.id).sort()).toEqual(["figure:a", "figure:c"]);
    expect(model.edges).toHaveLength(0);
  });

  it("renders later reception as its own edge semantic", () => {
    const model = buildRelationshipGraph({
      relations: [received],
      scopeRelations: [received],
      searchItems,
      traditions: ["daoism", "confucianism", "buddhism"],
      tier: "all",
      locale: "zh-CN",
    });

    expect(model.edges[0]?.tone).toBe("reception");
  });

  it("preserves opposite directed relations instead of merging them", () => {
    const reverse = relation("ba", { kind: "figure", slug: "b" }, { kind: "figure", slug: "a" }, "influenced");
    const model = buildRelationshipGraph({
      relations: [aa, reverse],
      scopeRelations: [aa, reverse],
      searchItems,
      traditions: ["daoism", "confucianism", "buddhism"],
      tier: "all",
      locale: "zh-CN",
    });

    expect(model.edges).toHaveLength(2);
    expect(new Set(model.edges.map((edge) => `${edge.source}->${edge.target}`))).toEqual(new Set(["figure:a->figure:b", "figure:b->figure:a"]));
  });

  it("auto-expands a focused aggregate that would otherwise have no cross-group edge", () => {
    const sameTraditionRelation = relation("ad", { kind: "figure", slug: "a" }, { kind: "figure", slug: "d" }, "influenced");
    const model = buildRelationshipGraph({
      relations: [sameTraditionRelation],
      scopeRelations: [sameTraditionRelation],
      searchItems,
      focus: "figure:a",
      traditions: ["daoism", "confucianism", "buddhism"],
      tier: "group",
      locale: "zh-CN",
    });

    expect(model.effectiveTier).toBe("major");
    expect(model.edges).toHaveLength(1);
    expect(model.nodes.every((node) => node.kind === "person")).toBe(true);
  });

  it("maps the existing URL zoom state to graph tiers without adding a second route state", () => {
    expect(graphTierForZoomLevel("era")).toBe("era");
    expect(graphTierForZoomLevel("region")).toBe("group");
    expect(graphTierForZoomLevel("figure")).toBe("major");
    expect(zoomLevelForGraphTier("all")).toBe("all");
    expect(zoomLevelForGraphTier("group")).toBe("region");
  });
});
