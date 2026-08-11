import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const reviewsPath = resolve(repoRoot, "content/dao-ru-fo/reviews.json");
const allowed = {
  subjectKind: new Set(["entity", "relation", "audio"]),
  checkKind: new Set(["schema", "fact", "tradition", "bilingual", "rights", "accessibility", "editorial"]),
  status: new Set(["pending", "pre_reviewed", "passed", "failed", "waived"]),
  locale: new Set(["zh-CN", "en"]),
};

function argument(name, required = true) {
  const prefix = `--${name}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  if (!match && required) throw new Error(`Missing ${prefix}<value>`);
  return match?.slice(prefix.length).trim() || undefined;
}

function assertAllowed(name, value) {
  if (!allowed[name].has(value)) throw new Error(`Invalid ${name}: ${value}`);
}

const subjectKind = argument("subject-kind");
const subjectKey = argument("subject-key");
const checkKind = argument("check-kind");
const status = argument("status");
const reviewer = argument("reviewer");
const note = argument("note");
const locale = argument("locale", false);
const reviewedAt = argument("reviewed-at", status !== "pending");

assertAllowed("subjectKind", subjectKind);
assertAllowed("checkKind", checkKind);
assertAllowed("status", status);
if (locale) assertAllowed("locale", locale);
if (!subjectKey || !/^[a-z_]+:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subjectKey)) throw new Error(`Invalid subject key: ${subjectKey}`);
if (!reviewer) throw new Error("Reviewer cannot be empty");
if (status !== "pending" && !note) throw new Error("Completed review records require a note");
if (reviewedAt && Number.isNaN(Date.parse(reviewedAt))) throw new Error(`Invalid reviewed-at timestamp: ${reviewedAt}`);

if (["passed", "waived"].includes(status)) {
  if (reviewer.startsWith("agent:") || reviewer.startsWith("role:")) {
    throw new Error("Formal passed/waived records require an identified reviewer, not an agent or role placeholder");
  }
  if (reviewer.startsWith("automated:") && (checkKind !== "schema" || status !== "passed")) {
    throw new Error("Automated reviewers may only pass schema checks");
  }
}

const slug = `${subjectKind}-${subjectKey}-${checkKind}${locale ? `-${locale}` : ""}`
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const id = `review:rc-${slug}`;
const reviews = JSON.parse(await readFile(reviewsPath, "utf8"));
const record = {
  id,
  subjectKind,
  subjectKey,
  checkKind,
  ...(locale ? { locale } : {}),
  status,
  reviewer,
  ...(reviewedAt ? { reviewedAt } : {}),
  ...(note ? { note } : {}),
};
const index = reviews.findIndex((value) => (
  value.subjectKind === subjectKind &&
  value.subjectKey === subjectKey &&
  value.checkKind === checkKind &&
  (value.locale ?? undefined) === (locale ?? undefined)
));
if (index >= 0) reviews[index] = record;
else reviews.push(record);

const temporary = `${reviewsPath}.review-tmp`;
await writeFile(temporary, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
await rename(temporary, reviewsPath);
console.log(`${index >= 0 ? "Updated" : "Added"} ${id}: ${status} by ${reviewer}`);
