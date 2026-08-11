import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getContentArtifactRoot } from "./artifact-roots.mjs";
import { getWebPublicStageRoot } from "./web-public-stage.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const basePublicRoot = resolve(repoRoot, "apps/museum-web/public");
const visibility = process.env.DRF_WEB_VISIBILITY ?? "preview";
if (visibility !== "preview" && visibility !== "public") throw new Error(`Invalid DRF_WEB_VISIBILITY: ${visibility}`);
const deploymentMode = process.env.DRF_WEB_DEPLOYMENT_MODE ?? "prototype";
if (deploymentMode !== "prototype" && deploymentMode !== "full-alpha") {
  throw new Error(`Invalid DRF_WEB_DEPLOYMENT_MODE: ${deploymentMode}`);
}
const artifactRoot = getContentArtifactRoot(visibility, repoRoot);
const stageRoot = getWebPublicStageRoot(repoRoot, visibility);

const generatedGroups = [
  "entities",
  "relations",
  "sources",
  "search",
  "maps/real",
  "maps/cosmos",
  "timeline",
  "graphs/three-traditions",
  "comparisons",
  "text-readings",
  "manifest/quality-report.json",
  "manifest/review-queue.json",
  "manifest/routes.json",
];

if (deploymentMode === "full-alpha") {
  // Full Alpha is an explicit production synchronization mode. Overlay the
  // compiler identity and every compiler-generated read-model group so the
  // deployed runtime cannot present Alpha data as the prototype baseline.
  generatedGroups.push("audio", "traditions.json", "profile", "manifest");
}

function canonicalSibling(file) {
  const match = file.match(/^(.*)\s+(\d+)(\.[^/]+)$/);
  return match ? `${match[1]}${match[3]}` : null;
}

async function copyFiltered(sourceRoot, targetRoot, relativePath = "") {
  const sourceDirectory = join(sourceRoot, relativePath);
  const targetDirectory = join(targetRoot, relativePath);
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const names = new Set(entries.map((entry) => entry.name));
  await mkdir(targetDirectory, { recursive: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativeChild = join(relativePath, entry.name);
    const sourcePath = join(sourceRoot, relativeChild);
    const targetPath = join(targetRoot, relativeChild);
    if (entry.isDirectory()) {
      await copyFiltered(sourceRoot, targetRoot, relativeChild);
      continue;
    }
    if (!entry.isFile()) continue;
    const sibling = canonicalSibling(entry.name);
    if (sibling && names.has(sibling)) continue;
    if (/\(conflicted copy(?:\s|\.)/i.test(entry.name)) continue;
    await cp(sourcePath, targetPath);
  }
}

await access(basePublicRoot);
await access(artifactRoot);
await rm(stageRoot, { recursive: true, force: true });
await mkdir(stageRoot, { recursive: true });

for (const entry of await readdir(basePublicRoot, { withFileTypes: true })) {
  if (entry.name === "data") continue;
  const source = join(basePublicRoot, entry.name);
  const target = join(stageRoot, entry.name);
  await cp(source, target, { recursive: entry.isDirectory() });
}

await copyFiltered(resolve(basePublicRoot, "data/v2"), resolve(stageRoot, "data/v2"));
for (const relativePath of generatedGroups) {
  const source = resolve(artifactRoot, relativePath);
  const target = resolve(stageRoot, "data/v2", relativePath);
  await rm(target, { recursive: true, force: true });
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

console.log(`Web public staging prepared: ${stageRoot} (${visibility}, ${deploymentMode})`);
