import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const matrixPath = path.join(root, "content/dao-ru-fo/mvp-alpha-matrix.json");
const reportPath = path.join(root, ".artifacts/content/v2/manifest/content-report.json");

const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
const report = JSON.parse(await readFile(reportPath, "utf8"));

if (matrix.contentVersion !== report.contentVersion) {
  throw new Error(`Alpha matrix ${matrix.contentVersion} does not match compiled content ${report.contentVersion}`);
}

const entityCounts = report.entityCounts ?? {};
const actual = {
  figure: entityCounts.figure ?? 0,
  text: entityCounts.text ?? 0,
  concept: entityCounts.concept ?? 0,
  schoolOrInstitution: (entityCounts.school ?? 0) + (entityCounts.institution ?? 0),
  place: entityCounts.place ?? 0,
  event: entityCounts.event ?? 0,
  route: entityCounts.route ?? 0,
  museumObject: entityCounts.museum_object ?? 0,
  passage: entityCounts.passage ?? 0,
  relation: report.relationCount ?? 0,
  audio: report.audioCount ?? 0,
};

for (const [key, value] of Object.entries(actual)) {
  if (matrix.current[key] !== value) {
    throw new Error(`Alpha matrix current.${key}=${matrix.current[key]} but compiler reports ${value}`);
  }
}

console.log(`Alpha matrix verified: ${matrix.id}; ${matrix.contentVersion}; ${JSON.stringify(actual)}`);
