import { describe, expect, it } from "vitest";
import { parseRouteState, serializeRouteState } from "./route-state";

describe("route state", () => {
  it("round-trips shareable exploration state", () => {
    const state = parseRouteState("?lang=en&view=graph&tab=relations&timeline=tradition&mode=research&from=581&to=907&traditions=daoism,buddhism&focus=figure:xuanzang&scope=place:changan&detail=figure:xuanzang&compare=figure:xuanzang,place:changan&graphType=figure-influence&depth=2&q=xuanzang&layers=places,trajectories&zoom=figure&graphTier=major");
    const roundTrip = parseRouteState(serializeRouteState(state));
    expect(roundTrip).toEqual(state);
    expect(roundTrip.atlasTab).toBe("relations");
    expect(roundTrip.timelineMode).toBe("tradition");
    expect(roundTrip.detail).toBe("figure:xuanzang");
    expect(roundTrip).not.toHaveProperty("scope");
    expect(roundTrip.query).toBe("xuanzang");
    expect(roundTrip.mapLayers).toEqual(["places", "trajectories"]);
    expect(roundTrip.zoomLevel).toBe("figure");
    expect(roundTrip.graphTier).toBe("major");
  });

  it("normalises invalid values without inventing historical year zero", () => {
    const state = parseRouteState("?from=0&to=500&view=cosmos&mapLayer=real&traditions=unknown");
    expect(state.from).toBeUndefined();
    expect(state.view).toBe("cosmos");
    expect(state.mapLayer).toBe("cosmos");
    expect(state.traditions).toEqual(["daoism", "confucianism", "buddhism"]);
    expect(state.graphTier).toBe("group");
  });

  it("defaults graph tier independently from map zoom", () => {
    const state = parseRouteState("?zoom=all");
    expect(state.zoomLevel).toBe("all");
    expect(state.graphTier).toBe("group");
    expect(parseRouteState("?graphTier=era").graphTier).toBe("era");
    expect(parseRouteState("?graphTier=group").graphTier).toBe("group");
    expect(parseRouteState("?graphTier=major").graphTier).toBe("major");
    expect(parseRouteState("?graphTier=all").graphTier).toBe("all");
    expect(parseRouteState("?graphTier=invalid").graphTier).toBe("group");
  });

  it("round-trips graph tier while preserving focus and range", () => {
    const state = parseRouteState("?focus=figure:xuanzang&from=629&to=645&zoom=era&graphTier=all");
    const roundTrip = parseRouteState(serializeRouteState(state));
    expect(roundTrip.focus).toBe("figure:xuanzang");
    expect(roundTrip.from).toBe(629);
    expect(roundTrip.to).toBe(645);
    expect(roundTrip.zoomLevel).toBe("era");
    expect(roundTrip.graphTier).toBe("all");
  });

  it("clears graph tier back to the default without changing map zoom or focus", () => {
    const state = parseRouteState("?focus=figure:xuanzang&zoom=all&graphTier=major");
    const cleared = { ...state, graphTier: "group" as const };
    const roundTrip = parseRouteState(serializeRouteState(cleared));
    expect(roundTrip.focus).toBe("figure:xuanzang");
    expect(roundTrip.zoomLevel).toBe("all");
    expect(roundTrip.graphTier).toBe("group");
    expect(serializeRouteState(cleared)).not.toContain("graphTier");
  });

  it("derives the entity panel from a focus when the URL does not provide a tab", () => {
    expect(parseRouteState("?focus=place:qufu").atlasTab).toBe("places");
    expect(parseRouteState("?focus=event:yijing-studies-nalanda").atlasTab).toBe("events");
    expect(parseRouteState("?focus=figure:yijing").atlasTab).toBe("figures");
  });

  it("preserves an explicit relation panel for a focused figure", () => {
    expect(parseRouteState("?tab=relations&focus=figure:confucius").atlasTab).toBe("relations");
  });

  it("keeps an explicitly selected default panel when it differs from the focus panel", () => {
    const placeInFigurePanel = { ...parseRouteState("?focus=place:changan"), atlasTab: "figures" as const };
    const serialized = serializeRouteState(placeInFigurePanel);
    expect(serialized).toContain("tab=figures");
    expect(parseRouteState(serialized)).toEqual(placeInFigurePanel);
  });
});
