import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PublicReleaseCandidateSchema } from "@drf-museum/domain-schema";

const apply = process.argv.includes("--apply");
const promotedByArgument = process.argv.find((argument) => argument.startsWith("--promoted-by="));
const promotedBy = promotedByArgument?.slice("--promoted-by=".length).trim();
const repoRoot = resolve(process.cwd());
const contentRoot = resolve(repoRoot, "content/dao-ru-fo");
const candidatePath = resolve(contentRoot, "public-rc.json");
const planPath = resolve(repoRoot, ".artifacts/content/public-rc-plan.json");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function listJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

function entityKey(entity) {
  return `${entity.kind}:${entity.slug}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
}

const candidate = PublicReleaseCandidateSchema.parse(await readJson(candidatePath));
run(process.execPath, ["scripts/verify-public-rc.mjs"]);
const plan = await readJson(planPath);

if (!apply) {
  console.log(JSON.stringify({
    candidate: candidate.id,
    status: candidate.status,
    ready: plan.ready,
    blockers: plan.counts.blockers,
    warnings: plan.counts.warnings,
    nextCommand: plan.ready ? "npm run content:promote -- --apply --promoted-by=<reviewer>" : "Complete the listed review/source blockers first",
  }, null, 2));
  process.exit(0);
}

if (candidate.status !== "ready") throw new Error(`Candidate must be status=ready before promotion; found ${candidate.status}`);
if (!promotedBy) throw new Error("Promotion requires --promoted-by=<reviewer>");
if (!plan.ready || plan.counts.blockers !== 0) throw new Error(`Candidate is not ready: ${plan.counts.blockers} blockers remain`);

const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" }).stdout.trim();
if (dirty && process.env.ALLOW_DIRTY_PROMOTION !== "1") {
  throw new Error("Promotion requires a clean Git worktree; commit the reviewed source and review records first");
}

const changes = new Map();
const originals = new Map();
async function queueJsonChange(path, value) {
  const original = await readFile(path, "utf8");
  if (!originals.has(path)) originals.set(path, original);
  changes.set(path, `${JSON.stringify(value, null, 2)}\n`);
}

const selectedEntityKeys = new Set([...candidate.coreEntities, ...candidate.dependencyEntities]);
const entityFiles = await listJsonFiles(resolve(contentRoot, "entities"));
const foundEntityKeys = new Set();
for (const path of entityFiles) {
  const raw = await readJson(path);
  const values = Array.isArray(raw) ? raw : [raw];
  let changed = false;
  const updated = values.map((entity) => {
    if (!selectedEntityKeys.has(entityKey(entity))) return entity;
    foundEntityKeys.add(entityKey(entity));
    changed = true;
    return { ...entity, publicationState: "public", reviewStatus: "publishable" };
  });
  if (changed) await queueJsonChange(path, Array.isArray(raw) ? updated : updated[0]);
}
for (const key of selectedEntityKeys) if (!foundEntityKeys.has(key)) throw new Error(`Promotion could not find selected entity ${key}`);

const relationsPath = resolve(contentRoot, "relations.json");
const relations = await readJson(relationsPath);
let relationChanged = false;
const updatedRelations = relations.map((relation) => {
  if (!candidate.relations.includes(relation.id)) return relation;
  relationChanged = true;
  return { ...relation, publicationState: "public", reviewStatus: "publishable" };
});
if (relationChanged) await queueJsonChange(relationsPath, updatedRelations);

const audioPath = resolve(contentRoot, "audio.json");
const audio = await readJson(audioPath);
let audioChanged = false;
const updatedAudio = audio.map((record) => {
  if (!candidate.audio.includes(record.id)) return record;
  audioChanged = true;
  return { ...record, publicationState: "public", reviewStatus: "publishable" };
});
if (audioChanged) await queueJsonChange(audioPath, updatedAudio);

const sourceSnapshot = {
  candidate: { ...candidate, status: "ready", promotion: undefined },
  entities: [...changes.entries()].map(([path, value]) => [path.replace(`${repoRoot}/`, ""), JSON.parse(value)]),
  relations: updatedRelations,
  audio: updatedAudio,
  sources: await readJson(resolve(repoRoot, "content/common/sources.json")),
  reviews: await readJson(resolve(contentRoot, "reviews.json")),
};
const sourceChecksumSha256 = sha256(JSON.stringify(sourceSnapshot));
const promotionId = `promotion:${candidate.id.slice("release:".length)}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const promotionTime = new Date().toISOString();
const promotingCandidate = {
  ...candidate,
  status: "promoting",
  updatedAt: promotionTime,
};
await queueJsonChange(candidatePath, promotingCandidate);

async function writeChanges() {
  for (const [path, value] of changes) {
    const temporary = `${path}.public-promotion-tmp`;
    await writeFile(temporary, value, "utf8");
    await rename(temporary, path);
  }
}

async function rollback() {
  for (const [path, value] of originals) {
    const temporary = `${path}.public-promotion-rollback-tmp`;
    await writeFile(temporary, value, "utf8");
    await rename(temporary, path);
  }
}

try {
  await writeChanges();
  run("npm", ["run", "build:content:public"]);
  run("npm", ["run", "verify:content:public"]);
  const checksumsPath = resolve(repoRoot, ".artifacts/content/public-v2/manifest/checksums.json");
  const artifactChecksumSha256 = sha256(await readFile(checksumsPath));
  const promotedCandidate = PublicReleaseCandidateSchema.parse({
    ...candidate,
    status: "promoted",
    updatedAt: new Date().toISOString(),
    promotion: { id: promotionId, promotedBy, promotedAt: promotionTime, sourceChecksumSha256, artifactChecksumSha256 },
  });
  await queueJsonChange(candidatePath, promotedCandidate);
  await writeChanges();
  run("npm", ["run", "build:content"]);
  run("npm", ["run", "verify:database-bundle"]);
  console.log(`Public RC promoted: ${candidate.id}; promotion=${promotionId}; artifact=${artifactChecksumSha256}`);
} catch (error) {
  await rollback();
  throw error;
}
