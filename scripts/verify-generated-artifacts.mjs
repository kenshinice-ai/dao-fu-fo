import { access, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { getContentArtifactRoot } from "./artifact-roots.mjs";
import { getWebPublicStageRoot } from "./web-public-stage.mjs";

const repoRoot = resolve(process.cwd());
const roots = [
  { label: "Preview compiler artifact", path: resolve(getContentArtifactRoot("preview")), optional: false },
  { label: "Public compiler artifact", path: resolve(getContentArtifactRoot("public")), optional: false },
  { label: "Preview web staging read models", path: resolve(getWebPublicStageRoot()), optional: false },
];

async function walk(directory, relativePath = "") {
  const entries = await readdir(join(directory, relativePath), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await walk(directory, child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function conflictSibling(file) {
  const match = file.match(/^(.*)\s+(\d+)(\.[^/]+)$/);
  return match ? `${match[1]}${match[3]}` : null;
}

const findings = [];
let checkedRoots = 0;
let checkedFiles = 0;

for (const root of roots) {
  const absoluteRoot = resolve(repoRoot, root.path);
  try {
    await access(absoluteRoot);
  } catch (error) {
    if (root.optional && error?.code === "ENOENT") continue;
    throw error;
  }
  checkedRoots += 1;
  const files = await walk(absoluteRoot);
  checkedFiles += files.length;
  const fileNames = new Set(files);
  for (const file of files) {
    const sibling = conflictSibling(file);
    if (sibling && fileNames.has(sibling)) {
      findings.push(`${root.label}: ${relative(repoRoot, join(absoluteRoot, file))} duplicates ${sibling}`);
    }
    if (/\(conflicted copy(?:\s|\.)/i.test(file)) {
      findings.push(`${root.label}: ${relative(repoRoot, join(absoluteRoot, file))} is an iCloud conflict copy`);
    }
  }
}

if (findings.length > 0) {
  const preview = findings.slice(0, 20).join("\n");
  const suffix = findings.length > 20 ? `\n…and ${findings.length - 20} more` : "";
  throw new Error(`Generated artifact hygiene failed: ${findings.length} conflict duplicates found\n${preview}${suffix}`);
}

console.log(`Generated artifact hygiene verified: ${checkedFiles} files across ${checkedRoots} roots`);
