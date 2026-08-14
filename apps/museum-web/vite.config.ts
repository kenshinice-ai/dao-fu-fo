import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "../..");
const stageId = createHash("sha256").update(repoRoot).digest("hex").slice(0, 12);
const visibility = process.env.DRF_WEB_VISIBILITY ?? "preview";
if (visibility !== "preview" && visibility !== "public") throw new Error(`Invalid DRF_WEB_VISIBILITY: ${visibility}`);
const publicDir = join(tmpdir(), `drf-museum-web-public-${visibility}-${stageId}`);

export default defineConfig({
  plugins: [react()],
  publicDir,
  build: {
    target: "es2022",
    // Production Pages builds do not publish browser source maps. The first
    // public prototype is a static release and has no error-ingestion service
    // that needs public .map files.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          "atlas-vendor": ["leaflet", "react-leaflet", "supercluster"],
        },
      },
    },
  },
});
