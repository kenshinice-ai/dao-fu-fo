import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function waitForMuseum(page: Page) {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
}

test("language metadata and SPA focus follow navigation", async ({ page }) => {
  await page.goto("/?lang=zh-CN");
  await waitForMuseum(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page).toHaveTitle("道·儒·佛文明数字博物馆");
  await expect(page.locator("#main-content")).toHaveAttribute("tabindex", "-1");

  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/lang=en/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("Daoism, Confucianism & Buddhism Digital Museum");

  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page).toHaveURL(/\/explore\?lang=en/);
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.getByRole("link", { name: "Explore", exact: true })).toHaveAttribute("aria-current", "page");
});

test("Explore controls serialize a shareable state", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await page.getByRole("button", { name: "Time", exact: true }).click();
  await page.getByRole("combobox", { name: "Reading mode" }).selectOption("research");
  await page.getByRole("button", { name: "Dao", exact: true }).click();

  await expect(page).toHaveURL(/view=timeline/);
  await expect(page).toHaveURL(/mode=research/);
  await expect(page).toHaveURL(/traditions=confucianism%2Cbuddhism/);
  await expect(page.getByRole("button", { name: "Dao", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { name: "One era, different rhythms" })).toBeVisible();
});

test("search and entity deep links remain functional", async ({ page }) => {
  await page.goto("/search?lang=en");
  await waitForMuseum(page);
  await page.getByRole("textbox", { name: "Search figures, texts, concepts and places" }).fill("Xuanzang");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Xuanzang/);
  await expect(page.getByText("3 results for “xuanzang”")).toBeVisible();

  await page.getByRole("link", { name: "Xuanzang", exact: true }).click();
  await expect(page).toHaveURL(/\/figures\/xuanzang\?lang=en/);
  await expect(page.getByRole("heading", { level: 1, name: "Xuanzang" })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
});

test("390px layout has no horizontal overflow and keeps navigation at the bottom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?lang=zh-CN");
  await waitForMuseum(page);
  const metrics = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".primary-nav");
    const rect = nav?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      position: nav ? getComputedStyle(nav).position : null,
      navBottom: rect?.bottom ?? 0,
      viewportHeight: window.innerHeight,
    };
  });
  expect(metrics.overflow).toBe(false);
  expect(metrics.position).toBe("fixed");
  expect(metrics.navBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.navBottom).toBeGreaterThan(metrics.viewportHeight - 24);
});

test("reduced motion disables smooth scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?lang=en");
  await waitForMuseum(page);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
});

const accessibilityRoutes = [
  ["home", "/?lang=zh-CN"],
  ["museum", "/museum?lang=en"],
  ["exhibition", "/museum/changan-three-traditions?lang=zh-CN"],
  ["real map", "/explore?lang=en&view=map"],
  ["sacred cosmos", "/explore?lang=en&view=cosmos"],
  ["timeline", "/explore?lang=en&view=timeline&from=620&to=760"],
  ["graph", "/explore?lang=en&view=graph"],
  ["search", "/search?lang=en&q=Xuanzang"],
  ["research", "/research?lang=en"],
  ["methodology", "/methodology?lang=en"],
  ["figure", "/figures/xuanzang?lang=en"],
  ["passage", "/passages/form-is-emptiness?lang=zh-CN"],
  ["place", "/places/changan?lang=en"],
  ["not found", "/missing-route?lang=en"],
] as const;

for (const [name, route] of accessibilityRoutes) {
  test(`axe WCAG audit: ${name}`, async ({ page }) => {
    await page.goto(route);
    await waitForMuseum(page);
    await expect(page.locator("main")).toHaveCount(1);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
