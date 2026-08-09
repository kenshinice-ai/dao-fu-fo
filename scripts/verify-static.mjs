import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("apps/museum-web");
const required = [
  "dist/index.html",
  "dist/data/v2/manifest/content-version.json",
  "dist/data/v2/profile/zh-CN.json",
  "dist/data/v2/profile/en.json",
  "dist/data/v2/overview/zh-CN.json",
  "dist/data/v2/overview/en.json",
  "dist/data/v2/exhibitions/changan-three-traditions.zh-CN.json",
  "dist/data/v2/exhibitions/changan-three-traditions.en.json",
  "dist/data/v2/maps/real/suitang.zh-CN.geojson",
  "dist/data/v2/timeline/suitang.zh-CN.json",
  "dist/data/v2/graphs/three-traditions/overview.zh-CN.json",
  "dist/data/v2/search/zh-CN/index.json",
  "dist/_redirects",
  "dist/_headers",
];

for (const file of required) await access(resolve(root, file));

const manifest = JSON.parse(
  await readFile(resolve(root, "dist/data/v2/manifest/content-version.json"), "utf8"),
);

if (manifest.profile !== "dao-ru-fo" || manifest.schemaVersion !== "2.0") {
  throw new Error("Unexpected static content manifest");
}
if (manifest.releaseStage !== "first-viewable-prototype") {
  throw new Error("Static release must state that it is the first-viewable prototype");
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
