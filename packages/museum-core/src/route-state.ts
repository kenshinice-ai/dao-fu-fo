import {
  ConfidenceSchema,
  EntityKindSchema,
  EvidenceLayerSchema,
  LocaleSchema,
  TraditionSlugSchema,
} from "@drf-museum/domain-schema";
import { z } from "zod";

export const ExploreViewSchema = z.enum(["map", "cosmos", "timeline", "graph"]);
export type ExploreView = z.infer<typeof ExploreViewSchema>;

export const AtlasTabSchema = z.enum(["figures", "events", "places", "routes", "texts", "sayings", "relations"]);
export type AtlasTab = z.infer<typeof AtlasTabSchema>;

export const TimelineModeSchema = z.enum(["history", "tradition"]);
export type TimelineMode = z.infer<typeof TimelineModeSchema>;

export const ViewModeSchema = z.enum(["museum", "historical", "traditional", "conceptual", "research"]);
export type ViewMode = z.infer<typeof ViewModeSchema>;

export const GraphTypeSchema = z.enum([
  "figure-influence",
  "text-lineage",
  "school-lineage",
  "concept-evolution",
  "three-traditions",
]);
export type GraphType = z.infer<typeof GraphTypeSchema>;

export const MapLayerSchema = z.enum(["real", "cosmos"]);
export type MapLayer = z.infer<typeof MapLayerSchema>;

export const MapContentLayerSchema = z.enum(["places", "routes", "trajectories"]);
export type MapContentLayer = z.infer<typeof MapContentLayerSchema>;

export const ZoomLevelSchema = z.enum(["era", "region", "figure", "all"]);
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>;

export const RouteStateSchema = z.object({
  lang: LocaleSchema,
  view: ExploreViewSchema,
  atlasTab: AtlasTabSchema,
  timelineMode: TimelineModeSchema,
  mode: ViewModeSchema,
  from: z.number().int().optional(),
  to: z.number().int().optional(),
  traditions: z.array(TraditionSlugSchema).min(1),
  entityTypes: z.array(EntityKindSchema),
  evidence: z.array(EvidenceLayerSchema),
  certainty: z.array(ConfidenceSchema),
  focus: z.string().trim().min(1).optional(),
  detail: z.string().trim().min(1).optional(),
  compare: z.array(z.string().trim().min(1)).max(3),
  graphType: GraphTypeSchema,
  depth: z.number().int().min(1).max(2),
  query: z.string().trim().max(120).optional(),
  mapLayers: z.array(MapContentLayerSchema).max(3),
  zoomLevel: ZoomLevelSchema,
  hall: z.string().trim().min(1).optional(),
  section: z.string().trim().min(1).optional(),
  mapLayer: MapLayerSchema,
}).superRefine((value, context) => {
  if (value.from === 0 || value.to === 0) context.addIssue({ code: "custom", message: "year 0 is not allowed" });
  if (value.from !== undefined && value.to !== undefined && value.to < value.from) {
    context.addIssue({ code: "custom", message: "to cannot be earlier than from" });
  }
  if (value.view === "cosmos" && value.mapLayer !== "cosmos") {
    context.addIssue({ code: "custom", message: "cosmos view requires cosmos mapLayer" });
  }
  if (value.view === "map" && value.mapLayer === "cosmos") {
    context.addIssue({ code: "custom", message: "cosmos mapLayer requires cosmos view" });
  }
});
export type RouteState = z.infer<typeof RouteStateSchema>;

export const DEFAULT_ROUTE_STATE: RouteState = {
  lang: "zh-CN",
  view: "map",
  atlasTab: "figures",
  timelineMode: "history",
  mode: "historical",
  traditions: ["daoism", "confucianism", "buddhism"],
  entityTypes: [],
  evidence: [],
  certainty: [],
  compare: [],
  graphType: "three-traditions",
  depth: 1,
  mapLayers: ["places", "routes", "trajectories"],
  zoomLevel: "region",
  mapLayer: "real",
};

function parseNumber(value: string | null): number | undefined {
  if (!value || !/^-?\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed !== 0 ? parsed : undefined;
}

function parseList<T extends string>(value: string | null, schema: z.ZodType<T>): T[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => schema.safeParse(item).success);
}

function parseMapLayers(value: string | null): MapContentLayer[] {
  return parseList(value, MapContentLayerSchema);
}

function firstEnum<T extends string>(value: string | null, schema: z.ZodType<T>, fallback: T): T {
  return value && schema.safeParse(value).success ? value as T : fallback;
}

function atlasTabForFocus(focus: string | undefined, fallback: AtlasTab): AtlasTab {
  const kind = focus?.split(":")[0];
  if (kind === "figure") return "figures";
  if (kind === "event") return "events";
  if (kind === "place") return "places";
  if (kind === "route") return "routes";
  if (kind === "text") return "texts";
  if (kind === "passage") return "sayings";
  return fallback;
}

export function parseRouteState(search: string | URLSearchParams): RouteState {
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  const view = firstEnum(params.get("view"), ExploreViewSchema, DEFAULT_ROUTE_STATE.view);
  const requestedMapLayer = firstEnum(params.get("mapLayer"), MapLayerSchema, DEFAULT_ROUTE_STATE.mapLayer);
  const mapLayer = view === "cosmos" ? "cosmos" : requestedMapLayer === "cosmos" ? "real" : requestedMapLayer;
  const requestedTraditions = parseList(params.get("traditions"), TraditionSlugSchema);
  const requestedMapLayers = parseMapLayers(params.get("layers"));
  const hasExplicitMapLayers = params.has("layers");
  const requestedQuery = params.get("q")?.trim().slice(0, 120) || undefined;
  const focus = params.get("focus")?.trim() || undefined;
  const requestedTab = firstEnum(params.get("tab"), AtlasTabSchema, DEFAULT_ROUTE_STATE.atlasTab);
  const candidate = {
    ...DEFAULT_ROUTE_STATE,
    lang: firstEnum(params.get("lang"), LocaleSchema, DEFAULT_ROUTE_STATE.lang),
    view,
    atlasTab: params.has("tab") ? requestedTab : atlasTabForFocus(focus, requestedTab),
    timelineMode: firstEnum(params.get("timeline"), TimelineModeSchema, DEFAULT_ROUTE_STATE.timelineMode),
    mode: firstEnum(params.get("mode"), ViewModeSchema, DEFAULT_ROUTE_STATE.mode),
    from: parseNumber(params.get("from")),
    to: parseNumber(params.get("to")),
    traditions: requestedTraditions.length > 0 ? requestedTraditions : DEFAULT_ROUTE_STATE.traditions,
    entityTypes: parseList(params.get("entityTypes"), EntityKindSchema),
    evidence: parseList(params.get("evidence"), EvidenceLayerSchema),
    certainty: parseList(params.get("certainty"), ConfidenceSchema),
    focus,
    detail: params.get("detail")?.trim() || undefined,
    compare: params.get("compare") ? params.get("compare")!.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3) : [],
    graphType: firstEnum(params.get("graphType"), GraphTypeSchema, DEFAULT_ROUTE_STATE.graphType),
    depth: Math.min(2, Math.max(1, Number(params.get("depth")) || DEFAULT_ROUTE_STATE.depth)),
    query: requestedQuery,
    mapLayers: hasExplicitMapLayers ? requestedMapLayers : DEFAULT_ROUTE_STATE.mapLayers,
    zoomLevel: firstEnum(params.get("zoom"), ZoomLevelSchema, DEFAULT_ROUTE_STATE.zoomLevel),
    hall: params.get("hall")?.trim() || undefined,
    section: params.get("section")?.trim() || undefined,
    mapLayer,
  };
  const normalised = RouteStateSchema.safeParse(candidate);
  if (normalised.success) return normalised.data;
  return { ...DEFAULT_ROUTE_STATE, lang: candidate.lang, view: candidate.view, mode: candidate.mode };
}

export function serializeRouteState(state: RouteState): string {
  const parsed = RouteStateSchema.parse(state);
  const params = new URLSearchParams();
  params.set("lang", parsed.lang);
  if (parsed.view !== DEFAULT_ROUTE_STATE.view) params.set("view", parsed.view);
  const focusTab = atlasTabForFocus(parsed.focus, DEFAULT_ROUTE_STATE.atlasTab);
  if (parsed.atlasTab !== DEFAULT_ROUTE_STATE.atlasTab || parsed.atlasTab !== focusTab) params.set("tab", parsed.atlasTab);
  if (parsed.timelineMode !== DEFAULT_ROUTE_STATE.timelineMode) params.set("timeline", parsed.timelineMode);
  if (parsed.mode !== DEFAULT_ROUTE_STATE.mode) params.set("mode", parsed.mode);
  if (parsed.from !== undefined) params.set("from", String(parsed.from));
  if (parsed.to !== undefined) params.set("to", String(parsed.to));
  if (parsed.traditions.join(",") !== DEFAULT_ROUTE_STATE.traditions.join(",")) params.set("traditions", parsed.traditions.join(","));
  if (parsed.entityTypes.length > 0) params.set("entityTypes", parsed.entityTypes.join(","));
  if (parsed.evidence.length > 0) params.set("evidence", parsed.evidence.join(","));
  if (parsed.certainty.length > 0) params.set("certainty", parsed.certainty.join(","));
  if (parsed.focus) params.set("focus", parsed.focus);
  if (parsed.detail) params.set("detail", parsed.detail);
  if (parsed.compare.length > 0) params.set("compare", parsed.compare.join(","));
  if (parsed.graphType !== DEFAULT_ROUTE_STATE.graphType) params.set("graphType", parsed.graphType);
  if (parsed.depth !== DEFAULT_ROUTE_STATE.depth) params.set("depth", String(parsed.depth));
  if (parsed.query) params.set("q", parsed.query);
  if (parsed.mapLayers.join(",") !== DEFAULT_ROUTE_STATE.mapLayers.join(",")) params.set("layers", parsed.mapLayers.join(","));
  if (parsed.zoomLevel !== DEFAULT_ROUTE_STATE.zoomLevel) params.set("zoom", parsed.zoomLevel);
  if (parsed.hall) params.set("hall", parsed.hall);
  if (parsed.section) params.set("section", parsed.section);
  if (parsed.mapLayer !== DEFAULT_ROUTE_STATE.mapLayer) params.set("mapLayer", parsed.mapLayer);
  return params.toString();
}
