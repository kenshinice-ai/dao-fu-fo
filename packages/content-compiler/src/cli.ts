import { compileContent } from "./index.js";

const args = process.argv.slice(2);
const outputFlag = args.indexOf("--output");
const outputDirectory = outputFlag >= 0 ? args[outputFlag + 1] : undefined;
const databaseBundleFlag = args.indexOf("--database-bundle");
const databaseBundlePath = databaseBundleFlag >= 0 ? args[databaseBundleFlag + 1] : undefined;
const visibility = args.includes("--public") ? "public" : "preview";
if (outputFlag >= 0 && !outputDirectory) throw new Error("--output requires a path");
if (databaseBundleFlag >= 0 && !databaseBundlePath) throw new Error("--database-bundle requires a path");
const result = await compileContent({ repoRoot: process.cwd(), outputDirectory, visibility, databaseBundlePath });
console.log(`Content compiled: ${JSON.stringify(result)}`);
