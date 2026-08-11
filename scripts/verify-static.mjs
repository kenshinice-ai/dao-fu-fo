import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("apps/museum-web");
const manifest = JSON.parse(
  await readFile(resolve(root, "dist/data/v2/manifest/content-version.json"), "utf8"),
);
const fullAlphaBuild = process.env.DRF_WEB_DEPLOYMENT_MODE === "full-alpha";
const publicBuild = process.env.DRF_WEB_VISIBILITY === "public" || await access(
  resolve(root, "dist/data/v2/comparisons/public-rc-figures.en.json"),
).then(() => true).catch(() => false);

const requiredBase = [
  "dist/index.html",
  "dist/data/v2/manifest/content-version.json",
  "dist/data/v2/profile/zh-CN.json",
  "dist/data/v2/profile/en.json",
  "dist/data/v2/overview/zh-CN.json",
  "dist/data/v2/overview/en.json",
  "dist/data/v2/exhibitions/changan-three-traditions.zh-CN.json",
  "dist/data/v2/exhibitions/changan-three-traditions.en.json",
  "dist/data/v2/maps/real/suitang.zh-CN.geojson",
  "dist/data/v2/maps/real/overview.zh-CN.geojson",
  "dist/data/v2/maps/cosmos/overview.zh-CN.json",
  "dist/data/v2/maps/cosmos/overview.en.json",
  "dist/data/v2/timeline/suitang.zh-CN.json",
  "dist/data/v2/timeline/overview.zh-CN.json",
  "dist/data/v2/graphs/three-traditions/overview.zh-CN.json",
  "dist/data/v2/search/zh-CN/index.json",
  "dist/data/v2/relations/zh-CN.json",
  "dist/data/v2/relations/en.json",
  "dist/data/v2/manifest/quality-report.json",
  "dist/data/v2/manifest/review-queue.json",
  "dist/_redirects",
  "dist/_headers",
];

const requiredReadingModels = publicBuild
  ? [
      "dist/data/v2/comparisons/public-rc-figures.zh-CN.json",
      "dist/data/v2/comparisons/public-rc-figures.en.json",
      "dist/data/v2/text-readings/public-rc-passage-reading.zh-CN.json",
      "dist/data/v2/text-readings/public-rc-passage-reading.en.json",
    ]
  : [
      "dist/data/v2/comparisons/cross-era-figures.zh-CN.json",
      "dist/data/v2/comparisons/cross-era-figures.en.json",
      "dist/data/v2/text-readings/three-traditions-passage-reading.zh-CN.json",
      "dist/data/v2/text-readings/three-traditions-passage-reading.en.json",
      "dist/data/v2/text-readings/dhammacakkappavattana-version-reading.zh-CN.json",
      "dist/data/v2/text-readings/dhammacakkappavattana-version-reading.en.json",
    ];

const required = [...requiredBase, ...requiredReadingModels];

for (const file of required) await access(resolve(root, file));

if (manifest.profile !== "dao-ru-fo" || manifest.schemaVersion !== "2.0") {
  throw new Error("Unexpected static content manifest");
}
const expectedReleaseStage = fullAlphaBuild ? "alpha" : "first-viewable-prototype";
if (manifest.releaseStage !== expectedReleaseStage) {
  throw new Error(`Static release must state ${expectedReleaseStage}, got ${manifest.releaseStage}`);
}
if (fullAlphaBuild && manifest.visibility !== "preview") {
  throw new Error("Full Alpha deployment must retain preview visibility in its manifest");
}

const indexHtml = await readFile(resolve(root, "dist/index.html"), "utf8");
if (indexHtml.includes("localhost:")) throw new Error("Production build contains localhost URL");

const redirects = await readFile(resolve(root, "dist/_redirects"), "utf8");
if (!redirects.includes("/* /index.html 200")) throw new Error("SPA deep-link fallback missing");

const distFiles = await readdir(resolve(root, "dist"), { recursive: true });
if (distFiles.some((file) => String(file).endsWith(".map"))) {
  throw new Error("Production build unexpectedly contains public source maps");
}

console.log(`Static release verified: ${manifest.contentVersion}`);
