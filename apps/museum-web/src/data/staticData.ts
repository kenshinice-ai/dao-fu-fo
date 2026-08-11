import type {
  EntityData,
  EntityKind,
  ExhibitionData,
  GraphData,
  Locale,
  MapContextData,
  MuseumMapData,
  OverviewData,
  ProfileData,
  SearchItem,
  TimelineData,
} from "../types";
import { createReadModelPaths } from "@drf-museum/core";
import type {
  ContentQualityReport,
  ReadModelComparison,
  ReadModelAudioIndex,
  ReadModelRelationIndex,
  ReadModelReviewQueue,
  ReadModelSacredCosmos,
  ReadModelSourceIndex,
  ReadModelTextReading,
} from "@drf-museum/domain-schema";

const root = `${import.meta.env.BASE_URL}data/v2`;
const readModelPaths = createReadModelPaths(root);

function isJsonResponse(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").toLowerCase().includes("json");
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = path.startsWith(root) ? path : `${root}/${path}`;
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok || !isJsonResponse(response)) throw new Error(`Static data ${response.status}: ${url}`);
  return (await response.json()) as T;
}

async function requestWithFallback<T>(primaryPath: string, fallbackPath: string, signal?: AbortSignal): Promise<T> {
  const primaryUrl = primaryPath.startsWith(root) ? primaryPath : `${root}/${primaryPath}`;
  const response = await fetch(primaryUrl, { signal, cache: "no-store" });
  if (response.ok && isJsonResponse(response)) return (await response.json()) as T;
  if (!response.ok && response.status !== 404) throw new Error(`Static data ${response.status}: ${primaryUrl}`);
  return request<T>(fallbackPath, signal);
}

async function requestEntity(kind: EntityKind, slug: string, locale: Locale, signal?: AbortSignal): Promise<EntityData> {
  const path = readModelPaths.entity(kind, slug, locale);
  const response = await fetch(path, { signal, cache: "no-store" });
  if (response.ok && isJsonResponse(response)) return (await response.json()) as EntityData;
  if (!response.ok && response.status !== 404) throw new Error(`Static data ${response.status}: ${path}`);

  const index = await request<{ locale: Locale; items: SearchItem[] }>(readModelPaths.searchIndex(locale), signal);
  const item = index.items.find((candidate) => candidate.kind === kind && candidate.slug === slug);
  if (!item) throw new Error(`Entity not found: ${kind}/${slug}`);

  const generic = locale === "zh-CN"
    ? {
        researchNote: "这是第一版中的索引实体。完整来源、时间声明与关系详情将在下一批内容中补充。",
        evidence: "索引内容 · 待完整审校",
        timeLabel: "见相关展览与时间轴",
        sourceTitle: "道·儒·佛文明数字博物馆第一版内容索引",
        sourceRole: "原型索引；不是最终学术条目",
      }
    : {
        researchNote: "This is an indexed entity in the first release. Full sources, temporal assertions and relation detail will be added in the next content batch.",
        evidence: "Index content · full review pending",
        timeLabel: "See the related exhibition and timeline",
        sourceTitle: "First-release content index",
        sourceRole: "Prototype index; not a final scholarly entry",
      };

  return {
    locale,
    kind,
    slug,
    title: item.title,
    tradition: item.tradition,
    evidence: generic.evidence,
    timeLabel: generic.timeLabel,
    shortSummary: item.context,
    curatorialDescription: [item.context],
    researchNote: generic.researchNote,
    keyFacts: [],
    related: [],
    sources: [{ id: `source:index:${kind}:${slug}`, title: generic.sourceTitle, locator: `index:${kind}:${slug}`, grade: "C", role: generic.sourceRole }],
    profile: {},
  };
}

async function requestMapContext(locale: Locale, signal?: AbortSignal): Promise<MapContextData> {
  const loadOptionalRoute = (slug: string) => requestEntity("route", slug, locale, signal).catch((error: unknown) => {
    if (signal?.aborted) throw error;
    return null;
  });
  const [map, pilgrimageRoute, imperialCorridor, search] = await Promise.all([
    requestWithFallback<MuseumMapData>(
      readModelPaths.realMap("overview", locale),
      readModelPaths.realMap("suitang", locale),
      signal,
    ),
    loadOptionalRoute("xuanzang-western-pilgrimage"),
    loadOptionalRoute("changan-luoyang-imperial-corridor"),
    request<{ locale: Locale; items: SearchItem[] }>(readModelPaths.searchIndex(locale), signal),
  ]);
  return {
    map,
    routes: [pilgrimageRoute, imperialCorridor].filter((route): route is EntityData => route !== null),
    searchItems: search.items,
  };
}

export const staticData = {
  profile: (locale: Locale, signal?: AbortSignal) =>
    request<ProfileData>(readModelPaths.profile(locale), signal),
  overview: (locale: Locale, signal?: AbortSignal) =>
    request<OverviewData>(`overview/${locale}.json`, signal),
  exhibition: (slug: string, locale: Locale, signal?: AbortSignal) =>
    request<ExhibitionData>(`exhibitions/${slug}.${locale}.json`, signal),
  entity: (kind: EntityKind, slug: string, locale: Locale, signal?: AbortSignal) =>
    requestEntity(kind, slug, locale, signal),
  timeline: (locale: Locale, signal?: AbortSignal) =>
    requestWithFallback<TimelineData>(
      readModelPaths.timeline("overview", locale),
      readModelPaths.timeline("suitang", locale),
      signal,
    ),
  graph: (locale: Locale, signal?: AbortSignal) =>
    request<GraphData>(`graphs/three-traditions/overview.${locale}.json`, signal),
  map: (locale: Locale, signal?: AbortSignal) =>
    requestWithFallback<MuseumMapData>(
      readModelPaths.realMap("overview", locale),
      readModelPaths.realMap("suitang", locale),
      signal,
    ),
  mapContext: (locale: Locale, signal?: AbortSignal) =>
    requestMapContext(locale, signal),
  sacredCosmos: (locale: Locale, signal?: AbortSignal) =>
    request<ReadModelSacredCosmos>(readModelPaths.sacredCosmos("overview", locale), signal),
  comparison: (name: string, locale: Locale, signal?: AbortSignal) =>
    requestWithFallback<ReadModelComparison>(
      readModelPaths.comparison(name, locale),
      readModelPaths.comparison("public-rc-figures", locale),
      signal,
    ),
  textReading: (name: string, locale: Locale, signal?: AbortSignal) =>
    requestWithFallback<ReadModelTextReading>(
      readModelPaths.textReading(name, locale),
      readModelPaths.textReading("public-rc-passage-reading", locale),
      signal,
    ),
  searchIndex: (locale: Locale, signal?: AbortSignal) =>
    request<{ locale: Locale; items: SearchItem[] }>(readModelPaths.searchIndex(locale), signal),
  relations: (locale: Locale, signal?: AbortSignal) =>
    request<ReadModelRelationIndex>(readModelPaths.relations(locale), signal),
  sourceIndex: (locale: Locale, signal?: AbortSignal) =>
    request<ReadModelSourceIndex>(readModelPaths.sourceIndex(locale), signal),
  qualityReport: (signal?: AbortSignal) =>
    request<ContentQualityReport>(readModelPaths.manifest("quality-report"), signal),
  reviewQueue: (signal?: AbortSignal) =>
    request<ReadModelReviewQueue>(readModelPaths.manifest("review-queue"), signal),
  audio: (locale: Locale, signal?: AbortSignal) =>
    request<ReadModelAudioIndex>(readModelPaths.audio(locale), signal),
};
