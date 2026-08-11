import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export function getContentArtifactRoot(visibility = "preview", repoRoot = process.cwd()) {
  if (visibility !== "preview" && visibility !== "public") throw new Error(`Invalid content visibility: ${visibility}`);
  const identity = createHash("sha256").update(resolve(repoRoot)).digest("hex").slice(0, 12);
  return join(tmpdir(), `drf-museum-content-${visibility}-${identity}`);
}
