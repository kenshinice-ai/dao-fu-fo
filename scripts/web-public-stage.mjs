import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export function getWebPublicStageRoot(repoRoot = process.cwd(), visibility = "preview") {
  if (visibility !== "preview" && visibility !== "public") throw new Error(`Invalid web content visibility: ${visibility}`);
  const identity = createHash("sha256").update(resolve(repoRoot)).digest("hex").slice(0, 12);
  return join(tmpdir(), `drf-museum-web-public-${visibility}-${identity}`);
}
