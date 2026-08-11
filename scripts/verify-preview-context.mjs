import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { getContentArtifactRoot } from "./artifact-roots.mjs";
import { getWebPublicStageRoot } from "./web-public-stage.mjs";

const artifactRoot = getContentArtifactRoot("preview");
const previewRoot = resolve(getWebPublicStageRoot(), "data/v2");

async function listFiles(root, relative = "") {
  const directory = join(root, relative);
  if ((await stat(directory)).isFile()) return [relative];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    else files.push(child);
  }
  return files.sort();
}

const groups = [
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
];

let compared = 0;
for (const group of groups) {
  const artifactFiles = await listFiles(artifactRoot, group);
  const previewFiles = await listFiles(previewRoot, group);
  if (artifactFiles.join("\n") !== previewFiles.join("\n")) {
    throw new Error(`Preview read-model file set is stale for ${group}`);
  }
  for (const relativePath of artifactFiles) {
    const artifactPath = join(artifactRoot, relativePath);
    const previewPath = join(previewRoot, relativePath);
    const [artifact, preview] = await Promise.all([readFile(artifactPath), readFile(previewPath)]);
    if (!artifact.equals(preview)) throw new Error(`Preview read model is stale: ${previewPath}`);
    compared += 1;
  }
}

const relation = JSON.parse(await readFile(join(previewRoot, "relations/en.json"), "utf8"));
if (relation.locale !== "en" || !Array.isArray(relation.items) || relation.items.length === 0) {
  throw new Error("Invalid preview relation index");
}

console.log(`Preview read models verified: ${compared} files; ${relation.items.length} bilingual relations`);
