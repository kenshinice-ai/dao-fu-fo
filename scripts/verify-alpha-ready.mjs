import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const matrixPath = path.join(root, "content/dao-ru-fo/mvp-alpha-matrix.json");
const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
const gaps = [];

for (const [key, target] of Object.entries(matrix.targets)) {
  const current = matrix.current[key] ?? 0;
  if (current < target) gaps.push(`${key}: ${current}/${target}`);
}

if (gaps.length > 0) {
  throw new Error(`Lean Alpha content quotas are incomplete: ${gaps.join(", ")}`);
}

console.log(`Lean Alpha quotas reached: ${matrix.id}; ${matrix.contentVersion}`);
