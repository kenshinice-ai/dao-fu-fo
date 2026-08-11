import { describe, expect, it } from "vitest";
import { StaticMuseumDataSource } from "./data-source";

describe("StaticMuseumDataSource", () => {
  it("validates profile data at the adapter boundary", async () => {
    const source = new StaticMuseumDataSource("/data/v2", async (path) => ({
      id: "dao-ru-fo", locale: "zh-CN", contentVersion: "2026.08.alpha.1", releaseStage: "alpha",
      capabilities: ["realMap"], topTraditions: ["daoism", "confucianism", "buddhism"],
      title: path, shortTitle: "道·儒·佛", tagline: "三条文明道路", description: "测试数据源契约。",
    }));
    const profile = await source.getProfile("zh-CN");
    expect(profile.title).toBe("/data/v2/profile/zh-CN.json");
  });

  it("rejects malformed static data instead of leaking it into pages", async () => {
    const source = new StaticMuseumDataSource("/data/v2", async () => ({ locale: "zh-CN", items: [{ title: "missing identity" }] }));
    await expect(source.getSearchIndex("zh-CN")).rejects.toThrow();
  });

  it("validates comparison read models at the adapter boundary", async () => {
    const source = new StaticMuseumDataSource("/data/v2", async (path) => ({
      schemaVersion: "1.0", locale: "en", slug: "cross-era-figures", title: path,
      question: "A comparison question", disclaimer: "A comparison disclaimer",
      entities: [
        { key: "figure:laozi", kind: "figure", slug: "laozi", title: "Laozi", tradition: "daoism", evidence: "traditional_account", timeLabel: "Ancient", summary: "A figure", sourceIds: ["source:test"] },
        { key: "figure:confucius", kind: "figure", slug: "confucius", title: "Confucius", tradition: "confucianism", evidence: "historical_inferred", timeLabel: "Ancient", summary: "A figure", sourceIds: ["source:test"] },
      ],
      axes: [{ id: "time", label: "Time", description: "Time layer", cells: [{ entityKey: "figure:laozi", status: "recorded", value: "Ancient", details: [], sourceIds: ["source:test"] }, { entityKey: "figure:confucius", status: "not_recorded", value: "Not recorded", details: [], sourceIds: [] }] }],
      directRelations: [], bridges: [],
    }));
    const comparison = await source.getComparison("cross-era-figures", "en");
    expect(comparison.entities).toHaveLength(2);
    expect(comparison.locale).toBe("en");
  });

  it("validates text reading models at the adapter boundary", async () => {
    const source = new StaticMuseumDataSource("/data/v2", async (path) => ({
      schemaVersion: "1.0", locale: "en", slug: "three-traditions-passage-reading", title: path,
      question: "A reading question", disclaimer: "A reading disclaimer",
      readings: [
        {
          key: "passage:dao-that-can-be-spoken", kind: "passage", slug: "dao-that-can-be-spoken", title: "The Dao that can be spoken",
          tradition: "daoism", evidence: "historical_inferred", timeLabel: "Received text", sourceIds: ["source:test"],
          text: { key: "text:daodejing", slug: "daodejing", title: "Daodejing", summary: "A text" },
          version: { key: "text_version:daodejing-received", slug: "daodejing-received", title: "Received Daodejing", versionKind: "edition", languageCode: "lzh", citationLabel: "Test edition", rightsStatus: "unknown" },
          passage: { title: "The Dao that can be spoken", passageKind: "classic_saying", locatorOriginal: "Chapter 1", locatorNormalised: "Daodejing 1", originalText: "道可道，非常道。", punctuatedText: "道可道，非常道。", modernZh: "可说出的道不是真常之道。", translationEn: "The Dao that can be spoken is not the constant Dao.", ritualSensitivity: "public_textual", attributionStatus: "attributed_saying" },
        },
        {
          key: "passage:learn-and-practice", kind: "passage", slug: "learn-and-practice", title: "Learn and practise",
          tradition: "confucianism", evidence: "historical_inferred", timeLabel: "Received text", sourceIds: ["source:test"],
          text: { key: "text:analects", slug: "analects", title: "Analects", summary: "A text" },
          version: { key: "text_version:analects-received", slug: "analects-received", title: "Received Analects", versionKind: "edition", languageCode: "lzh", citationLabel: "Test edition", rightsStatus: "unknown" },
          passage: { title: "Learn and practise", passageKind: "classic_saying", locatorOriginal: "Xue Er", locatorNormalised: "Analects 1.1", originalText: "学而时习之。", punctuatedText: "学而时习之。", modernZh: "学习并不断实践。", translationEn: "To learn and practise in season.", ritualSensitivity: "public_textual", attributionStatus: "recorded_by_others" },
        },
      ],
      axes: [{ id: "locator", label: "Locator", description: "A locator", cells: [{ passageKey: "passage:dao-that-can-be-spoken", status: "recorded", value: "Daodejing 1", details: [], sourceIds: ["source:test"] }, { passageKey: "passage:learn-and-practice", status: "recorded", value: "Analects 1.1", details: [], sourceIds: ["source:test"] }] }],
      contextRelations: [],
    }));
    const reading = await source.getTextReading("three-traditions-passage-reading", "en");
    expect(reading.readings).toHaveLength(2);
    expect(reading.readings[0].version.citationLabel).toBe("Test edition");
    expect(reading.locale).toBe("en");
  });
});
