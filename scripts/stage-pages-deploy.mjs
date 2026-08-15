import { access, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const [sourceArgument, targetArgument] = process.argv.slice(2);
if (!sourceArgument || !targetArgument) {
  throw new Error("Usage: node scripts/stage-pages-deploy.mjs <source-dist> <target-directory>");
}

const sourceRoot = resolve(sourceArgument);
const targetRoot = resolve(targetArgument);

async function walk(directory, relativePath = "") {
  const entries = await readdir(join(directory, relativePath), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await walk(directory, child));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`Deploy staging does not accept non-file entries: ${child}`);
  }
  return files;
}

function canonicalSibling(file) {
  const match = file.match(/^(.*)\s+(\d+)(\.[^/]+)?$/);
  return match ? `${match[1]}${match[3] ?? ""}` : null;
}

await access(sourceRoot);
const sourceFiles = await walk(sourceRoot);
const sourceNames = new Set(sourceFiles);
const skippedConflicts = [];
const canonicalFiles = [];

for (const file of sourceFiles) {
  const sibling = canonicalSibling(file);
  if (/\(conflicted copy(?:\s|\.)/i.test(file) || (sibling && sourceNames.has(sibling))) {
    skippedConflicts.push(file);
    continue;
  }
  canonicalFiles.push(file);
}

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });
for (const file of canonicalFiles) {
  const targetPath = join(targetRoot, file);
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(join(sourceRoot, file), targetPath);
}

for (const required of ["index.html", "_headers", "_redirects", "data/v2/manifest/content-version.json"]) {
  await access(join(targetRoot, required));
}

const stagedFiles = await walk(targetRoot);
const stagedNames = new Set(stagedFiles);
const stagedConflicts = stagedFiles.filter((file) => {
  const sibling = canonicalSibling(file);
  return /\(conflicted copy(?:\s|\.)/i.test(file) || Boolean(sibling && stagedNames.has(sibling));
});
if (stagedConflicts.length > 0) {
  throw new Error(`Deploy staging retained conflict copies:\n${stagedConflicts.join("\n")}`);
}
if (stagedFiles.length !== canonicalFiles.length) {
  throw new Error(`Deploy staging file-count mismatch: expected ${canonicalFiles.length}, found ${stagedFiles.length}`);
}

console.log(
  `Cloudflare upload staged outside the worktree: ${stagedFiles.length} files; `
  + `${skippedConflicts.length} iCloud conflict copies excluded; source=${relative(process.cwd(), sourceRoot)}`,
);
