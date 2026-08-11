import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const apply = process.argv.includes("--apply");
const repoRoot = resolve(process.cwd());
const sourceRoot = resolve(repoRoot, "apps/museum-web/public/data/v2");
const quarantineRoot = resolve(repoRoot, ".artifacts/quarantine/icloud-conflicts");

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

function canonicalSibling(file) {
  const match = file.match(/^(.*)\s+(\d+)(\.[^/]+)$/);
  return match ? `${match[1]}${match[3]}` : null;
}

await access(sourceRoot);
const files = await walk(sourceRoot);
const names = new Set(files);
const conflicts = files.filter((file) => {
  const sibling = canonicalSibling(file);
  return Boolean(sibling && names.has(sibling));
});

if (conflicts.length === 0 && !apply) {
  console.log("No generated conflict copies found");
  process.exit(0);
}

if (!apply) {
  console.log(`Would quarantine ${conflicts.length} generated conflict copies. Re-run with --apply.`);
  for (const file of conflicts) console.log(`- ${file}`);
  process.exit(2);
}

for (const file of conflicts) {
  const sourcePath = join(sourceRoot, file);
  const targetPath = join(quarantineRoot, file);
  await mkdir(dirname(targetPath), { recursive: true });
  await rename(sourcePath, targetPath);
}

const quarantinedFiles = (await walk(quarantineRoot)).filter((file) => file !== "manifest.json");
const manifest = [];
for (const file of quarantinedFiles) {
  const quarantinePath = join(quarantineRoot, file);
  const bytes = await readFile(quarantinePath);
  manifest.push({
    source: relative(repoRoot, join(sourceRoot, file)),
    quarantine: relative(repoRoot, quarantinePath),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  join(quarantineRoot, "manifest.json"),
  `${JSON.stringify({ createdAt: new Date().toISOString(), files: manifest }, null, 2)}\n`,
  "utf8",
);
console.log(`Quarantined ${manifest.length} generated conflict copies under ${relative(repoRoot, quarantineRoot)}`);
