import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CivilisationMap } from "../components/CivilisationMap";
import { Icon } from "../components/Icon";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { RelationNetwork } from "../components/RelationNetwork";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { connectedContextKeys, matchesContextFocus, projectTimelineEvents } from "../data/contextProjection";
import { useStaticData } from "../data/useStaticData";
import { entityPath, parseRouteState, serializeRouteState } from "../routing";
import type { ExploreView, RouteState, ViewMode } from "../routing";
import type { ReadModelRelationIndex, ReadModelSacredCosmos } from "@drf-museum/domain-schema";
import type { EntityData, GraphData, Locale, MuseumMapData, SearchItem, TimelineData, TimelineEvent, Tradition } from "../types";

const MAP_VIEWBOX = { width: 980, height: 580 };
const MAP_MIN_ZOOM = 1;
const MAP_MAX_ZOOM = 4;
const MAP_ZOOM_FACTOR = 1.25;
const MAP_PAN_STEP = 48;
const HISTORICAL_TIMELINE_START = -600;
const HISTORICAL_TIMELINE_END = 1200;

interface MapPoint {
  x: number;
  y: number;
}

interface MapCamera {
  zoom: number;
  x: number;
  y: number;
}

const INITIAL_MAP_CAMERA: MapCamera = { zoom: MAP_MIN_ZOOM, x: 0, y: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampMapCamera(camera: MapCamera): MapCamera {
  const zoom = clamp(camera.zoom, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
  const minX = MAP_VIEWBOX.width * (1 - zoom);
  const minY = MAP_VIEWBOX.height * (1 - zoom);
  return {
    zoom,
    x: clamp(camera.x, minX, 0),
    y: clamp(camera.y, minY, 0),
  };
}

function zoomMapCamera(camera: MapCamera, nextZoom: number, focus: MapPoint): MapCamera {
  const zoom = clamp(nextZoom, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
  const ratio = zoom / camera.zoom;
  return clampMapCamera({
    zoom,
    x: focus.x - (focus.x - camera.x) * ratio,
    y: focus.y - (focus.y - camera.y) * ratio,
  });
}

function pointInSvgViewBox(svg: SVGSVGElement, clientX: number, clientY: number): MapPoint | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * MAP_VIEWBOX.width,
      y: ((clientY - rect.top) / rect.height) * MAP_VIEWBOX.height,
    };
  }
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

export function ExplorePage() {
  const { locale } = useMuseumContext();
  const [params, setParams] = useSearchParams();
  const routeState = parseRouteState(params);
  const contextState = useContextData(locale);
  const latestRouteState = useRef(routeState);
  latestRouteState.current = routeState;

  const changeView = (next: ExploreView) => {
    const currentState = latestRouteState.current;
    const mapLayer: RouteState["mapLayer"] = next === "cosmos" ? "cosmos" : "real";
    const nextState = { ...currentState, view: next, mapLayer };
    latestRouteState.current = nextState;
    setParams(serializeRouteState(nextState));
  };

  const updateRouteState = (changes: Partial<RouteState>) => {
    const currentState = latestRouteState.current;
    const nextView = changes.view ?? currentState.view;
    const mapLayer: RouteState["mapLayer"] = nextView === "cosmos"
      ? "cosmos"
      : changes.mapLayer ?? (currentState.view === "cosmos" ? "real" : currentState.mapLayer);
    const nextState = { ...currentState, ...changes, mapLayer };
    latestRouteState.current = nextState;
    setParams(serializeRouteState(nextState));
  };

  return (
    <section className="explore-page">
      <header className="explore-header page-shell">
        <div>
          <p className="eyebrow">Explore / {locale === "zh-CN" ? "历史时空地图" : "Historical space-time atlas"}</p>
          <h1>{locale === "zh-CN" ? "在同一张地图，看见三条传统的交错" : "See three traditions across historical space-time"}</h1>
        </div>
        <div className="view-switch" role="group" aria-label={locale === "zh-CN" ? "探索视图" : "Explore view"}>
          <button className={routeState.view === "map" ? "active" : ""} onClick={() => changeView("map")} type="button">
            <Icon name="map" /> {locale === "zh-CN" ? "地图" : "Map"}
          </button>
          <button className={routeState.view === "cosmos" ? "active" : ""} onClick={() => changeView("cosmos")} type="button">
            <Icon name="compass" /> {locale === "zh-CN" ? "神圣地理" : "Cosmos"}
          </button>
          <button className={routeState.view === "timeline" ? "active" : ""} onClick={() => changeView("timeline")} type="button">
            <Icon name="timeline" /> {locale === "zh-CN" ? "时间" : "Time"}
          </button>
          <button className={routeState.view === "graph" ? "active" : ""} onClick={() => changeView("graph")} type="button">
            <Icon name="graph" /> {locale === "zh-CN" ? "关系" : "Relations"}
          </button>
        </div>
      </header>
      <ExploreControls locale={locale} state={routeState} onChange={updateRouteState} />
      <ContextFocus locale={locale} focus={routeState.focus} data={contextState.data} error={contextState.error} onFocus={(focus) => updateRouteState({ focus })} />
      {routeState.view === "map" ? <MapView locale={locale} traditions={routeState.traditions} from={routeState.from} to={routeState.to} focus={routeState.focus} relations={contextState.data?.relations} onFocus={(focus) => updateRouteState({ focus })} /> : null}
      {routeState.view === "cosmos" ? <CosmosView locale={locale} traditions={routeState.traditions} focus={routeState.focus} relations={contextState.data?.relations} /> : null}
      {routeState.view === "timeline" ? <TimelineView locale={locale} traditions={routeState.traditions} from={routeState.from} to={routeState.to} focus={routeState.focus} relations={contextState.data?.relations} searchItems={contextState.data?.search.items ?? []} onFocus={(nextFocus) => updateRouteState({ focus: nextFocus, view: "map", mapLayer: "real" })} /> : null}
      {routeState.view === "graph" ? <GraphView locale={locale} traditions={routeState.traditions} focus={routeState.focus} relations={contextState.data?.relations} searchItems={contextState.data?.search.items ?? []} onFocus={(nextFocus) => updateRouteState({ focus: nextFocus })} /> : null}
    </section>
  );
}

function ExploreControls({
  locale,
  state,
  onChange,
}: {
  locale: Locale;
  state: RouteState;
  onChange: (changes: Partial<RouteState>) => void;
}) {
  const traditions: { slug: Tradition; zh: string; en: string }[] = [
    { slug: "daoism", zh: "道", en: "Dao" },
    { slug: "confucianism", zh: "儒", en: "Ru" },
    { slug: "buddhism", zh: "佛", en: "Fo" },
  ];
  const toggleTradition = (tradition: Tradition) => {
    const next = state.traditions.includes(tradition)
      ? state.traditions.filter((item) => item !== tradition)
      : [...state.traditions, tradition];
    if (next.length > 0) onChange({ traditions: next });
  };

  return (
    <div className="explore-controls page-shell" aria-label={locale === "zh-CN" ? "探索筛选" : "Explore filters"}>
      <div className="explore-control-group">
        <span className="control-label">{locale === "zh-CN" ? "传统" : "Traditions"}</span>
        <div className="tradition-filters" role="group" aria-label={locale === "zh-CN" ? "按传统筛选" : "Filter by tradition"}>
          {traditions.map((tradition) => {
            const active = state.traditions.includes(tradition.slug);
            return (
              <button
                className={`filter-chip tradition-chip-${tradition.slug} ${active ? "active" : ""}`}
                key={tradition.slug}
                onClick={() => toggleTradition(tradition.slug)}
                type="button"
                aria-pressed={active}
              >
                {locale === "zh-CN" ? tradition.zh : tradition.en}
              </button>
            );
          })}
        </div>
      </div>
      <label className="explore-mode-control">
        <span className="control-label">{locale === "zh-CN" ? "阅读模式" : "Reading mode"}</span>
        <select value={state.mode} onChange={(event) => onChange({ mode: event.target.value as ViewMode })}>
          <option value="museum">{locale === "zh-CN" ? "博物馆导览" : "Museum"}</option>
          <option value="historical">{locale === "zh-CN" ? "历史证据" : "Historical"}</option>
          <option value="traditional">{locale === "zh-CN" ? "传统叙事" : "Traditional"}</option>
          <option value="conceptual">{locale === "zh-CN" ? "概念比较" : "Conceptual"}</option>
          <option value="research">{locale === "zh-CN" ? "研究模式" : "Research"}</option>
        </select>
      </label>
      <TimeRangeControl locale={locale} state={state} onChange={onChange} />
      <p className="explore-state-note">
        {locale === "zh-CN"
          ? `可分享状态：${state.mode === "research" ? "研究模式" : "当前筛选"} · ${state.traditions.length} 条传统${state.view === "timeline" ? ` · ${state.from ?? HISTORICAL_TIMELINE_START}—${state.to ?? HISTORICAL_TIMELINE_END}` : ""}`
          : `Shareable state: ${state.mode} · ${state.traditions.length} tradition${state.traditions.length === 1 ? "" : "s"}${state.view === "timeline" ? ` · ${state.from ?? HISTORICAL_TIMELINE_START}–${state.to ?? HISTORICAL_TIMELINE_END}` : ""}`}
    </p>
    </div>
  );
}

function TimeRangeControl({
  locale,
  state,
  onChange,
}: {
  locale: Locale;
  state: RouteState;
  onChange: (changes: Partial<RouteState>) => void;
}) {
  if (state.view !== "timeline") return null;
  const start = state.from ?? HISTORICAL_TIMELINE_START;
  const end = state.to ?? HISTORICAL_TIMELINE_END;
  return (
    <fieldset className="time-range-control">
      <legend className="control-label">{locale === "zh-CN" ? "时间窗口" : "Time window"}</legend>
      <div className="time-range-inputs">
        <label>
          <span>{locale === "zh-CN" ? "起始" : "From"}</span>
          <input
            type="number"
            min={HISTORICAL_TIMELINE_START}
            max={HISTORICAL_TIMELINE_END}
            step={1}
            value={start}
            aria-label={locale === "zh-CN" ? "时间起始年份" : "Timeline start year"}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isInteger(next) && next >= HISTORICAL_TIMELINE_START && next <= HISTORICAL_TIMELINE_END && next !== 0) onChange({ from: next, to: Math.max(next, end) });
            }}
          />
        </label>
        <span aria-hidden="true">—</span>
        <label>
          <span>{locale === "zh-CN" ? "结束" : "To"}</span>
          <input
            type="number"
            min={HISTORICAL_TIMELINE_START}
            max={HISTORICAL_TIMELINE_END}
            step={1}
            value={end}
            aria-label={locale === "zh-CN" ? "时间结束年份" : "Timeline end year"}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isInteger(next) && next >= HISTORICAL_TIMELINE_START && next <= HISTORICAL_TIMELINE_END && next !== 0) onChange({ from: Math.min(start, next), to: next });
            }}
          />
        </label>
        {(state.from !== undefined || state.to !== undefined) ? (
          <button className="time-range-reset" type="button" onClick={() => onChange({ from: undefined, to: undefined })}>
            {locale === "zh-CN" ? "全段" : "Full range"}
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}

function localizedProfileText(profile: Record<string, unknown>, key: string, locale: Locale): string | undefined {
  const value = profile[key];
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const localized = (value as Record<string, unknown>)[locale];
  return typeof localized === "string" ? localized : undefined;
}

interface ContextData {
  relations: ReadModelRelationIndex;
  search: { locale: Locale; items: SearchItem[] };
}

function useContextData(locale: Locale) {
  const loader = useCallback(async (signal: AbortSignal): Promise<ContextData> => {
    const [relations, search] = await Promise.all([
      staticData.relations(locale, signal),
      staticData.searchIndex(locale, signal),
    ]);
    return { relations, search };
  }, [locale]);
  return useStaticData(loader);
}

const CONTEXT_LABELS: Record<string, { "zh-CN": string; en: string }> = {
  "figure:xuanzang": { "zh-CN": "玄奘", en: "Xuanzang" },
  "figure:sima-chengzhen": { "zh-CN": "司马承祯", en: "Sima Chengzhen" },
  "figure:kong-yingda": { "zh-CN": "孔颖达", en: "Kong Yingda" },
  "figure:laozi": { "zh-CN": "老子（李耳）", en: "Laozi (Li Er)" },
  "figure:confucius": { "zh-CN": "孔子（孔丘）", en: "Confucius (Kong Qiu)" },
  "figure:sakyamuni": { "zh-CN": "释迦牟尼佛", en: "Śākyamuni Buddha" },
  "event:xuanzang-departs-changan": { "zh-CN": "玄奘离开长安西行", en: "Xuanzang departs Chang'an" },
  "event:xuanzang-return-changan": { "zh-CN": "玄奘回到长安", en: "Xuanzang returns to Chang'an" },
  "event:kaiyuan-institutional-expansion": { "zh-CN": "开元时期制度扩展", en: "Kaiyuan institutional expansion" },
  "event:five-classics-corrected-meanings-project": { "zh-CN": "《五经正义》编纂工程", en: "Corrected Meanings compilation project" },
  "event:confucius-asks-laozi-about-rites": { "zh-CN": "孔子适周问礼于老子", en: "Confucius asks Laozi about rites" },
  "event:buddha-first-sermon-at-sarnath": { "zh-CN": "佛陀在鹿野苑初转法轮", en: "Buddha's first sermon at Sarnath" },
  "institution:daci-en-monastery": { "zh-CN": "大慈恩寺", en: "Great Ci'en Monastery" },
  "institution:changan-translation-bureau": { "zh-CN": "长安译经场网络", en: "Chang'an translation-bureau network" },
  "institution:changan-daoist-monastic-network": { "zh-CN": "长安道教宫观网络", en: "Chang'an Daoist institutional network" },
  "institution:guozijian": { "zh-CN": "国子监", en: "Guozijian" },
  "text:great-tang-records-western-regions": { "zh-CN": "《大唐西域记》", en: "Record of the Western Regions" },
  "text:five-classics-corrected-meanings": { "zh-CN": "《五经正义》", en: "Corrected Meanings of the Five Classics" },
  "text:dhammacakkappavattana-sutta": { "zh-CN": "《转法轮经》", en: "Dhammacakkappavattana Sutta" },
  "place:changan": { "zh-CN": "长安", en: "Chang'an" },
  "place:dunhuang": { "zh-CN": "敦煌", en: "Dunhuang" },
  "place:luoyang": { "zh-CN": "洛阳", en: "Luoyang" },
  "place:sarnath": { "zh-CN": "鹿野苑", en: "Sarnath" },
};

function contextTitle(key: string, locale: Locale, searchMap: Map<string, string>): string {
  return searchMap.get(key) ?? CONTEXT_LABELS[key]?.[locale] ?? key.split(":").slice(1).join(":").replaceAll("-", " ");
}

function ContextFocus({
  locale,
  focus,
  data,
  error,
  onFocus,
}: {
  locale: Locale;
  focus?: string;
  data: ContextData | null;
  error: Error | null;
  onFocus: (focus?: string) => void;
}) {
  if (error) {
    return (
      <section className="context-focus page-shell" aria-live="polite">
        <p className="context-focus-error">
          {locale === "zh-CN" ? "共享语境暂时无法载入。" : "The shared context is temporarily unavailable."}
        </p>
      </section>
    );
  }
  if (!data) return null;

  const searchMap = new Map(data.search.items.map((item) => [`${item.kind}:${item.slug}`, item.title]));
  const connected = focus
    ? data.relations.items.filter((relation) => `${relation.source.kind}:${relation.source.slug}` === focus || `${relation.target.kind}:${relation.target.slug}` === focus)
    : [];
  const figureKeys = data.search.items
    .filter((item) => item.kind === "figure")
    .map((item) => `${item.kind}:${item.slug}`);
  const suggestedKeys = [
    ...figureKeys,
    "place:changan",
    "place:luoyang",
    "place:sarnath",
    "event:xuanzang-departs-changan",
    "event:xuanzang-return-changan",
    "event:kaiyuan-institutional-expansion",
    "event:five-classics-corrected-meanings-project",
    "event:confucius-asks-laozi-about-rites",
    "event:buddha-first-sermon-at-sarnath",
    "institution:daci-en-monastery",
    "text:great-tang-records-western-regions",
    "institution:changan-daoist-monastic-network",
    "institution:guozijian",
    "text:five-classics-corrected-meanings",
    "text:dhammacakkappavattana-sutta",
  ].filter((key) => data.relations.items.some((relation) => `${relation.source.kind}:${relation.source.slug}` === key || `${relation.target.kind}:${relation.target.slug}` === key));
  const pickerKeys = Array.from(new Set(focus ? [focus, ...suggestedKeys] : suggestedKeys));
  const activeTitle = focus ? contextTitle(focus, locale, searchMap) : "";

  return (
    <section className="context-focus page-shell" aria-labelledby="context-focus-title">
      <div className="context-focus-heading">
        <p className="eyebrow">{locale === "zh-CN" ? "共享语境" : "Shared context"}</p>
        <h2 id="context-focus-title">
          {focus
            ? (locale === "zh-CN" ? `正在聚焦：${activeTitle}` : `Focused on: ${activeTitle}`)
            : (locale === "zh-CN" ? "从一个对象进入整组关系" : "Enter the wider context from one object")}
        </h2>
        <p>
          {locale === "zh-CN"
            ? "人物、事件、地点、机构、文本和后世语境来自同一组可追溯关系。"
            : "Figures, events, places, institutions, texts and later reception come from one traceable relation set."}
        </p>
      </div>
      <div className="context-focus-body">
        <div className="context-focus-picker" role="group" aria-label={locale === "zh-CN" ? "选择语境对象" : "Choose a context object"}>
          {pickerKeys.map((key) => (
            <button
              className={`context-focus-chip ${focus === key ? "active" : ""}`}
              key={key}
              type="button"
              onClick={() => onFocus(focus === key ? undefined : key)}
              aria-pressed={focus === key}
            >
              {contextTitle(key, locale, searchMap)}
            </button>
          ))}
          {focus ? (
            <button className="context-focus-clear" type="button" onClick={() => onFocus(undefined)}>
              {locale === "zh-CN" ? "清除聚焦" : "Clear focus"}
            </button>
          ) : null}
        </div>
        {focus ? (
          connected.length > 0 ? (
            <ul className="context-relation-list">
              {connected.map((relation) => {
                const sourceKey = `${relation.source.kind}:${relation.source.slug}`;
                const targetKey = `${relation.target.kind}:${relation.target.slug}`;
                const otherKey = sourceKey === focus ? targetKey : sourceKey;
                const relationTime = relation.temporalAssertions.map((assertion) => assertion.displayDate).join(" · ");
                const otherEndpoint = sourceKey === focus ? relation.target : relation.source;
                const otherHasStaticEntity = searchMap.has(otherKey);
                return (
                  <li key={relation.id}>
                    <div>
                      <strong>{sourceKey === focus ? activeTitle : contextTitle(otherKey, locale, searchMap)} → {sourceKey === focus ? contextTitle(otherKey, locale, searchMap) : activeTitle}</strong>
                      <span>{relation.label}</span>
                      {relationTime ? <small>{relationTime}</small> : <small>{relation.evidenceLayer}</small>}
                    </div>
                    <div className="context-relation-actions">
                      <button type="button" onClick={() => onFocus(otherKey)}>
                        {locale === "zh-CN" ? "聚焦" : "Focus"}
                      </button>
                      {otherHasStaticEntity ? <Link to={entityPath(otherEndpoint.kind, otherEndpoint.slug, locale)}>{locale === "zh-CN" ? "打开条目" : "Open entry"}</Link> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="context-focus-empty">{locale === "zh-CN" ? "当前对象暂无可展示的一跳关系。" : "No one-hop relations are available for this object."}</p>
          )
        ) : (
          <p className="context-focus-empty">{locale === "zh-CN" ? "选择一个对象，地图、时间和关系视图会围绕它展开。" : "Choose an object to organise the map, timeline and relation view around it."}</p>
        )}
        {focus?.startsWith("figure:") ? (
          <RelationNetwork
            locale={locale}
            focus={focus}
            relations={data.relations}
            searchItems={data.search.items}
            onFocus={onFocus}
            peopleOnly
          />
        ) : null}
      </div>
    </section>
  );
}

function MapView({ locale, traditions, from, to, focus, relations, onFocus }: { locale: Locale; traditions: Tradition[]; from?: number; to?: number; focus?: string; relations?: ReadModelRelationIndex; onFocus: (focus: string) => void }) {
  const loader = useCallback((signal: AbortSignal) => staticData.mapContext(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  return <CivilisationMap data={data.map} routes={data.routes} locale={locale} traditions={traditions} from={from} to={to} focus={focus} relations={relations} searchItems={data.searchItems} onFocus={onFocus} />;
}

function MapPlate({ data, routes, locale, traditions, focus, relations }: { data: MuseumMapData; routes: EntityData[]; locale: Locale; traditions: Tradition[]; focus?: string; relations?: ReadModelRelationIndex }) {
  const navigate = useNavigate();
  const [camera, setCamera] = useState<MapCamera>(INITIAL_MAP_CAMERA);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPoint: MapPoint;
    startCamera: MapCamera;
  } | null>(null);
  const connectedKeys = useMemo(() => connectedContextKeys(relations, focus), [focus, relations]);
  const visibleFeatures = useMemo(() => {
    const traditionFeatures = data.features.filter((feature) =>
      feature.properties.tradition === "convergence" || traditions.includes(feature.properties.tradition),
    );
    if (!focus) return traditionFeatures;
    const contextualFeatures = traditionFeatures.filter((feature) => connectedKeys.has(`place:${feature.properties.slug}`));
    return contextualFeatures.length > 0 ? contextualFeatures : traditionFeatures;
  }, [connectedKeys, data.features, focus, traditions]);
  const bounds = useMemo(() => {
    const features = visibleFeatures.length > 0 ? visibleFeatures : data.features;
    const lons = features.map((feature) => feature.geometry.coordinates[0]);
    const lats = features.map((feature) => feature.geometry.coordinates[1]);
    return { minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
  }, [data, visibleFeatures]);

  const mapPositions = useMemo(() => {
    const offsets = [
      { x: 0, y: 0 },
      { x: 34, y: -28 },
      { x: -34, y: -28 },
      { x: 38, y: 30 },
      { x: -38, y: 30 },
      { x: 0, y: -42 },
      { x: 0, y: 42 },
    ];
    const placed: Array<{ base: MapPoint; position: MapPoint }> = [];
    const positions = new Map<string, { base: MapPoint; position: MapPoint }>();
    for (const feature of visibleFeatures) {
      const [lon, lat] = feature.geometry.coordinates;
      const base = {
        x: 80 + ((lon - bounds.minLon) / Math.max(0.01, bounds.maxLon - bounds.minLon)) * 820,
        y: 510 - ((lat - bounds.minLat) / Math.max(0.01, bounds.maxLat - bounds.minLat)) * 390,
      };
      const clusterSize = placed.filter(({ base: previous }) => Math.hypot(previous.x - base.x, previous.y - base.y) < 44).length;
      const offset = offsets[clusterSize % offsets.length];
      const position = {
        x: clamp(base.x + offset.x, 36, MAP_VIEWBOX.width - 36),
        y: clamp(base.y + offset.y, 36, MAP_VIEWBOX.height - 36),
      };
      const item = { base, position };
      placed.push(item);
      positions.set(feature.id, item);
    }
    return positions;
  }, [bounds, visibleFeatures]);

  const routeSegments = useMemo(() => {
    const featurePositions = new Map(visibleFeatures.map((feature) => [feature.properties.slug, mapPositions.get(feature.id)?.base]));
    return routes.flatMap((route) => {
      const profile = route.profile ?? {};
      const waypointSlugs = Array.isArray(profile.waypointSlugs)
        ? profile.waypointSlugs.filter((slug): slug is string => typeof slug === "string")
        : [];
      const points = waypointSlugs.map((slug) => featurePositions.get(slug)).filter((point): point is MapPoint => Boolean(point));
      if (points.length < 2) return [];
      const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
      return [{ route, d, note: localizedProfileText(profile, "corridorNote", locale) }];
    });
  }, [locale, mapPositions, routes, visibleFeatures]);

  const centerPoint = { x: MAP_VIEWBOX.width / 2, y: MAP_VIEWBOX.height / 2 };
  const zoomBy = (factor: number, focus = centerPoint) => {
    setCamera((current) => zoomMapCamera(current, current.zoom * factor, focus));
  };
  const resetCamera = () => {
    dragRef.current = null;
    setIsDragging(false);
    setCamera(INITIAL_MAP_CAMERA);
  };
  const panBy = (x: number, y: number) => {
    setCamera((current) => clampMapCamera({ ...current, x: current.x + x, y: current.y + y }));
  };
  const getPoint = (clientX: number, clientY: number) => {
    return svgRef.current ? pointInSvgViewBox(svgRef.current, clientX, clientY) : null;
  };
  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const focus = getPoint(event.clientX, event.clientY) ?? centerPoint;
    zoomBy(event.deltaY < 0 ? MAP_ZOOM_FACTOR : 1 / MAP_ZOOM_FACTOR, focus);
  };
  const handleDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    const focus = getPoint(event.clientX, event.clientY) ?? centerPoint;
    zoomBy(MAP_ZOOM_FACTOR, focus);
  };
  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const startPoint = getPoint(event.clientX, event.clientY);
    if (!startPoint) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startPoint, startCamera: camera };
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = getPoint(event.clientX, event.clientY);
    if (!point) return;
    const deltaX = point.x - drag.startPoint.x;
    const deltaY = point.y - drag.startPoint.y;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      setIsDragging(true);
    }
    setCamera(clampMapCamera({
      ...drag.startCamera,
      x: drag.startCamera.x + deltaX,
      y: drag.startCamera.y + deltaY,
    }));
  };
  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  };
  const handleMapKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(MAP_ZOOM_FACTOR);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(1 / MAP_ZOOM_FACTOR);
    } else if (event.key === "0") {
      event.preventDefault();
      resetCamera();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      panBy(MAP_PAN_STEP, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      panBy(-MAP_PAN_STEP, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      panBy(0, MAP_PAN_STEP);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      panBy(0, -MAP_PAN_STEP);
    }
  };
  const openPlace = (slug: string) => {
    navigate(entityPath("place", slug, locale));
  };

  return (
    <div className="explore-golden page-shell">
      <div className="map-canvas">
        <div className="canvas-title">
          <span>{locale === "zh-CN" ? "历史地理示意 · 坐标来自现实地点" : "Historical geography · real coordinates"}</span>
          <div className="map-title-meta">
            <strong>{HISTORICAL_TIMELINE_START}—{HISTORICAL_TIMELINE_END}</strong>
            <div className="map-tools" aria-label={locale === "zh-CN" ? "地图控制" : "Map controls"}>
              <button
                className="map-control-button"
                type="button"
                onClick={() => zoomBy(MAP_ZOOM_FACTOR)}
                disabled={camera.zoom >= MAP_MAX_ZOOM}
                aria-label={locale === "zh-CN" ? "放大地图" : "Zoom in"}
              >
                +
              </button>
              <button
                className="map-control-button"
                type="button"
                onClick={() => zoomBy(1 / MAP_ZOOM_FACTOR)}
                disabled={camera.zoom <= MAP_MIN_ZOOM}
                aria-label={locale === "zh-CN" ? "缩小地图" : "Zoom out"}
              >
                −
              </button>
              <button
                className="map-control-button map-reset-button"
                type="button"
                onClick={resetCamera}
                aria-label={locale === "zh-CN" ? "重置地图视图" : "Reset map view"}
              >
                {locale === "zh-CN" ? "重置" : "Reset"}
              </button>
              <strong aria-live="polite">{Math.round(camera.zoom * 100)}%</strong>
            </div>
          </div>
        </div>
        <div className={`map-viewport ${isDragging ? "is-dragging" : ""}`}>
          <svg
            ref={svgRef}
            id="historical-map"
            viewBox="0 0 980 580"
            role="group"
            tabIndex={0}
            aria-labelledby="map-title map-desc"
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={handleMapKeyDown}
          >
          <title id="map-title">{locale === "zh-CN" ? "隋唐佛道儒地点示意图" : "Sui–Tang sites across three traditions"}</title>
          <desc id="map-desc">
            {locale === "zh-CN"
              ? "依据真实经纬度投影的地点示意，重点显示长安、洛阳、敦煌和五台山。可使用鼠标滚轮、拖动或键盘方向键探索地图。"
              : "A schematic projected from real coordinates, highlighting Chang'an, Luoyang, Dunhuang and Mount Wutai. Explore with the wheel, drag gestures or arrow keys."}
          </desc>
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(32,37,34,.09)" strokeWidth="1" />
            </pattern>
          </defs>
          <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
            <rect width="980" height="580" fill="url(#mapGrid)" />
            <path className="map-river" d="M34 330C180 260 350 390 502 316s298-118 448-52" />
            {routeSegments.map(({ route, d }) => <path className="map-route" d={d} key={route.slug}><title>{route.title}</title></path>)}
            {visibleFeatures.map((feature) => {
              const mapPosition = mapPositions.get(feature.id);
              if (!mapPosition) return null;
              const { base, position } = mapPosition;
              const isOffset = base.x !== position.x || base.y !== position.y;
              return (
                <line
                  key={`${feature.id}-cluster-line`}
                  className={isOffset ? "map-cluster-line" : "map-cluster-line is-hidden"}
                  x1={base.x}
                  y1={base.y}
                  x2={position.x}
                  y2={position.y}
                />
              );
            })}
            {visibleFeatures.map((feature) => {
              const mapPosition = mapPositions.get(feature.id);
              if (!mapPosition) return null;
              const placeLabel = locale === "zh-CN"
                ? `打开地点：${feature.properties.title}`
                : `Open place: ${feature.properties.title}`;
              return (
                <g
                  key={feature.id}
                  className={`map-node tradition-${feature.properties.tradition} ${matchesContextFocus([`place:${feature.properties.slug}`], focus, connectedKeys) ? "is-focused" : ""}`}
                  transform={`translate(${mapPosition.position.x} ${mapPosition.position.y})`}
                  role="link"
                  tabIndex={0}
                  aria-label={placeLabel}
                  data-map-node="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    openPlace(feature.properties.slug);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      openPlace(feature.properties.slug);
                    }
                  }}
                >
                  <circle r={feature.properties.slug === "changan" ? 17 : 10} />
                  <text x="0" y="-18" textAnchor="middle">{feature.properties.title}</text>
                </g>
              );
            })}
            <g className="map-compass" transform="translate(920 70)"><path d="M0 28V-22M-6-10 0-22l6 12" /><text x="0" y="-31" textAnchor="middle">N</text></g>
          </g>
          </svg>
        </div>
        <p className="map-interaction-note">
          {locale === "zh-CN"
            ? "滚轮缩放 · 拖动平移 · 双击放大 · 地点节点可打开详情 · 键盘：方向键、+ / −、0"
            : "Wheel to zoom · drag to pan · double-click to zoom · select a place node · keyboard: arrows, + / −, 0"}
        </p>
      </div>
      <aside className="explore-evidence">
        <p className="eyebrow">{locale === "zh-CN" ? "地点列表" : "Place list"}</p>
        <h2>{locale === "zh-CN" ? "帝国城市与传播网络" : "Imperial cities and networks"}</h2>
        <p>{locale === "zh-CN" ? "本版只显示有现实地理指向的地点。神圣地理不会被写成伪经纬度。" : "Only places with real geographic referents appear here. Sacred geography is never assigned false coordinates."}</p>
        {routeSegments.length > 0 ? (
          <section className="map-route-ledger" aria-labelledby="map-route-ledger-title">
            <p className="eyebrow">{locale === "zh-CN" ? "路线廊道" : "Route corridors"}</p>
            <h3 id="map-route-ledger-title">{locale === "zh-CN" ? "由路线实体派生的空间连接" : "Spatial links derived from route entities"}</h3>
            <ul>
              {routeSegments.map(({ route, note }) => (
                <li key={route.slug}>
                  <Link to={entityPath("route", route.slug, locale)}>{route.title}</Link>
                  <span>{route.timeLabel}</span>
                  {note ? <p>{note}</p> : <p>{route.shortSummary}</p>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <ul className="evidence-list">
          {visibleFeatures.map((feature) => (
            <li key={feature.id}>
              <TraditionMark tradition={feature.properties.tradition} size="sm" />
              <div>
                <Link to={entityPath("place", feature.properties.slug, locale)}>{feature.properties.title}</Link>
                <span>{feature.properties.placeReality} · {feature.properties.coordinateConfidence}</span>
                <p>{feature.properties.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function TimelineView({ locale, traditions, from, to, focus, relations, searchItems, onFocus }: { locale: Locale; traditions: Tradition[]; from?: number; to?: number; focus?: string; relations?: ReadModelRelationIndex; searchItems: SearchItem[]; onFocus: (focus: string) => void }) {
  const loader = useCallback((signal: AbortSignal) => staticData.timeline(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  return <TimelinePlate data={data} locale={locale} traditions={traditions} from={from} to={to} focus={focus} relations={relations} searchItems={searchItems} onFocus={onFocus} />;
}

function formatTimelineYear(year: number, locale: Locale): string {
  if (year < 0) return locale === "zh-CN" ? `前${Math.abs(year)}年` : `${Math.abs(year)} BCE`;
  return locale === "zh-CN" ? `${year}年` : String(year);
}

function timelineTicks(startYear: number, endYear: number): number[] {
  if (startYear === endYear) return startYear === 0 ? [] : [startYear];
  const rawStep = Math.max(1, (endYear - startYear) / 6);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;
  const multiplier = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  const step = Math.max(1, multiplier * magnitude);
  const first = Math.ceil(startYear / step) * step;
  const ticks: number[] = [];
  for (let year = first; year <= endYear; year += step) {
    if (year !== 0) ticks.push(year);
  }
  return ticks;
}

function timelineEventFocus(event: TimelineEvent): string {
  return event.contextKeys?.find((key) => key.startsWith("place:"))
    ?? (event.kind === "event"
      ? event.kind + ":" + event.slug
      : event.entity ? event.entity.kind + ":" + event.entity.slug : event.kind + ":" + event.slug);
}

function TimelinePlate({ data, locale, traditions, from, to, focus, relations, searchItems, onFocus }: { data: TimelineData; locale: Locale; traditions: Tradition[]; from?: number; to?: number; focus?: string; relations?: ReadModelRelationIndex; searchItems: SearchItem[]; onFocus: (focus: string) => void }) {
  const startYear = from ?? data.startYear;
  const endYear = to ?? data.endYear;
  const projectedEvents = useMemo(() => projectTimelineEvents(data, relations, searchItems, focus), [data, focus, relations, searchItems]);
  const visibleEvents = projectedEvents.filter((event) => {
    const eventEnd = event.endYear ?? event.year;
    return eventEnd >= startYear && event.year <= endYear && (event.tradition === "convergence" || traditions.includes(event.tradition));
  });
  const connectedKeys = useMemo(() => connectedContextKeys(relations, focus), [focus, relations]);
  const xFor = (year: number) => 55 + ((year - startYear) / Math.max(1, endYear - startYear)) * 870;
  const lanes: Record<Tradition | "convergence", number> = { buddhism: 120, daoism: 220, confucianism: 320, convergence: 420 };
  const eventPositions = useMemo(() => {
    const stackCounts = new Map<string, number>();
    return new Map(visibleEvents.map((event) => {
      const stackKey = event.tradition + ":" + event.year;
      const stackIndex = stackCounts.get(stackKey) ?? 0;
      stackCounts.set(stackKey, stackIndex + 1);
      const offset = (Math.min(stackIndex, 4) - 2);
      return [event.id, {
        x: xFor(event.year) + offset * 7,
        y: lanes[event.tradition] + offset * 13,
      }];
    }));
  }, [endYear, startYear, visibleEvents]);
  return (
    <div className="explore-golden page-shell">
      <div className="timeline-canvas">
        <div className="canvas-title"><span>{data.title}</span><strong>{formatTimelineYear(startYear, locale)}—{formatTimelineYear(endYear, locale)}</strong></div>
        <svg viewBox="0 0 980 520" role="group" aria-labelledby="timeline-title">
          <title id="timeline-title">{data.title}</title>
          {Object.entries(lanes).map(([tradition, y]) => (
            <g key={tradition}>
              <line x1="55" x2="925" y1={y} y2={y} className="timeline-line" />
              <text x="20" y={y + 5} className="timeline-lane-label">
                {tradition === "buddhism" ? "佛" : tradition === "daoism" ? "道" : tradition === "confucianism" ? "儒" : "合"}
              </text>
            </g>
          ))}
          {visibleEvents.map((event) => {
            const position = eventPositions.get(event.id);
            const x = position?.x ?? xFor(Math.max(startYear, event.year));
            const y = position?.y ?? lanes[event.tradition];
            const eventKey = `${event.kind}:${event.slug}`;
            const eventKeys = [eventKey, event.id, ...(event.contextKeys ?? [])];
            const isFocused = matchesContextFocus(eventKeys, focus, connectedKeys);
            const targetFocus = timelineEventFocus(event);
            return (
              <g
                key={event.id}
                className={"timeline-event tradition-" + event.tradition + (isFocused ? " is-focused" : "")}
                transform={"translate(" + x + " " + y + ")"}
                role="button"
                tabIndex={0}
                data-timeline-focus={targetFocus}
                aria-label={(locale === "zh-CN" ? "定位地图：" : "Locate on map: ") + event.title}
                onClick={() => onFocus(targetFocus)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                    keyboardEvent.preventDefault();
                    onFocus(targetFocus);
                  }
                }}
              >
                <circle r="8" />
                <line y1="-8" y2="-36" />
                <text y="-45" textAnchor="middle">{formatTimelineYear(event.year, locale)}</text>
              </g>
            );
          })}
          {timelineTicks(startYear, endYear).map((year) => (
            <g key={year} transform={`translate(${xFor(year)} 480)`}>
              <line y1="-18" y2="0" className="timeline-tick" />
              <text y="22" textAnchor="middle">{formatTimelineYear(year, locale)}</text>
            </g>
          ))}
        </svg>
      </div>
      <aside className="explore-evidence">
        <p className="eyebrow">{locale === "zh-CN" ? "事件列表" : "Event list"}</p>
        <h2>{locale === "zh-CN" ? "同一时空，不同节奏" : "One space-time, different rhythms"}</h2>
        <ul className="timeline-list">
          {visibleEvents.map((event) => (
            <li key={event.id}>
              <span className={`timeline-year tradition-border-${event.tradition}`}>{event.displayDate ?? event.year}</span>
              <div>
                <button className="timeline-event-select" type="button" onClick={() => onFocus(timelineEventFocus(event))}>{event.title}</button>
                <Link className="timeline-dossier-link" to={entityPath(event.entity?.kind ?? event.kind, event.entity?.slug ?? event.slug, locale)}>{locale === "zh-CN" ? "打开档案" : "Open dossier"}</Link>
                <p>{event.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function GraphView({ locale, traditions, focus, relations, searchItems, onFocus }: { locale: Locale; traditions: Tradition[]; focus?: string; relations?: ReadModelRelationIndex; searchItems: SearchItem[]; onFocus: (focus: string) => void }) {
  const loader = useCallback((signal: AbortSignal) => staticData.graph(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  return <GraphPlate data={data} locale={locale} traditions={traditions} focus={focus} relations={relations} searchItems={searchItems} onFocus={onFocus} />;
}

function GraphPlate({ data, locale, traditions, focus, relations, searchItems, onFocus }: { data: GraphData; locale: Locale; traditions: Tradition[]; focus?: string; relations?: ReadModelRelationIndex; searchItems: SearchItem[]; onFocus: (focus: string) => void }) {
  const connectedKeys = useMemo(() => connectedContextKeys(relations, focus), [focus, relations]);
  const visibleNodes = data.nodes.filter((node) => {
    if (node.tradition !== "convergence" && !traditions.includes(node.tradition)) return false;
    if (!focus) return true;
    return matchesContextFocus([node.id, `${node.kind}:${node.slug}`], focus, connectedKeys);
  });
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = data.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  const nodes = new Map(visibleNodes.map((node) => [node.id, node]));
  return (
    <div className="explore-golden page-shell">
      <div className="graph-canvas">
        <div className="canvas-title"><span>{data.title}</span><strong>depth 1</strong></div>
        <svg viewBox="0 0 980 580" role="group" aria-labelledby="graph-title graph-desc">
          <title id="graph-title">{data.title}</title>
          <desc id="graph-desc">
            {locale === "zh-CN"
              ? "可交互的一跳关系图。选择节点可打开对应条目。"
              : "Interactive one-hop relationship graph. Select a node to open its entity page."}
          </desc>
          {visibleEdges.map((edge) => {
            const source = nodes.get(edge.source);
            const target = nodes.get(edge.target);
            if (!source || !target) return null;
            return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="graph-edge" />;
          })}
          {visibleNodes.map((node) => (
            <Link
              key={node.id}
              to={entityPath(node.kind, node.slug, locale)}
              onClick={(event) => {
                event.preventDefault();
                onFocus(node.kind + ":" + node.slug);
              }}
              className={`graph-node tradition-${node.tradition} ${matchesContextFocus([`${node.kind}:${node.slug}`, node.id], focus, connectedKeys) ? "is-focused" : ""}`}
            >
              <circle cx={node.x} cy={node.y} r={node.kind === "concept" ? 34 : 28} />
              <text x={node.x} y={node.y + 5} textAnchor="middle">{node.label}</text>
            </Link>
          ))}
        </svg>
      </div>
      <aside
        className="explore-evidence"
        tabIndex={0}
        aria-label={locale === "zh-CN" ? "问题图谱证据列表" : "Question graph evidence list"}
      >
        <p className="eyebrow">{locale === "zh-CN" ? "问题图谱" : "Question graph"}</p>
        <h2>{data.question}</h2>
        <p>{locale === "zh-CN" ? "图中只显示与当前问题有关的一跳关系；边的颜色不表示真假，证据说明在列表中展开。" : "The graph shows only one-hop relations relevant to this question. Edge colour does not represent truth; evidence is listed below."}</p>
        <ul className="relation-list">
          {visibleEdges.map((edge) => (
            <li key={edge.id}>
              <strong>{nodes.get(edge.source)?.label} → {nodes.get(edge.target)?.label}</strong>
              <span>{edge.label}</span>
              <small>{edge.evidence}</small>
            </li>
          ))}
        </ul>
        {focus?.startsWith("figure:") ? (
          <RelationNetwork locale={locale} focus={focus} relations={relations} searchItems={searchItems} onFocus={onFocus} compact peopleOnly />
        ) : null}
      </aside>
    </div>
  );
}

function CosmosView({ locale, traditions, focus, relations }: { locale: Locale; traditions: Tradition[]; focus?: string; relations?: ReadModelRelationIndex }) {
  const loader = useCallback((signal: AbortSignal) => staticData.sacredCosmos(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  const connectedKeys = useMemo(() => connectedContextKeys(relations, focus), [focus, relations]);
  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  const visibleTraditions = new Set(traditions);
  const nodes = data.nodes.filter((node) => node.kind === "symbolic_node" || visibleTraditions.has(node.tradition as Tradition));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = data.edges.filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target));
  const center = data.nodes.find((node) => node.id === "symbolic:encounter") ?? data.nodes[data.nodes.length - 1];
  const isFocused = (node: ReadModelSacredCosmos["nodes"][number]) =>
    matchesContextFocus([node.id, `${node.kind}:${node.slug}`], focus, connectedKeys);
  const figureNodes = nodes.filter((node) => node.kind === "figure");
  const placeNodes = nodes.filter((node) => node.kind === "place");
  const traditionNodes = nodes.filter((node) => node.kind === "tradition");
  return (
    <div className="explore-golden page-shell">
      <div className="cosmos-canvas">
        <div className="canvas-title">
          <span>{data.title} · {locale === "zh-CN" ? "非现实地图" : "not a geographic map"}</span>
          <strong>{locale === "zh-CN" ? "象征层" : "Symbolic"}</strong>
        </div>
        <svg viewBox="0 0 980 580" role="group" aria-labelledby="cosmos-title cosmos-desc">
          <title id="cosmos-title">{data.title}</title>
          <desc id="cosmos-desc">{data.disclaimer}</desc>
          <circle className="cosmos-orbit cosmos-orbit-outer" cx="510" cy="260" r="205" />
          <circle className="cosmos-orbit cosmos-orbit-inner" cx="510" cy="260" r="112" />
          {edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;
            return <path className="cosmos-thread" d={cosmosEdgePath(source, target, center)} key={edge.id}><title>{edge.label}: {edge.summary}</title></path>;
          })}
          {nodes.filter((node) => node.kind === "symbolic_node").map((node) => (
            <g className="cosmos-center" key={node.id} transform={`translate(${node.x} ${node.y})`}>
              <circle r="55" />
              <text x="0" y="-6" textAnchor="middle">{node.shortLabel}</text>
              <text x="0" y="17" textAnchor="middle">{locale === "zh-CN" ? "不是合一" : "not sameness"}</text>
            </g>
          ))}
          {placeNodes.map((node) => (
            <Link
              key={node.id}
              to={entityPath("place", node.slug, locale)}
              className={`cosmos-place-node tradition-${node.tradition} ${isFocused(node) ? "is-focused" : ""}`}
              aria-label={`${locale === "zh-CN" ? "打开象征空间" : "Open symbolic space"}: ${node.label}`}
            >
              <circle cx={node.x} cy={node.y} r="36" />
              <text x={node.x} y={node.y + 5} textAnchor="middle">{node.shortLabel}</text>
              <title>{node.label}: {node.summary}</title>
            </Link>
          ))}
          {figureNodes.map((node) => (
            <Link
              key={node.id}
              to={entityPath("figure", node.slug, locale)}
              className={`cosmos-figure-node tradition-${node.tradition} ${isFocused(node) ? "is-focused" : ""}`}
              aria-label={`${locale === "zh-CN" ? "打开人物" : "Open figure"}: ${node.label}`}
            >
              <circle cx={node.x} cy={node.y} r="30" />
              <text x={node.x} y={node.y + 4} textAnchor="middle">{node.shortLabel}</text>
              <title>{node.label}: {node.summary}</title>
            </Link>
          ))}
          {traditionNodes.map((node) => (
            <g key={node.id} className={`cosmos-node tradition-${node.tradition}`} transform={`translate(${node.x} ${node.y})`}>
              <circle r="48" />
              <text x="0" y="8" textAnchor="middle">{node.shortLabel}</text>
              <title>{node.label}: {node.summary}</title>
            </g>
          ))}
        </svg>
      </div>
      <aside className="explore-evidence">
        <p className="eyebrow">{locale === "zh-CN" ? "象征层说明" : "Symbolic layer"}</p>
        <h2>{locale === "zh-CN" ? "把神圣地理与现实地理分开" : "Keep sacred and real geographies distinct"}</h2>
        <p>{data.description}</p>
        <ul className="relation-list">
          <li><strong>{locale === "zh-CN" ? "现实地图" : "Real map"}</strong><small>{locale === "zh-CN" ? "使用现实坐标，标明证据与置信度。" : "Uses real coordinates with evidence and confidence."}</small></li>
          <li><strong>{locale === "zh-CN" ? "神圣地理" : "Sacred geography"}</strong><small>{locale === "zh-CN" ? "使用象征关系，不生成伪经纬度。" : "Uses symbolic relations without inventing coordinates."}</small></li>
        </ul>
        <p className="cosmos-source-note">{locale === "zh-CN"
          ? `当前显示 ${traditionNodes.length} 个传统节点、${figureNodes.length} 个人物象征节点、${placeNodes.length} 个神圣空间节点、${edges.length} 条象征/比较关系；来源与证据来自 compiler read model。`
          : `${traditionNodes.length} tradition nodes, ${figureNodes.length} symbolic figure nodes, ${placeNodes.length} sacred-space nodes and ${edges.length} symbolic/comparative edges are shown from the compiler read model.`}</p>
      </aside>
    </div>
  );
}

function cosmosEdgePath(source: ReadModelSacredCosmos["nodes"][number], target: ReadModelSacredCosmos["nodes"][number], center?: ReadModelSacredCosmos["nodes"][number]): string {
  const controlX = center?.x ?? 510;
  const controlY = center?.y ?? 260;
  return `M${source.x} ${source.y} Q${controlX} ${controlY} ${target.x} ${target.y}`;
}
