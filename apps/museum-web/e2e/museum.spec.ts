import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function waitForMuseum(page: Page) {
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toBeVisible();
}

async function waitForAtlas(page: Page) {
  await expect(page.locator(".atlas-workspace")).toBeVisible();
  await expect(page.locator("#historical-map")).toBeVisible();
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

  await page.getByRole("link", { name: "Atlas", exact: true }).click();
  await expect(page).toHaveURL(/\/explore\?lang=en/);
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.getByRole("link", { name: "Atlas", exact: true })).toHaveAttribute("aria-current", "page");
});

test("atlas controls serialize a shareable state", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Places" }).click();
  await expect(page).toHaveURL(/tab=places/);
  await page.getByRole("button", { name: "Sui–Tang", exact: true }).click();
  await expect(page).toHaveURL(/from=581/);
  await expect(page).toHaveURL(/to=907/);
  await expect(page.locator("[data-era-context]")).toHaveAttribute("data-era-context-id", "sui-tang");
  await expect(page.locator("[data-era-context]")).toContainText("Form is not different from emptiness");
  await expect(page.locator("[data-era-context]").getByRole("link", { name: "Open passage" })).toHaveAttribute("href", /passages\/form-is-emptiness/);
  await page.getByRole("button", { name: "Traditional", exact: true }).click();
  await expect(page).toHaveURL(/timeline=tradition/);
  await expect(page.getByRole("button", { name: "Traditional", exact: true })).toHaveAttribute("aria-pressed", "true");
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

test("atlas figure index keeps all major and mythic figures focusable", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await waitForAtlas(page);
  await expect(page.locator(".atlas-tab-nav button").filter({ hasText: "Figures" })).toContainText("100");

  const figureTitles = ["Laozi (Li Er)", "Confucius (Kong Qiu)", "Śākyamuni Buddha (Gautama)", "Fu Xi", "Xuanzang"];
  const search = page.getByRole("searchbox", { name: "Search atlas entities" });
  for (const title of figureTitles) {
    await search.fill(title);
    const card = page.locator(".atlas-object-card").filter({ hasText: title }).first();
    await expect(card).toBeVisible();
    await card.locator(".atlas-object-card-main").click();
    await expect(page).toHaveURL(/focus=figure%3A/);
    await page.getByRole("button", { name: "Clear focus", exact: true }).click();
    await expect(page).not.toHaveURL(/focus=/);
    await expect(page.getByRole("button", { name: "Clear focus", exact: true })).toHaveCount(0);
    await expect(page.locator(".atlas-tab-nav button").filter({ hasText: "Figures" })).toContainText("100");
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
  await waitForAtlas(page);

  const map = page.locator("#historical-map");
  await expect(map).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.locator(".atlas-tab-nav")).toContainText("Routes");

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

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Places" }).click();
  const changanCard = page.locator(".atlas-object-card").filter({ hasText: /^Chang'an/ }).first();
  await expect(changanCard).toBeVisible();
  await changanCard.locator(".atlas-object-card-main").click();
  await expect(page).toHaveURL(/focus=place%3Achangan/);
  await expect(page.locator(".atlas-focus-bar")).toContainText("Chang'an");
});

test("map city selection opens the object dossier and figure relation network", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Places" }).click();
  const changanCard = page.locator(".atlas-object-card").filter({ hasText: /^Chang'an/ }).first();
  await changanCard.locator(".atlas-object-card-main").click();
  await expect(page).toHaveURL(/focus=place%3Achangan/);
  await changanCard.getByRole("button", { name: "Inspect", exact: true }).click();
  const cityDrawer = page.getByRole("dialog");
  await expect(cityDrawer).toBeVisible();
  await expect(cityDrawer.getByRole("heading", { name: "Chang'an", exact: true })).toBeVisible();
  await cityDrawer.getByRole("button", { name: "Close detail", exact: true }).click();

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Figures" }).click();
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Figures");
  const xuanzangCard = page.locator(".atlas-object-card").filter({ hasText: "Xuanzang" }).first();
  await expect(xuanzangCard).toBeVisible();
  await xuanzangCard.locator(".atlas-object-card-main").click();
  await expect(page).toHaveURL(/focus=figure%3Axuanzang/);
  await xuanzangCard.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".relation-network")).toBeVisible();
});

test("map timeline rail, city people and scoped relations stay linked", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await waitForAtlas(page);

  const rail = page.locator("[data-atlas-timeline]");
  await expect(rail.locator("[data-timeline-track]")).toBeVisible();
  await expect(rail.locator(".atlas-timeline-events > button").first()).toBeVisible();
  expect(await rail.locator("[data-timeline-track-focus]").count()).toBeGreaterThan(10);

  await rail.locator("[data-timeline-track-focus]").first().click();
  await expect(page).toHaveURL(/focus=place%3A/);
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Places");
  await expect(page.locator("[data-atlas-scope-note]")).toHaveCount(0);

  await page.goto("/explore?lang=en&view=map&focus=place%3Achangan");
  await waitForAtlas(page);
  await expect(page.locator("[data-city-people] .map-context-figure-list li")).toHaveCount(24);
  const cityRelations = page.locator('[data-relation-scope="true"]');
  await expect(cityRelations).toBeVisible();
  expect(await cityRelations.locator(".relation-network-edge").count()).toBeGreaterThan(0);
  await expect(cityRelations).toContainText("Yixing");
  await expect(cityRelations).toContainText("Sima Chengzhen");

  const firstCityPerson = page.locator("[data-city-people] .map-context-figure-list li").first().getByRole("button").first();
  await firstCityPerson.click();
  await expect(page).toHaveURL(/focus=figure%3A/);
  await expect(page).not.toHaveURL(/scope=/);
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Figures");
  await expect(page.locator("[data-atlas-context-note]")).toBeVisible();
  await expect(page.locator(".atlas-object-panel .atlas-panel-toolbar > span")).not.toHaveText("60 items");
  await expect(page.locator("[data-figure-trajectory]")).toBeVisible();

  await page.goto("/explore?lang=en&view=map&focus=place%3Achangan");
  await waitForAtlas(page);
  const cityRelationsAfterReturn = page.locator('[data-relation-scope="true"]');
  await cityRelationsAfterReturn.locator(".relation-network-node").first().click();
  await expect(page).toHaveURL(/focus=figure%3A/);
  await expect(page).not.toHaveURL(/scope=/);
  await expect(page.locator("[data-atlas-context-note]")).toBeVisible();
  await expect(page.locator(".atlas-object-panel .atlas-panel-toolbar > span")).not.toHaveText("60 items");
  await expect(page.locator("[data-figure-trajectory]")).toBeVisible();
});

test("place-to-person selection replaces the place with one canonical figure focus", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=place%3Aqufu");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Places");
  await page.locator("[data-city-people]").getByRole("button", { name: "Confucius (Kong Qiu)", exact: true }).click();
  await expect(page).toHaveURL(/focus=figure%3Aconfucius/);
  await expect(page).not.toHaveURL(/scope=/);
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Figures");
  await expect(page.locator("[data-atlas-scope-note]")).toHaveCount(0);
  await expect(page.locator("[data-atlas-context-note]")).toContainText("Confucius (Kong Qiu) · Related figures · 21");
  await expect(page.locator(".atlas-object-panel .atlas-panel-toolbar > span")).toHaveText("21 items");
  await expect(page.locator("[data-figure-trajectory]")).toContainText("Confucius (Kong Qiu)");

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Relations" }).click();
  await expect(page).toHaveURL(/tab=relations&focus=figure%3Aconfucius/);
  await expect(page).not.toHaveURL(/scope=/);
  await expect(page.locator(".atlas-relation-card")).toHaveCount(46);
  await expect(page.locator(".atlas-relation-card").first()).toContainText("Confucius (Kong Qiu)");
});

test("figure focus presents an elegant saying card and a scoped person relation layer", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Aconfucius");
  await waitForMuseum(page);
  await waitForAtlas(page);

  const confuciusCard = page.locator(".atlas-object-card").filter({ hasText: "Confucius (Kong Qiu)" }).first();
  await confuciusCard.getByRole("button", { name: "Inspect", exact: true }).click();
  const figureDrawer = page.getByRole("dialog");
  await expect(figureDrawer.locator(".atlas-quote-card")).toContainText("Analects 1.1");
  await expect(figureDrawer.locator(".atlas-quote-card")).toContainText("preserves");
  await figureDrawer.getByRole("button", { name: "Close detail", exact: true }).click();

  await page.goto("/explore?lang=en&view=map&focus=figure%3Adao-an");
  await waitForMuseum(page);
  await waitForAtlas(page);
  const daoAnCard = page.locator(".atlas-object-card").filter({ hasText: "Dao'an" }).first();
  await daoAnCard.getByRole("button", { name: "Inspect", exact: true }).click();
  const peopleRelations = page.getByRole("dialog").locator("[data-person-relations]").last();
  await expect(peopleRelations).toContainText("Huiyuan");
  await expect(peopleRelations).not.toContainText("Mount Lu");
});

test("figure place context maps an approximate historical region", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Akumarajiva");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await expect(page.locator("[data-figure-trajectory]")).toContainText("2 mapped stops");
  await expect(page.locator("[data-map-pending-places]")).toHaveCount(0);
  await expect(page.locator("[data-figure-trajectory] .map-trajectory-list")).toContainText("Kucha");
});

test("Yijing route keeps figure and mapped stops linked without a stale place scope", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Ayijing");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await expect(page.locator("[data-figure-trajectory]")).toContainText("2 mapped stops");
  const trajectory = page.locator("[data-figure-trajectory] .map-trajectory-list");
  await expect(trajectory).toContainText("Nalanda");
  await expect(trajectory).toContainText("Luoyang");

  await trajectory.getByRole("button", { name: /Nalanda/ }).click();
  await expect(page).toHaveURL(/focus=place%3Analanda/);
  const nalandaPeople = page.locator("[data-city-people]");
  await expect(nalandaPeople).toContainText("Yijing");

  await nalandaPeople.getByRole("button", { name: "Yijing", exact: true }).click();
  await expect(page).toHaveURL(/focus=figure%3Ayijing/);
  await expect(page).not.toHaveURL(/scope=/);
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Figures");
  await expect(page.locator("[data-figure-trajectory]")).toBeVisible();
});

test("Yijing Nalanda study keeps event, place and figure contexts aligned", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Ayijing");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await page.locator("[data-figure-trajectory] .map-trajectory-list").getByRole("button", { name: /Nalanda/ }).click();
  await expect(page).toHaveURL(/focus=place%3Analanda/);
  const nalandaEvents = page.locator("[data-city-events]");
  await expect(nalandaEvents).toContainText("Yijing studies at Nalanda");

  await nalandaEvents.getByRole("button", { name: "Yijing studies at Nalanda", exact: true }).click();
  await expect(page).toHaveURL(/focus=event%3Ayijing-studies-nalanda/);
  const eventContext = page.locator("[data-event-context]");
  await expect(eventContext).toContainText("Nalanda");
  await expect(eventContext).toContainText("Yijing");
});

test("Xuanzang route keeps all drawable waypoints connected to person and place context", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Axuanzang");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await expect(page.locator("[data-figure-trajectory]")).toContainText("4 mapped stops");
  const trajectory = page.locator("[data-figure-trajectory] .map-trajectory-list");
  await expect(trajectory).toContainText("Chang'an");
  await expect(trajectory).toContainText("Dunhuang");
  await expect(trajectory).toContainText("Kucha");
  await expect(trajectory).toContainText("Nalanda");

  await trajectory.getByRole("button", { name: /Kucha/ }).click();
  await expect(page).toHaveURL(/focus=place%3Aqiuci/);
  const people = page.locator("[data-city-people]");
  await expect(people).toContainText("Xuanzang");
  await expect(people).toContainText("Kumārajīva");
  await people.getByRole("button", { name: "Xuanzang", exact: true }).click();
  await expect(page).toHaveURL(/focus=figure%3Axuanzang/);
  await expect(page).not.toHaveURL(/scope=/);
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Figures");
});

test("map keeps city switching and event selection available after a selection", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Places" }).click();
  const changanCard = page.locator(".atlas-object-card").filter({ hasText: /^Chang'an/ }).first();
  await changanCard.locator(".atlas-object-card-main").click();
  await expect(page).toHaveURL(/focus=place%3Achangan/);

  const luoyangCard = page.locator(".atlas-object-card").filter({ hasText: /^Luoyang/ }).first();
  await luoyangCard.locator(".atlas-object-card-main").click();
  await expect(page).toHaveURL(/focus=place%3Aluoyang/);

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Events" }).click();
  const eventCard = page.locator(".atlas-object-card").first();
  await expect(eventCard).toBeVisible();
  await eventCard.locator(".atlas-object-card-main").click();
  await expect(page).toHaveURL(/focus=event%3A/);
  await eventCard.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close detail", exact: true }).click();

  await page.locator("[data-atlas-context-note]").getByRole("button", { name: "Show all", exact: true }).click();
  await expect(page).not.toHaveURL(/focus=/);
  await page.locator(".atlas-tab-nav button").filter({ hasText: "Places" }).click();
  await page.locator(".atlas-object-card").filter({ hasText: /^Chang'an/ }).first().locator(".atlas-object-card-main").click();
  await expect(page).toHaveURL(/focus=place%3Achangan/);
});

test("timeline event nodes reverse-focus the map and preserve the target in the URL", async ({ page }) => {
  await page.goto("/explore?lang=en&view=timeline&zoom=all");
  await waitForMuseum(page);

  await page.locator('[data-timeline-focus="event:xuanzang-departs-changan"]').click();
  await expect(page).toHaveURL(/focus=event%3Axuanzang-departs-changan/);
  await expect(page.locator("#historical-map")).toBeVisible();

  await page.goto("/explore?lang=en&view=timeline&zoom=all");
  await page.locator(".timeline-event-select").filter({ hasText: "Xuanzang departs Chang'an" }).click();
  await expect(page).toHaveURL(/focus=event%3Axuanzang-departs-changan/);
});

test("sacred cosmos is loaded from the compiler read model", async ({ page }) => {
  await page.goto("/explore?lang=en&view=cosmos");
  await waitForMuseum(page);

  await expect(page.getByText("Dao–Ru–Fo symbolic space · not a geographic map", { exact: true })).toBeVisible();
  await expect(page.locator(".cosmos-node")).toHaveCount(3);
  await expect(page.locator(".cosmos-figure-node")).toHaveCount(9);
  await expect(page.locator(".cosmos-place-node")).toHaveCount(5);
  await expect(page.locator(".cosmos-thread")).toHaveCount(14);
  await expect(page.getByText("3 tradition nodes, 9 symbolic figure nodes, 5 sacred-space nodes and 14 symbolic/comparative edges are shown from the compiler read model.", { exact: true })).toBeVisible();
  await expect(page.getByText("A symbolic space of tradition nodes, comparative relations and a curatorial encounter point; it uses no real-world coordinates.", { exact: true })).toBeVisible();
});

test("relation focus filters the map and adds relation-time context", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&focus=figure%3Alaozi");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await expect.poll(() => page.locator("#historical-map").getAttribute("data-map-visible-places")).not.toBe("0");
  await expect(page.locator("#historical-map")).toHaveAttribute("data-map-focus-state", /mapped|position-pending/);
  await expect(page.locator("#historical-map")).toHaveAttribute("data-map-visible-routes", "4");
  await page.locator(".atlas-tab-nav button").filter({ hasText: "Relations" }).click();
  await expect(page.locator(".atlas-relation-card").filter({ hasText: "Laozi (Li Er)" }).first()).toBeVisible();
  expect(await page.locator(".atlas-relation-card").count()).toBeGreaterThan(0);

  await page.goto("/explore?lang=en&view=map");
  await waitForAtlas(page);
  await page.locator(".atlas-tab-nav button").filter({ hasText: "Relations" }).click();
  await expect(page.locator(".atlas-tab-nav button").filter({ hasText: "Relations" })).toContainText("471");
  await expect(page.locator(".atlas-relation-card")).toHaveCount(80);
  await expect(page.locator(".atlas-relation-card").first()).toContainText("→");
  await page.locator(".atlas-relation-card .atlas-object-card-main").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/detail=relation%3A(?!relation%3A)/);
  await page.getByRole("dialog").locator(".atlas-drawer-actions button").first().click();
  await expect(page).toHaveURL(/focus=figure%3A/);
  await expect(page).not.toHaveURL(/scope=/);

  await page.goto("/explore?lang=en&view=timeline&focus=figure%3Alaozi");
  await waitForMuseum(page);
  await expect(page.locator(".timeline-list").getByText("Laozi (Li Er) → Chang'an Daoist monastic network", { exact: true })).toBeVisible();
});

test("direct figure relation URL never falls back to the global relation list", async ({ page }) => {
  await page.goto("/?lang=en&tab=relations&focus=figure%3Aconfucius");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await expect(page).toHaveURL(/tab=relations&focus=figure%3Aconfucius/);
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Relations");
  await expect(page.locator(".atlas-relation-card")).toHaveCount(46);
  await expect(page.locator(".atlas-relation-card").first()).toContainText("Confucius (Kong Qiu)");
});

test("relations tab exposes the Bible Atlas-style interactive people graph", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await page.locator(".atlas-tab-nav button").filter({ hasText: "Relations" }).click();
  const graph = page.locator(".relationship-graph");
  await expect(graph).toBeVisible();
  await expect(graph.locator(".relationship-graph-canvas")).toBeVisible();
  await expect(graph.locator(".relationship-graph-node").first()).toBeVisible();
  await expect(graph.getByText(/Scroll to zoom|滚轮缩放/)).toBeVisible();

  await graph.getByRole("button", { name: "Show as table", exact: true }).click();
  await expect(graph.locator(".relationship-graph-table")).toBeVisible();
  await expect(graph.locator(".relationship-graph-table tbody tr").first()).toBeVisible();
  await graph.locator(".relationship-graph-table tbody tr").first().getByRole("button").nth(1).click();
  await expect(page).toHaveURL(/detail=relation%3A(?!relation%3A)/);

  await page.goto("/explore?lang=en&view=map&tab=relations&focus=figure%3Aconfucius");
  await waitForAtlas(page);
  await expect(page.locator(".relationship-graph")).toBeVisible();
  const confuciusNode = page.getByRole("button", { name: /Confucius \(Kong Qiu\)/ }).last();
  await expect(confuciusNode).toBeVisible();
  await confuciusNode.click();
  await expect(page).toHaveURL(/focus=figure%3Aconfucius/);
  await expect(page.locator(".atlas-object-panel .atlas-tab-nav button.active")).toContainText("Figures");
});

test("map shares the historical time window with the timeline", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map&from=-600&to=-500");
  await waitForMuseum(page);
  await waitForAtlas(page);

  await expect.poll(() => page.locator("#historical-map").getAttribute("data-map-visible-places")).not.toBe("0");
  await page.locator(".atlas-tab-nav button").filter({ hasText: "Places" }).click();
  await expect(page.locator(".atlas-object-card").filter({ hasText: "Sarnath" }).first()).toBeVisible();
  await expect(page.locator(".civilisation-map-caption")).toContainText("-600–-500");
});

test("homepage exposes the expanded figure gateways", async ({ page }) => {
  await page.goto("/?lang=zh-CN");
  await waitForMuseum(page);

  await waitForAtlas(page);
  await expect(page.locator(".home-atlas-panel.atlas-workspace")).toBeVisible();
  await expect(page.locator(".atlas-workspace").getByRole("heading", { name: "交错的历史时空" })).toBeVisible();
  await expect(page.getByRole("button", { name: "放大地图", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开完整地图", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "人物、空间与时间" })).toBeVisible();
  await expect(page.locator(".figure-spotlight-card")).toHaveCount(32);
  await expect(page.locator(".figure-spotlight-card").filter({ hasText: "老子（李耳）" })).toBeVisible();
  await expect(page.locator(".figure-spotlight-card").filter({ hasText: "孔子（孔丘）" })).toBeVisible();
  await expect(page.locator(".figure-spotlight-card").filter({ hasText: "释迦牟尼佛" })).toBeVisible();
  await expect(page.getByText("当前收录 100 位人物，三种传统；空间待核处明确保留证据边界。", { exact: true })).toBeVisible();
});

test("representative historical, traditional and mythic figures resolve through the map gateway", async ({ page }) => {
  await page.goto("/?lang=en");
  await waitForMuseum(page);
  await waitForAtlas(page);
  await page.locator(".atlas-tab-nav button").filter({ hasText: "Figures" }).click();
  const search = page.getByRole("searchbox", { name: "Search atlas entities" });
  for (const title of ["Laozi (Li Er)", "Confucius (Kong Qiu)", "Śākyamuni Buddha (Gautama)", "Fu Xi", "Xuanzang"]) {
    await search.fill(title);
    const card = page.locator(".atlas-object-card").filter({ hasText: title }).first();
    await expect(card).toBeVisible();
    await card.locator(".atlas-object-card-main").click();
    await expect(page).toHaveURL(/focus=figure%3A/);
    await expect(page.locator(".atlas-focus-bar")).toContainText(title);
    await page.getByRole("button", { name: "Clear focus", exact: true }).click();
    await expect(page).not.toHaveURL(/focus=/);
    await expect(page.getByRole("button", { name: "Clear focus", exact: true })).toHaveCount(0);
    await expect(page.locator(".atlas-tab-nav button").filter({ hasText: "Figures" })).toContainText("100");
  }
});

test("entity dossiers expose historicity, relation qualifiers and source jumps", async ({ page }) => {
  await page.goto("/figures/laozi?lang=en");
  await waitForMuseum(page);

  await expect(page.getByText("Historicity", { exact: true })).toBeVisible();
  await expect(page.locator(".entity-facts").getByText("Contested", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Places, events, texts and later reception" })).toBeVisible();
  await expect(page.getByText("Remembered through Tang Daoist institutions", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "source:shiji-laozi-biography", exact: true }).first().click();
  await expect(page).toHaveURL(/\/research\?source=source%3Ashiji-laozi-biography&lang=en/);
  await expect(page.getByRole("heading", { name: /Focused source: Records of the Historian/ })).toBeVisible();
});

test("figure dossiers expose verified birthplace links", async ({ page }) => {
  await page.goto("/figures/confucius?lang=en");
  await waitForMuseum(page);

  await expect(page.locator(".entity-facts").getByText("Birthplace", { exact: true })).toBeVisible();
  await expect(page.locator(".entity-facts").getByRole("link", { name: "Qufu", exact: true })).toBeVisible();
  await expect(page.locator("[data-person-relations]")).toBeVisible();
  await expect(page.locator("[data-person-relations]")).toContainText("Mencius");
  await expect(page.locator("[data-person-relations]")).toContainText("Confucian tradition enters Mencius's Warring States re-reading");
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
  await expect(page.locator(".research-governance-status strong")).toHaveText("1009");
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  await expect(page.getByText("727 subjects shown; all statuses are read-only.", { exact: true })).toBeVisible();
  await expect(page.locator(".research-review-queue li")).toHaveCount(727);
  await expect(page.getByRole("link", { name: "Historical reviewer (0)", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Accessibility editor (0)", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Show all", exact: true }).click();
  await expect(page).toHaveURL(/audit=all/);
  await expect(page.getByText("802 subjects shown; all statuses are read-only.", { exact: true })).toBeVisible();
  await expect(page.locator(".research-review-queue li")).toHaveCount(802);
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
  await waitForAtlas(page);
  const metrics = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".primary-nav");
    const rect = nav?.getBoundingClientRect();
    const mapPanel = document.querySelector<HTMLElement>(".home-atlas-panel");
    const atlasRect = mapPanel?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      position: nav ? getComputedStyle(nav).position : null,
      navBottom: rect?.bottom ?? 0,
      viewportHeight: window.innerHeight,
      mapStartsNearTop: (atlasRect?.top ?? Number.POSITIVE_INFINITY) < 140,
    };
  });
  expect(metrics.overflow).toBe(false);
  expect(metrics.position).toBe("fixed");
  expect(metrics.navBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.navBottom).toBeGreaterThan(metrics.viewportHeight - 24);
  expect(metrics.mapStartsNearTop).toBe(true);

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" }));
  await expect(page.getByRole("button", { name: "回到顶部", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "回到顶部", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("detail drawer traps focus and returns it to the selected object", async ({ page }) => {
  await page.goto("/explore?lang=en&view=map");
  await waitForMuseum(page);
  await waitForAtlas(page);
  const figureCard = page.locator(".atlas-object-card").filter({ hasText: "Confucius (Kong Qiu)" }).first();
  const inspect = figureCard.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Close detail", exact: true })).toBeFocused();
  const focusableCount = await drawer.locator("button, a[href]").count();
  expect(focusableCount).toBeGreaterThan(1);
  for (let index = 0; index < focusableCount + 1; index += 1) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  await drawer.getByRole("button", { name: "Close detail", exact: true }).click();
  await expect(inspect).toBeFocused();
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
