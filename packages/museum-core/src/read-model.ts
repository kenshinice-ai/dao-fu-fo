import type {
  EntityKind,
  Locale,
  ReadModelEntityArtifact,
  ReadModelManifest,
} from "@drf-museum/domain-schema";

export interface ReadModelPaths {
  manifest: (name?: "content-version" | "content-report" | "quality-report" | "review-queue" | "checksums" | "routes") => string;
  profile: (locale: Locale) => string;
  searchIndex: (locale: Locale) => string;
  entity: (kind: EntityKind, slug: string, locale: Locale) => string;
  relations: (locale: Locale) => string;
  audio: (locale: Locale) => string;
  traditions: () => string;
  sourceIndex: (locale: Locale) => string;
  overview: (locale: Locale) => string;
  exhibition: (slug: string, locale: Locale) => string;
  realMap: (name: string, locale: Locale) => string;
  sacredCosmos: (tradition: string, locale: Locale) => string;
  timeline: (name: string, locale: Locale) => string;
  graph: (graphType: string, name: string, locale: Locale) => string;
}

export function createReadModelPaths(root = "data/v2"): ReadModelPaths {
  const base = root.replace(/\/+$/, "");
  return {
    manifest: (name = "content-version") => `${base}/manifest/${name}.json`,
    profile: (locale) => `${base}/profile/${locale}.json`,
    searchIndex: (locale) => `${base}/search/${locale}/index.json`,
    entity: (kind, slug, locale) => `${base}/entities/${kind}/${encodeURIComponent(slug)}.${locale}.json`,
    relations: (locale) => `${base}/relations/${locale}.json`,
    audio: (locale) => `${base}/audio/${locale}.json`,
    traditions: () => `${base}/traditions.json`,
    sourceIndex: (locale) => `${base}/sources/${locale}/index.json`,
    overview: (locale) => `${base}/overview/${locale}.json`,
    exhibition: (slug, locale) => `${base}/exhibitions/${encodeURIComponent(slug)}.${locale}.json`,
    realMap: (name, locale) => `${base}/maps/real/${encodeURIComponent(name)}.${locale}.geojson`,
    sacredCosmos: (tradition, locale) => `${base}/maps/cosmos/${encodeURIComponent(tradition)}.${locale}.json`,
    timeline: (name, locale) => `${base}/timeline/${encodeURIComponent(name)}.${locale}.json`,
    graph: (graphType, name, locale) => `${base}/graphs/${encodeURIComponent(graphType)}/${encodeURIComponent(name)}.${locale}.json`,
  };
}

export function isPublishableArtifact(artifact: Pick<ReadModelEntityArtifact, "publicationState" | "reviewStatus">): boolean {
  return artifact.publicationState === "public" && artifact.reviewStatus === "publishable";
}

export function isPublicManifest(manifest: Pick<ReadModelManifest, "visibility">): boolean {
  return manifest.visibility === "public";
}
