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
});
