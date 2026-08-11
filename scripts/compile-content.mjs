import { resolve } from "node:path";
import { compileContent } from "../packages/content-compiler/dist/index.js";
import { getContentArtifactRoot } from "./artifact-roots.mjs";

const repoRoot = resolve(process.cwd());
const args = process.argv.slice(2);
const visibility = args.includes("--public") ? "public" : "preview";
const databaseBundleFlag = args.indexOf("--database-bundle");
const databaseBundlePath = databaseBundleFlag >= 0 ? args[databaseBundleFlag + 1] : undefined;
if (databaseBundleFlag >= 0 && !databaseBundlePath) throw new Error("--database-bundle requires a path");

const outputDirectory = getContentArtifactRoot(visibility, repoRoot);
const result = await compileContent({ repoRoot, outputDirectory, visibility, databaseBundlePath });
console.log(`Content compiled: ${JSON.stringify(result)}`);
