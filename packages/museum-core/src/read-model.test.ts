import { describe, expect, it } from "vitest";
import { createReadModelPaths, isPublicManifest, isPublishableArtifact } from "./read-model";

describe("read-model contract", () => {
  it("keeps static artifact paths in one place", () => {
    const paths = createReadModelPaths("/museum/data/v2/");
    expect(paths.entity("passage", "form-is-emptiness", "zh-CN")).toBe("/museum/data/v2/entities/passage/form-is-emptiness.zh-CN.json");
    expect(paths.relations("en")).toBe("/museum/data/v2/relations/en.json");
    expect(paths.audio("zh-CN")).toBe("/museum/data/v2/audio/zh-CN.json");
    expect(paths.sourceIndex("en")).toBe("/museum/data/v2/sources/en/index.json");
    expect(paths.manifest("quality-report")).toBe("/museum/data/v2/manifest/quality-report.json");
    expect(paths.sacredCosmos("daoism", "zh-CN")).toBe("/museum/data/v2/maps/cosmos/daoism.zh-CN.json");
    expect(paths.comparison("cross-era-figures", "en")).toBe("/museum/data/v2/comparisons/cross-era-figures.en.json");
    expect(paths.textReading("three-traditions-passage-reading", "zh-CN")).toBe("/museum/data/v2/text-readings/three-traditions-passage-reading.zh-CN.json");
  });

  it("does not treat preview artifacts as public", () => {
    expect(isPublishableArtifact({ publicationState: "preview", reviewStatus: "bilingual_reviewed" })).toBe(false);
    expect(isPublishableArtifact({ publicationState: "public", reviewStatus: "publishable" })).toBe(true);
    expect(isPublicManifest({ visibility: "preview" })).toBe(false);
    expect(isPublicManifest({ visibility: "public" })).toBe(true);
  });
});
