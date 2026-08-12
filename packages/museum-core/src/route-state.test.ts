import { describe, expect, it } from "vitest";
import { parseRouteState, serializeRouteState } from "./route-state";

describe("route state", () => {
  it("round-trips shareable exploration state", () => {
    const state = parseRouteState("?lang=en&view=graph&tab=relations&timeline=tradition&mode=research&from=581&to=907&traditions=daoism,buddhism&focus=figure:xuanzang&scope=place:changan&detail=figure:xuanzang&compare=figure:xuanzang,place:changan&graphType=figure-influence&depth=2&q=xuanzang&layers=places,trajectories&zoom=figure");
    const roundTrip = parseRouteState(serializeRouteState(state));
    expect(roundTrip).toEqual(state);
    expect(roundTrip.atlasTab).toBe("relations");
    expect(roundTrip.timelineMode).toBe("tradition");
    expect(roundTrip.detail).toBe("figure:xuanzang");
    expect(roundTrip.scope).toBe("place:changan");
    expect(roundTrip.query).toBe("xuanzang");
    expect(roundTrip.mapLayers).toEqual(["places", "trajectories"]);
    expect(roundTrip.zoomLevel).toBe("figure");
  });

  it("normalises invalid values without inventing historical year zero", () => {
    const state = parseRouteState("?from=0&to=500&view=cosmos&mapLayer=real&traditions=unknown");
    expect(state.from).toBeUndefined();
    expect(state.view).toBe("cosmos");
    expect(state.mapLayer).toBe("cosmos");
    expect(state.traditions).toEqual(["daoism", "confucianism", "buddhism"]);
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
