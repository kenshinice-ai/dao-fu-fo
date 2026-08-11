import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function waitForMuseum(page: Page) {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
}

test("public RC2 keeps promoted textual and figure gateways scoped", async ({ page }) => {
  test.skip(process.env.DRF_WEB_VISIBILITY !== "public", "Public RC-only smoke test");

  await page.goto("/passages/humans-follow-earth?lang=en");
  await waitForMuseum(page);
  await expect(page.getByRole("heading", { level: 1, name: "Humans follow earth; earth follows heaven" })).toBeVisible();
  await page.getByRole("link", { name: "Open three-tradition passage reading", exact: true }).click();
  await expect(page).toHaveURL(/\/text-readings\?set=three-traditions-passage-reading&lang=en/);
  await expect(page.getByRole("heading", { level: 1, name: "Three-tradition passage reading: wording, versions and transmission" })).toBeVisible();
  await expect(page.locator(".text-reading-card")).toHaveCount(3);

  await page.goto("/compare?lang=en&set=cross-era-figures");
  await waitForMuseum(page);
  await expect(page.getByRole("heading", { level: 1, name: "Cross-era figures: source, transmission and later reception" })).toBeVisible();
  await expect(page.locator(".comparison-entity-card")).toHaveCount(3);
  await expect(page.locator(".comparison-entity-card").filter({ hasText: "Laozi" }).getByRole("link", { name: "Laozi (Li Er)", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xuanzang", exact: true })).toHaveCount(0);

  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await expect(page.locator("#historical-map")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

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
  await expect(page.getByRole("heading", { name: "One space-time, different rhythms" })).toBeVisible();
});

test("timeline defaults to the full historical read model", async ({ page }) => {
  await page.goto("/explore?lang=en&view=timeline");
  await waitForMuseum(page);

  await expect(page.locator(".timeline-canvas .canvas-title")).toContainText("Dao–Ru–Fo historical space-time");
  await expect(page.getByText("600 BCE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One space-time, different rhythms" })).toBeVisible();
});

test("shared context focus connects a figure to events and updates the URL", async ({ page }) => {
  await page.goto("/explore?lang=en&view=timeline&focus=figure%3Axuanzang");
  await waitForMuseum(page);

  await expect(page.getByRole("heading", { name: "Focused on: Xuanzang" })).toBeVisible();
  await expect(page.locator(".context-relation-list").getByText("Participated in the departure west", { exact: true })).toBeVisible();
  expect(await page.locator(".timeline-event.is-focused").count()).toBeGreaterThan(2);

  const departureRelation = page.locator(".context-relation-list li").filter({ hasText: "Participated in the departure west" });
  await departureRelation.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page).toHaveURL(/focus=event%3Axuanzang-departs-changan/);
  await expect(page.getByRole("heading", { name: "Focused on: Xuanzang departs Chang'an" })).toBeVisible();
  expect(await page.locator(".timeline-event.is-focused").count()).toBeGreaterThan(0);
});

test("shared context offers the second and third featured figure dossiers", async ({ page }) => {
  await page.goto("/explore?lang=zh-CN&view=graph&focus=figure%3Asima-chengzhen");
  await waitForMuseum(page);

  await expect(page.getByRole("heading", { name: "正在聚焦：司马承祯" })).toBeVisible();
  await expect(page.getByRole("region", { name: "正在聚焦：司马承祯" }).locator(".context-relation-list").getByText("处于开元制度扩展语境", { exact: true })).toBeVisible();
  await expect(page.locator(".graph-node.is-focused").filter({ hasText: "司马承祯" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "孔颖达", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "孔颖达", exact: true }).click();
  await expect(page).toHaveURL(/focus=figure%3Akong-yingda/);
  await expect(page.getByRole("heading", { name: "正在聚焦：孔颖达" })).toBeVisible();
  await expect(page.getByRole("region", { name: "正在聚焦：孔颖达" }).locator(".context-relation-list").getByText("参与《五经正义》编纂工程", { exact: true })).toBeVisible();
});

test("shared context picker follows all indexed figures", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Ayan-shigu");
  await waitForMuseum(page);

  const figureTitles = [
    "Ashoka",
    "Cheng Xuanying",
    "Confucius (Kong Qiu)",
    "Dao'an",
    "Faxian",
    "Fu Xi",
    "Ge Hong",
    "Huangdi (Yellow Emperor)",
    "Jizang",
    "Kong Yingda",
    "Kumārajīva",
    "Laozi (Li Er)",
    "Li Shimin",
    "Liang Wudi (Xiao Yan)",
    "Mencius (Meng Ke)",
    "Nāgārjuna",
    "Nüwa",
    "Pangu",
    "Śākyamuni Buddha (Gautama)",
    "Sima Chengzhen",
    "Taishang Laojun",
    "Tao Hongjing",
    "Huiyuan",
    "Xi Wangmu (Queen Mother of the West)",
    "Wu Zhao (Wu Zetian)",
    "Yixing (Zhang Sui)",
    "Zhang Daoling",
    "Zhuangzi (Zhuang Zhou)",
    "Xuanzang",
    "Yan Shigu",
    "Yijing",
    "Zhu Xi",
  ];
  for (const title of figureTitles) {
    await expect(page.getByRole("button", { name: title, exact: true })).toBeVisible();
  }
});

test("cross-era figure entries keep traditional, speech and reception layers visible", async ({ page }) => {
  await page.goto("/explore?lang=en&view=graph&focus=figure%3Alaozi");
  await waitForMuseum(page);

  await expect(page.getByRole("heading", { name: "Focused on: Laozi (Li Er)" })).toBeVisible();
  const laoziContext = page.getByRole("region", { name: "Focused on: Laozi (Li Er)" });
  await expect(laoziContext.locator(".context-relation-list").getByText("Traditionally attributed to Laozi", { exact: true })).toBeVisible();
  await expect(laoziContext.locator(".context-relation-list").getByText("Remembered through Tang Daoist institutions", { exact: true })).toBeVisible();
  await expect(page.locator(".graph-node.is-focused").filter({ hasText: "Laozi (Li Er)" })).toHaveCount(1);

  await page.getByRole("button", { name: "Śākyamuni Buddha (Gautama)", exact: true }).click();
  await expect(page).toHaveURL(/focus=figure%3Asakyamuni/);
  await expect(page.getByRole("heading", { name: "Focused on: Śākyamuni Buddha" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Focused on: Śākyamuni Buddha" }).locator(".context-relation-list").getByText("Preserved as Śākyamuni's teaching through transmission", { exact: true })).toBeVisible();
});

test("real map supports zoom, pan and place-node navigation", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);

  const map = page.locator("#historical-map");
  await expect(map).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spatial links derived from route entities" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xuanzang's western pilgrimage route", exact: true })).toBeVisible();

  const leaflet = map.locator(".civilisation-map-leaflet");
  const beforeZoom = await map.getAttribute("data-map-zoom");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(() => map.getAttribute("data-map-zoom")).not.toBe(beforeZoom);
  const beforePan = await map.getAttribute("data-map-center");
  await leaflet.scrollIntoViewIfNeeded();
  const mapBox = await leaflet.boundingBox();
  if (!mapBox) throw new Error("Historical map did not have a layout box");
  await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(mapBox.x + mapBox.width / 2 + 80, mapBox.y + mapBox.height / 2 + 32);
  await page.mouse.up();
  await expect.poll(() => map.getAttribute("data-map-center")).not.toBe(beforePan);

  await page.getByRole("link", { name: "Open place: Chang'an" }).click();
  await expect(page).toHaveURL(/\/places\/changan\?lang=en/);
  await expect(page.getByRole("heading", { level: 1, name: "Chang'an" })).toBeVisible();
});

test("map city selection opens figures, trajectories and a restorable relation network", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);

  await page.getByRole("button", { name: "Focus place: Chang'an", exact: true }).click();
  await expect(page).toHaveURL(/focus=place%3Achangan/);
  const cityPanel = page.locator("[data-city-people]");
  await expect(cityPanel).toBeVisible();
  await expect(cityPanel.getByRole("heading", { name: "Chang'an", exact: true })).toBeVisible();
  expect(await cityPanel.getByRole("listitem").count()).toBeGreaterThanOrEqual(10);

  await cityPanel.getByRole("button", { name: "Xuanzang", exact: true }).click();
  await expect(page).toHaveURL(/focus=figure%3Axuanzang/);
  const trajectoryPanel = page.locator("[data-figure-trajectory]");
  await expect(trajectoryPanel).toBeVisible();
  await expect(trajectoryPanel.getByText("3 spatial stops", { exact: true })).toBeVisible();
  await expect(trajectoryPanel.locator(".relation-network")).toBeVisible();

  await trajectoryPanel.getByRole("button", { name: "Focus Chang'an", exact: true }).click();
  await expect(page).toHaveURL(/focus=place%3Achangan/);
  await page.reload();
  await expect(page.locator("[data-city-people]")).toBeVisible();
});

test("map keeps city switching and event context available after a selection", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);

  await page.getByRole("button", { name: "Focus place: Chang'an", exact: true }).click();
  await expect(page.locator("[data-city-people]")).toBeVisible();

  // The full place index stays available, so a second city can be selected
  // without clearing the first city's dossier state.
  await page.getByRole("button", { name: "Focus place: Luoyang", exact: true }).click();
  await expect(page).toHaveURL(/focus=place%3Aluoyang/);
  const luoyangPanel = page.locator("[data-city-people]");
  await expect(luoyangPanel.getByRole("heading", { name: "Luoyang", exact: true })).toBeVisible();
  const cityEvents = luoyangPanel.locator("[data-city-events]");
  await expect(cityEvents).toBeVisible();

  await cityEvents.locator("button").first().click();
  await expect(page).toHaveURL(/focus=event%3A/);
  const eventPanel = page.locator("[data-event-context]");
  await expect(eventPanel).toBeVisible();
  await expect(eventPanel.locator(".relation-network")).toBeVisible();

  await eventPanel.locator(".map-context-event-list button").first().click();
  await expect(page).toHaveURL(/focus=place%3A/);
  await expect(page.locator("[data-city-people]")).toBeVisible();
});

test("timeline event nodes reverse-focus the map and preserve the target in the URL", async ({ page }) => {
  await page.goto("/explore?lang=en&view=timeline");
  await waitForMuseum(page);

  await page.locator('[data-timeline-focus="event:xuanzang-departs-changan"]').click();
  await expect(page).toHaveURL(/focus=event%3Axuanzang-departs-changan/);
  await expect(page.locator("#historical-map")).toBeVisible();

  await page.goto("/explore?lang=en&view=timeline");
  await page.locator(".timeline-event-select").filter({ hasText: "Xuanzang departs Chang'an" }).click();
  await expect(page).toHaveURL(/focus=event%3Axuanzang-departs-changan/);
});

test("sacred cosmos is loaded from the compiler read model", async ({ page }) => {
  await page.goto("/explore?lang=en&view=cosmos");
  await waitForMuseum(page);

  await expect(page.getByText("Dao–Ru–Fo symbolic space · not a geographic map", { exact: true })).toBeVisible();
  await expect(page.locator(".cosmos-node")).toHaveCount(3);
  await expect(page.locator(".cosmos-figure-node")).toHaveCount(7);
  await expect(page.locator(".cosmos-place-node")).toHaveCount(5);
  await expect(page.locator(".cosmos-thread")).toHaveCount(13);
  await expect(page.getByText("3 tradition nodes, 7 symbolic figure nodes, 5 sacred-space nodes and 13 symbolic/comparative edges are shown from the compiler read model.", { exact: true })).toBeVisible();
  await expect(page.getByText("A symbolic space of tradition nodes, comparative relations and a curatorial encounter point; it uses no real-world coordinates.", { exact: true })).toBeVisible();
});

test("relation focus filters the map and adds relation-time context", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Alaozi");
  await waitForMuseum(page);

  await expect.poll(() => page.locator("[data-map-node]").count()).toBeGreaterThan(1);
  await expect(page.getByRole("link", { name: "Open place: Luoyang", exact: true })).toBeVisible();

  await page.goto("/explore?lang=en&view=timeline&focus=figure%3Alaozi");
  await waitForMuseum(page);
  await expect(page.locator(".timeline-list").getByText("Laozi (Li Er) → Chang'an Daoist monastic network", { exact: true })).toBeVisible();
});

test("map shares the historical time window with the timeline", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&from=-600&to=-500");
  await waitForMuseum(page);

  await expect.poll(() => page.locator("[data-map-node]").count()).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: "Open place: Sarnath", exact: true })).toBeVisible();
  await expect(page.locator(".civilisation-map-caption")).toContainText("-600–-500");
});

test("homepage exposes the expanded figure gateways", async ({ page }) => {
  await page.goto("/?lang=zh-CN");
  await waitForMuseum(page);

  await expect(page.locator(".home-atlas-map")).toBeVisible();
  await expect(page.getByRole("button", { name: "放大地图", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开完整地图", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "人物、空间与时间" })).toBeVisible();
  await expect(page.locator(".figure-spotlight-card")).toHaveCount(32);
  await expect(page.locator(".figure-spotlight-card").filter({ hasText: "老子（李耳）" })).toBeVisible();
  await expect(page.locator(".figure-spotlight-card").filter({ hasText: "孔子（孔丘）" })).toBeVisible();
  await expect(page.locator(".figure-spotlight-card").filter({ hasText: "释迦牟尼佛" })).toBeVisible();
  await expect(page.getByText("当前收录 32 位人物，三种传统；空间待核处明确保留证据边界。", { exact: true })).toBeVisible();
});

test("every current figure map gateway resolves to mapped or explicitly pending geography", async ({ page }) => {
  await page.goto("/?lang=en");
  await waitForMuseum(page);

  const gatewayHrefs = await page.locator(".home-atlas-figure-card a[href*='focus=figure:']").evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute("href")).filter((href): href is string => Boolean(href)),
  );
  expect(gatewayHrefs).toHaveLength(32);
  for (let index = 0; index < gatewayHrefs.length; index += 1) {
    const href = gatewayHrefs[index];
    if (href.includes("view=cosmos")) {
      await page.goto(href);
      await waitForMuseum(page);
      await expect(page.locator(".cosmos-canvas")).toBeVisible();
      await expect.poll(() => page.locator(".cosmos-figure-node.is-focused, .cosmos-place-node.is-focused").count()).toBeGreaterThan(0);
      continue;
    }
    await page.goto(href);
    await waitForMuseum(page);
    const map = page.locator("#historical-map");
    await expect(map).toBeVisible();
    await expect.poll(() => map.locator("[data-map-node]").count()).toBeGreaterThan(0);
    const focusState = await map.getAttribute("data-map-focus-state");
    expect(["mapped", "position-pending"]).toContain(focusState);
    if (focusState === "position-pending") await expect(map.locator("[data-map-position-status]")).toBeVisible();
  }
});

test("entity dossiers expose historicity, relation qualifiers and source jumps", async ({ page }) => {
  await page.goto("/figures/laozi?lang=en");
  await waitForMuseum(page);

  await expect(page.getByText("Historicity", { exact: true })).toBeVisible();
  await expect(page.locator(".entity-facts").getByText("contested", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Figures, events, places and later reception" })).toBeVisible();
  await expect(page.getByText("Remembered through Tang Daoist institutions", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "source:shiji-laozi-biography", exact: true }).first().click();
  await expect(page).toHaveURL(/\/research\?source=source%3Ashiji-laozi-biography&lang=en/);
  await expect(page.getByRole("heading", { name: /Focused source: Records of the Historian/ })).toBeVisible();
});

test("cross-era comparison keeps multi-dimensional evidence and shared bridges visible", async ({ page }) => {
  await page.goto("/compare?lang=en&set=cross-era-figures");
  await waitForMuseum(page);

  await expect(page.getByRole("heading", { name: "Cross-era figures: source, transmission and later reception" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Figures, space, time, speech and later impact" })).toBeVisible();
  await expect(page.locator(".comparison-entity-card")).toHaveCount(3);
  await expect(page.locator(".comparison-axis")).toHaveCount(9);
  await expect(page.getByRole("region", { name: "Speech and transmission" }).getByText("Preserved as Śākyamuni's teaching through transmission → This is the noble truth of suffering · recorded_by_others", { exact: true })).toBeVisible();
  await expect(page.getByText("Confucius visits Zhou to ask Laozi about rites", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Laozi \(Li Er\)/ }).click();
  await expect(page).toHaveURL(/entities=figure%3Aconfucius%2Cfigure%3Asakyamuni/);
  await expect(page.locator(".comparison-entity-card")).toHaveCount(2);
});

test("text reading keeps passage, version, attribution and source layers side by side", async ({ page }) => {
  await page.goto("/text-readings?lang=en&set=three-traditions-passage-reading");
  await waitForMuseum(page);

  await expect(page.getByRole("heading", { name: "Three-tradition passage reading: wording, versions and transmission" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Return from each passage to its text and version" })).toBeVisible();
  await expect(page.locator(".text-reading-card")).toHaveCount(3);
  await expect(page.locator(".text-reading-axis")).toHaveCount(7);
  await expect(page.getByRole("link", { name: "Received text of the Daodejing", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Locator" }).getByText("Daodejing 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Attribution" }).getByText("Preserved traditionally as a saying of Laozi → Laozi (Li Er)", { exact: true })).toBeVisible();
  const relationContext = page.getByRole("region", { name: "A passage is not a context-free quote" });
  await expect(relationContext).toBeVisible();
  await expect(relationContext.getByText("Quoted from a specific version", { exact: true }).first()).toBeVisible();
  const reviewEvidence = page.locator(".text-reading-review").first();
  await reviewEvidence.locator("summary").click();
  await expect(reviewEvidence.getByText("Fact: passed · codex:authorized-rc-reviewer", { exact: false }).first()).toBeVisible();
  await expect(reviewEvidence.getByText("Accessibility: passed · codex:authorized-rc-reviewer", { exact: false }).first()).toBeVisible();
});

test("same-text version reading keeps translation wording and review evidence visible", async ({ page }) => {
  await page.goto("/text-readings?lang=en&set=dhammacakkappavattana-version-reading");
  await waitForMuseum(page);

  await expect(page.getByRole("heading", { name: "Dhammacakkappavattana Sutta version reading: Pāli and Thanissaro English" })).toBeVisible();
  await expect(page.locator("[data-reading-mode='same_text_versions']")).toHaveText("One text · multiple versions/translations");
  await expect(page.locator(".text-reading-card")).toHaveCount(2);
  const variantNote = page.locator(".text-reading-variants").first();
  await expect(variantNote.getByText("suffering / stress", { exact: false })).toBeVisible();
  await expect(variantNote.getByText("This records a translator-wording difference", { exact: false })).toBeVisible();
  await expect(page.locator(".text-reading-cell-review")).toHaveCount(14);
  await page.locator(".text-reading-review").first().locator("summary").click();
  await expect(page.getByText("No reviewer record yet", { exact: true }).first()).toBeVisible();
});

test("Research exposes the source ledger and timeline range is shareable", async ({ page }) => {
  await page.goto("/research?lang=en");
  await waitForMuseum(page);
  await expect(page.getByRole("heading", { name: "Return from an entry to its source and locator" })).toBeVisible();
  await expect(page.getByText("Records of the Historian: Biographies of Laozi and Han Fei", { exact: true })).toBeVisible();

  await page.goto("/explore?lang=en&view=timeline");
  await waitForMuseum(page);
  await page.getByLabel("Timeline start year").fill("620");
  await page.getByLabel("Timeline end year").fill("760");
  await expect(page).toHaveURL(/from=620/);
  await expect(page).toHaveURL(/to=760/);
  await expect(page.getByText(/620–760/)).toBeVisible();
});

test("Research exposes the quality audit and review queue filters", async ({ page }) => {
  await page.goto("/research?lang=en&audit=blocking");
  await waitForMuseum(page);

  await expect(page.getByRole("heading", { name: "See what still blocks publication" })).toBeVisible();
  await expect(page.locator(".research-governance-status strong")).toHaveText("404");
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await expect(page.getByText("273 subjects shown; all statuses are read-only.", { exact: true })).toBeVisible();
  await expect(page.locator(".research-review-queue li")).toHaveCount(273);
  await expect(page.getByRole("link", { name: "Historical reviewer (0)", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Accessibility editor (0)", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Show all", exact: true }).click();
  await expect(page).toHaveURL(/audit=all/);
  await expect(page.getByText("348 subjects shown; all statuses are read-only.", { exact: true })).toBeVisible();
  await expect(page.locator(".research-review-queue li")).toHaveCount(348);
  await expect(page.getByText("figure:xuanzang", { exact: true })).toBeVisible();
});

test("search and entity deep links remain functional", async ({ page }) => {
  await page.goto("/search?lang=en");
  await waitForMuseum(page);
  await page.getByRole("textbox", { name: "Search figures, texts, concepts and places" }).fill("Xuanzang");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Xuanzang/);
  await expect(page.getByText("7 results for “xuanzang”")).toBeVisible();

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
  ["comparison", "/compare?lang=en&set=cross-era-figures"],
  ["text reading", "/text-readings?lang=en&set=three-traditions-passage-reading"],
  ["passage", "/passages/form-is-emptiness?lang=zh-CN"],
  ["place", "/places/changan?lang=en"],
  ["not found", "/missing-route?lang=en"],
  ["RC figure: Sima Chengzhen", "/figures/sima-chengzhen?lang=en"],
  ["RC figure: Kong Yingda", "/figures/kong-yingda?lang=en"],
  ["RC text: Heart Sutra", "/texts/heart-sutra?lang=en"],
  ["RC text: Daodejing", "/texts/daodejing?lang=en"],
  ["RC text: Analects", "/texts/analects?lang=en"],
  ["RC passage: Humans follow earth", "/passages/humans-follow-earth?lang=en"],
  ["RC passage: Return to ritual", "/passages/return-to-ritual?lang=en"],
  ["RC version: Heart Sutra", "/text-versions/heart-sutra-chinese-received?lang=en"],
  ["RC version: Daodejing", "/text-versions/daodejing-received?lang=en"],
  ["RC version: Analects", "/text-versions/analects-received?lang=en"],
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
