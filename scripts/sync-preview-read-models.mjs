import { getWebPublicStageRoot } from "./web-public-stage.mjs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const stageRoot = getWebPublicStageRoot(repoRoot, "preview");

await import("./prepare-web-public.mjs");
console.log(`Preview read models staged outside the iCloud worktree: ${stageRoot}`);
