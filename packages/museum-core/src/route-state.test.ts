import { describe, expect, it } from "vitest";
import { parseRouteState, serializeRouteState } from "./route-state";

describe("route state", () => {
  it("round-trips shareable exploration state", () => {
    const state = parseRouteState("?lang=en&view=graph&tab=relations&timeline=tradition&mode=research&from=581&to=907&traditions=daoism,buddhism&focus=figure:xuanzang&detail=figure:xuanzang&compare=figure:xuanzang,place:changan&graphType=figure-influence&depth=2");
    const roundTrip = parseRouteState(serializeRouteState(state));
    expect(roundTrip).toEqual(state);
    expect(roundTrip.atlasTab).toBe("relations");
    expect(roundTrip.timelineMode).toBe("tradition");
    expect(roundTrip.detail).toBe("figure:xuanzang");
  });

  it("normalises invalid values without inventing historical year zero", () => {
    const state = parseRouteState("?from=0&to=500&view=cosmos&mapLayer=real&traditions=unknown");
    expect(state.from).toBeUndefined();
    expect(state.view).toBe("cosmos");
    expect(state.mapLayer).toBe("cosmos");
    expect(state.traditions).toEqual(["daoism", "confucianism", "buddhism"]);
  });
});
