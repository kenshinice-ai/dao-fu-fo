import { resolve } from "node:path";
import { getContentArtifactRoot } from "./artifact-roots.mjs";

process.env.DRF_CONTENT_ARTIFACT_ROOT = getContentArtifactRoot("public", resolve(process.cwd()));
await import("./verify-content.mjs");
