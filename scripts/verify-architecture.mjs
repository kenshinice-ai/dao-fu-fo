import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { getWebPublicStageRoot } from "./web-public-stage.mjs";

const repoRoot = process.cwd();
const deploymentMode = process.env.DRF_WEB_DEPLOYMENT_MODE ?? "prototype";
if (!["prototype", "full-alpha"].includes(deploymentMode)) fail(`unsupported web deployment mode: ${deploymentMode}`);

async function readText(path) {
  return readFile(resolve(repoRoot, path), "utf8");
}

async function readJson(path) {
  return JSON.parse(await readText(path));
}

async function walk(directory) {
  const absolute = resolve(repoRoot, directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(relative(repoRoot, path))));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function fail(message) {
  throw new Error(`Architecture boundary failed: ${message}`);
}

const webPackage = await readJson("apps/museum-web/package.json");
const webDependencies = { ...webPackage.dependencies, ...webPackage.devDependencies };
const forbiddenRuntimePackages = ["pg", "postgres", "postgresql", "@supabase/supabase-js"];
for (const packageName of forbiddenRuntimePackages) {
  if (packageName in webDependencies) fail(`web runtime depends on ${packageName}`);
}

const runtimeFiles = [
  ...(await walk("apps/museum-web/src")),
  ...(await walk("apps/museum-web/public")),
].filter((path) => !path.includes("/apps/museum-web/public/data/v2/") && [".ts", ".tsx", ".js", ".mjs", ".json", ".html"].includes(extname(path)));

const forbiddenRuntimePatterns = [
  ["DATABASE_URL", /\bDATABASE_URL\b/],
  ["PostgreSQL connection URL", /postgres(?:ql)?:\/\//i],
  ["PGHOST", /\bPGHOST\b/],
  ["PGDATABASE", /\bPGDATABASE\b/],
  ["database client import", /from\s+["'](?:pg|postgres|postgresql|@supabase\/supabase-js)["']/],
  ["authoring source import", /(?:from\s+["'][^"']*|fetch\s*\([^)]*)content\/dao-ru-fo/],
  ["compiler artifact import", /\.artifacts\/content/],
];

for (const file of runtimeFiles) {
  const source = await readFile(file, "utf8");
  for (const [label, pattern] of forbiddenRuntimePatterns) {
    if (pattern.test(source)) fail(`${relative(repoRoot, file)} contains ${label}`);
  }
}

const rootPackage = await readJson("package.json");
const previewBuild = rootPackage.scripts?.["build:content"] ?? "";
const publicBuild = rootPackage.scripts?.["build:content:public"] ?? "";
if (!previewBuild.includes("scripts/compile-content.mjs") || !previewBuild.includes("--database-bundle .artifacts/database/import-v1.json")) {
  fail("preview build must emit the deterministic database import bundle");
}
if (previewBuild.includes("apps/museum-web/public")) fail("preview build writes into the deployed public directory");
if (!publicBuild.includes("scripts/compile-content.mjs") || !publicBuild.includes("--public")) {
  fail("public build must use public visibility and an isolated artifact directory");
}
if (publicBuild.includes("apps/museum-web/public")) fail("public compiler build writes into the prototype directory implicitly");

const compilerSource = await readText("packages/content-compiler/src/index.ts");
if (!compilerSource.includes('join(repoRoot, ".artifacts/content/v2")')) {
  fail("compiler preview default is no longer isolated under .artifacts/content/v2");
}

const staticAdapter = await readText("apps/museum-web/src/data/staticData.ts");
if (!staticAdapter.includes("createReadModelPaths") || !staticAdapter.includes("fetch(")) {
  fail("web static adapter must consume the shared read-model path contract over HTTP");
}

const deployedManifest = await readJson(join(getWebPublicStageRoot(), "data/v2/manifest/content-version.json"));
const authoringProfile = await readJson("content/dao-ru-fo/profile.json");
const expectedReleaseStage = deploymentMode === "full-alpha" ? "alpha" : "first-viewable-prototype";
if (deployedManifest.releaseStage !== expectedReleaseStage) {
  fail(`deployed static data is not explicitly labelled ${expectedReleaseStage}`);
}
if (deploymentMode === "prototype" && deployedManifest.contentVersion === authoringProfile.contentVersion) {
  fail("prototype and Alpha authoring content versions must remain visibly distinct until an explicit promotion");
}
if (deploymentMode === "full-alpha" && deployedManifest.contentVersion !== authoringProfile.contentVersion) {
  fail("Full Alpha deployed static data must match the current authoring content version");
}

const viteConfig = await readText("apps/museum-web/vite.config.ts");
if (!/sourcemap:\s*false/.test(viteConfig)) fail("production Vite source maps must remain disabled");

for (const script of ["deploy/cloudflare-pages.sh", "deploy/smoke-pages.sh"]) {
  const source = await readText(script);
  if (/\.artifacts\/content|DATABASE_URL|postgres(?:ql)?:\/\//i.test(source)) {
    fail(`${script} crosses the static production boundary`);
  }
}

console.log(`Architecture boundary verified: ${runtimeFiles.length} runtime files; static-only production; isolated preview/public artifacts`);
