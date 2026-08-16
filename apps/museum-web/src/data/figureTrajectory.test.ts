import { describe, expect, it } from "vitest";
import type { ReadModelRelation } from "@drf-museum/domain-schema";
import { deriveFigureTrajectory } from "./figureTrajectory";
import type { EntityData, MuseumMapData } from "../types";

function relation(
  id: string,
  source: ReadModelRelation["source"],
  target: ReadModelRelation["target"],
  relationType: ReadModelRelation["relationType"],
  overrides: Partial<ReadModelRelation> = {},
): ReadModelRelation {
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
    ...overrides,
  } as ReadModelRelation;
}

function place(slug: string, longitude = 100, latitude = 30): MuseumMapData["features"][number] {
  return {
    type: "Feature",
    id: `place:${slug}`,
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      kind: "place",
      slug,
      title: slug,
      placeReality: "real",
      coordinateConfidence: "documented",
      tradition: "convergence",
      summary: slug,
    },
  };
}

function route(slug: string, waypoints: string[]): EntityData {
  return {
    locale: "en",
    kind: "route",
    slug,
    title: slug,
    tradition: "convergence",
    evidence: "historical inference",
    timeLabel: "c. 600",
    shortSummary: "Route corridor",
    curatorialDescription: [],
    researchNote: "",
    keyFacts: [],
    related: [],
    sources: [],
    profile: { waypointSlugs: waypoints, certainty: "reconstructed" },
  };
}

const places = [place("birthplace", 95, 28), place("capital", 110, 35), place("memory-site", 120, 40), place("waypoint", 130, 45)];

describe("figure trajectory projection", () => {
  it("keeps direct place evidence, event bridges, and later memory separate", () => {
    const relations = [
      relation("birth", { kind: "figure", slug: "traveller" }, { kind: "place", slug: "birthplace" }, "born_in", {
        temporalAssertions: [{ predicate: "life", timeType: "exact", startYear: 580, displayDate: "580", confidence: "high", evidenceLayer: "historical_documented", sourceId: "source:test" }],
      }),
      relation("event-participation", { kind: "figure", slug: "traveller" }, { kind: "event", slug: "departure" }, "participated_in"),
      relation("event-place", { kind: "event", slug: "departure" }, { kind: "place", slug: "capital" }, "occurred_at"),
      relation("memory", { kind: "figure", slug: "traveller" }, { kind: "place", slug: "memory-site" }, "remembered_in"),
    ];
    const result = deriveFigureTrajectory({ figureKey: "figure:traveller", relations, places, routes: [] });

    expect(result.physical.map((item) => item.placeSlug)).toEqual(["birthplace", "capital"]);
    expect(result.physical.find((item) => item.placeSlug === "capital")?.role).toBe("event");
    expect(result.memory.map((item) => item.placeSlug)).toEqual(["memory-site"]);
    expect(result.mapped.map((item) => item.placeSlug)).toEqual(["birthplace", "capital"]);
  });

  it("uses an explicit figure-route relation and preserves route order as reconstructed", () => {
    const relations = [
      relation("figure-route", { kind: "figure", slug: "traveller" }, { kind: "route", slug: "traveller-corridor" }, "travelled_through"),
      relation("route-one", { kind: "route", slug: "traveller-corridor" }, { kind: "place", slug: "capital" }, "route_connects"),
      relation("route-two", { kind: "route", slug: "traveller-corridor" }, { kind: "place", slug: "waypoint" }, "route_connects"),
    ];
    const result = deriveFigureTrajectory({
      figureKey: "figure:traveller",
      relations,
      places,
      routes: [route("traveller-corridor", ["capital", "waypoint"])],
    });

    expect(result.routeKeys).toEqual(["route:traveller-corridor"]);
    expect(result.mapped.map((item) => item.placeSlug)).toEqual(["capital", "waypoint"]);
    expect(result.reconstructed.every((item) => item.reconstructed && !item.orderCertain)).toBe(true);
  });

  it("does not fabricate coordinates for an unresolved place or memory site", () => {
    const result = deriveFigureTrajectory({
      figureKey: "figure:traveller",
      relations: [
        relation("unknown-place", { kind: "figure", slug: "traveller" }, { kind: "place", slug: "sacred-mountain" }, "active_in"),
        relation("unknown-memory", { kind: "figure", slug: "traveller" }, { kind: "place", slug: "memory-site" }, "remembered_in"),
      ],
      places,
      routes: [],
    });

    expect(result.mapped).toHaveLength(0);
    expect(result.unresolved.map((item) => item.placeSlug)).toEqual(["sacred-mountain"]);
    expect(result.memory[0]?.coordinates).toBeDefined();
    expect(result.physical[0]?.coordinates).toBeUndefined();
  });
});
