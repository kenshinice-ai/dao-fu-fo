import { describe, expect, it } from "vitest";
import { entityPath, withLang } from "./routing";

describe("museum routes", () => {
  it("preserves a query string while adding locale", () => {
    expect(withLang("/explore?view=graph", "en")).toBe("/explore?view=graph&lang=en");
  });

  it("maps entity kinds to stable canonical routes", () => {
    expect(entityPath("figure", "xuanzang", "zh-CN")).toBe("/figures/xuanzang?lang=zh-CN");
    expect(entityPath("museum_object", "pagoda", "en")).toBe("/objects/pagoda?lang=en");
  });
});
