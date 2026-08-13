import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ReadModelRelation, ReadModelRelationIndex } from "@drf-museum/domain-schema";
import type { AtlasTab, MapContentLayer, RouteState, TimelineMode, ZoomLevel } from "../routing";
import { entityPath, withLang } from "../routing";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { contextEndpointKey, contextEntityKeys, contextRelationCounts, contextRelationLevel, contextRelations, projectTimelineEvents, relationConnector } from "../data/contextProjection";
import { CivilisationMap } from "./CivilisationMap";
import { ErrorState, LoadingState } from "./LoadingState";
import { Icon } from "./Icon";
import { RelationNetwork } from "./RelationNetwork";
import { InteractiveRelationshipGraph } from "./InteractiveRelationshipGraph";
import { ERA_CONTEXTS } from "../data/eraContexts";
import { formatConfidence, formatEntityKind, formatEventKind, formatEventScope, formatEvidence, formatEvidenceLine, formatInteractionMode, formatRelationType } from "../data/labels";
import type { EntityData, EntityKind, Locale, MapContextData, SearchItem, TimelineData, TimelineEvent, Tradition } from "../types";

interface AtlasData extends MapContextData {
  relations: ReadModelRelationIndex;
  timeline: TimelineData;
}

interface AtlasWorkspaceProps {
  locale: Locale;
  state: RouteState;
  onChange: (changes: Partial<RouteState>) => void;
  className?: string;
  heading?: ReactNode;
  description?: ReactNode;
  compact?: boolean;
}

interface TabDefinition {
  kind?: EntityKind;
  zh: string;
  en: string;
}

const TAB_DEFINITIONS: Record<AtlasTab, TabDefinition> = {
  figures: { kind: "figure", zh: "人物", en: "Figures" },
  events: { kind: "event", zh: "事件", en: "Events" },
  places: { kind: "place", zh: "地点", en: "Places" },
  routes: { kind: "route", zh: "路线", en: "Routes" },
  texts: { kind: "text", zh: "著作", en: "Works" },
  sayings: { kind: "passage", zh: "言论", en: "Sayings" },
  relations: { zh: "关系", en: "Relations" },
};

const TAB_ORDER: AtlasTab[] = ["figures", "events", "places", "routes", "texts", "sayings", "relations"];

const ZOOM_LEVELS: { id: ZoomLevel; zh: string; en: string; noteZh: string; noteEn: string }[] = [
  { id: "era", zh: "时代", en: "Era", noteZh: "聚合密度", noteEn: "Density" },
  { id: "region", zh: "区域", en: "Region", noteZh: "区域节点", noteEn: "Regions" },
  { id: "figure", zh: "人物", en: "Figure", noteZh: "焦点关系", noteEn: "Focus" },
  { id: "all", zh: "全部", en: "All", noteZh: "展开对象", noteEn: "Expanded" },
];

type MobileAtlasPanel = "map" | "timeline" | "objects";

const TRADITIONS: { slug: Tradition; zh: string; en: string }[] = [
  { slug: "daoism", zh: "道", en: "Dao" },
  { slug: "confucianism", zh: "儒", en: "Ru" },
  { slug: "buddhism", zh: "佛", en: "Fo" },
];

const ERA_PRESETS: { id: string; zh: string; en: string; from?: number; to?: number }[] = [
  { id: "all", zh: "全历史", en: "All time" },
  { id: "origins", zh: "神话与传统", en: "Origins", to: -601 },
  { id: "pre-qin", zh: "先秦", en: "Pre-Qin", from: -600, to: -221 },
  { id: "qin-han", zh: "秦汉", en: "Qin–Han", from: -221, to: 220 },
  { id: "wei-jin", zh: "魏晋南北朝", en: "Wei–Jin", from: 220, to: 581 },
  { id: "sui-tang", zh: "隋唐", en: "Sui–Tang", from: 581, to: 907 },
  { id: "song-yuan", zh: "宋元", en: "Song–Yuan", from: 907, to: 1368 },
  { id: "ming-qing", zh: "明清", en: "Ming–Qing", from: 1368, to: 1911 },
  { id: "modern", zh: "近现代", en: "Modern", from: 1911 },
];

function eraIdForState(state: RouteState): string {
  return ERA_PRESETS.find((era) => (state.from ?? undefined) === era.from && (state.to ?? undefined) === era.to)?.id ?? "all";
}

function keyFor(kind: string, slug: string): string {
  return `${kind}:${slug}`;
}

function formatYear(year: number, locale: Locale): string {
  if (year < 0) return locale === "zh-CN" ? `前${Math.abs(year)}年` : `${Math.abs(year)} BCE`;
  return locale === "zh-CN" ? `${year}年` : String(year);
}

function titleFor(key: string | undefined, searchItems: SearchItem[], locale: Locale): string {
  if (!key) return locale === "zh-CN" ? "全历史时空" : "Full historical space-time";
  const item = searchItems.find((candidate) => keyFor(candidate.kind, candidate.slug) === key);
  return item?.title ?? key.split(":").slice(1).join(":").replaceAll("-", " ");
}

function kindLabel(kind: string, locale: Locale): string {
  const definition = Object.values(TAB_DEFINITIONS).find((item) => item.kind === kind);
  return definition ? (locale === "zh-CN" ? definition.zh : definition.en) : kind;
}

function relationDetailKey(id: string): string {
  return id.startsWith("relation:") ? id : `relation:${id}`;
}

function relationFromDetail(detail: string | undefined, relations: ReadModelRelationIndex | undefined): ReadModelRelation | undefined {
  if (!detail?.startsWith("relation:") || !relations) return undefined;
  const canonicalDetail = detail.replace(/^relation:relation:/, "relation:");
  return relations.items.find((relation) => relation.id === canonicalDetail || relation.id === canonicalDetail.slice("relation:".length));
}

function eventFocus(event: TimelineEvent): string {
  return event.kind === "event"
    ? keyFor(event.kind, event.slug)
    : event.entity
      ? keyFor(event.entity.kind, event.entity.slug)
      : keyFor(event.kind, event.slug);
}

function tabForFocus(focus: string, fallback: AtlasTab): AtlasTab {
  const kind = focus.split(":")[0];
  if (kind === "figure") return "figures";
  if (kind === "place") return "places";
  if (kind === "event") return "events";
  if (kind === "route") return "routes";
  if (kind === "text") return "texts";
  if (kind === "passage") return "sayings";
  return fallback;
}

function timelinePosition(year: number, start: number, end: number, index: number, count: number, traditionMode: boolean): number {
  if (traditionMode) return count <= 1 ? 50 : (index / (count - 1)) * 100;
  if (end === start) return 50;
  return Math.max(0, Math.min(100, ((year - start) / (end - start)) * 100));
}

function sampleTimelineEvents(events: TimelineEvent[], limit = 24): TimelineEvent[] {
  if (events.length <= limit) return events;
  return Array.from({ length: limit }, (_, index) => events[Math.round((index * (events.length - 1)) / (limit - 1))]);
}

interface TimelineDensityBin {
  start: number;
  end: number;
  count: number;
  events: TimelineEvent[];
}

function timelineDensityBins(events: TimelineEvent[], start: number, end: number, count = 12): TimelineDensityBin[] {
  if (end <= start) return [{ start, end, count: events.length, events }];
  const span = end - start;
  const bins = Array.from({ length: count }, (_, index) => {
    const binStart = start + (span * index) / count;
    const binEnd = index === count - 1 ? end : start + (span * (index + 1)) / count;
    return { start: binStart, end: binEnd, count: 0, events: [] as TimelineEvent[] };
  });
  for (const event of events) {
    const index = Math.min(count - 1, Math.max(0, Math.floor(((event.year - start) / span) * count)));
    bins[index].count += 1;
    bins[index].events.push(event);
  }
  return bins;
}

function timelinePercent(year: number, start: number, end: number): number {
  if (end <= start) return 50;
  return Math.max(0, Math.min(100, ((year - start) / (end - start)) * 100));
}

function useAtlasData(locale: Locale) {
  const loader = useCallback(async (signal: AbortSignal): Promise<AtlasData> => {
    const [mapContext, relations, timeline] = await Promise.all([
      staticData.mapContext(locale, signal),
      staticData.relations(locale, signal),
      staticData.timeline(locale, signal),
    ]);
    return { ...mapContext, relations, timeline };
  }, [locale]);
  return useStaticData(loader);
}

export function AtlasWorkspace({ locale, state, onChange, className = "", heading, description, compact = false }: AtlasWorkspaceProps) {
  const { data, error } = useAtlasData(locale);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [mobilePanel, setMobilePanel] = useState<MobileAtlasPanel>("map");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackYear, setPlaybackYear] = useState<number | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const query = state.query ?? "";

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setPlaybackYear(undefined);
  }, []);

  const updateState = useCallback((changes: Partial<RouteState>) => {
    stopPlayback();
    onChange(changes);
  }, [onChange, stopPlayback]);

  useEffect(() => {
    if (!isPlaying || !data) return;
    const start = state.from ?? data.timeline.startYear;
    const end = state.to ?? data.timeline.endYear;
    const step = Math.max(1, Math.ceil((end - start) / 28));
    setPlaybackYear(start);
    const timer = window.setInterval(() => {
      setPlaybackYear((current) => {
        const next = Math.min(end, (current ?? start) + step);
        if (next >= end) {
          window.setTimeout(() => {
            setIsPlaying(false);
            setPlaybackYear(undefined);
            onChangeRef.current({ to: end });
          }, 0);
        }
        return next;
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [data, isPlaying, state.from, state.to]);

  const searchMap = useMemo(() => new Map((data?.searchItems ?? []).map((item) => [keyFor(item.kind, item.slug), item.title])), [data?.searchItems]);
  const focusTitle = titleFor(state.focus, data?.searchItems ?? [], locale);
  const eraContext = ERA_CONTEXTS[eraIdForState(state)] ?? ERA_CONTEXTS.all;
  const effectiveState = useMemo(() => {
    if (playbackYear === undefined || !data) return state;
    return { ...state, from: state.from ?? data.timeline.startYear, to: playbackYear };
  }, [data, playbackYear, state]);

  const contextualKeys = useMemo(
    () => contextEntityKeys(data?.relations, state.focus),
    [data?.relations, state.focus],
  );
  const matchesTraditions = useCallback((item: SearchItem | undefined) => Boolean(
    item && (item.tradition === "convergence" || state.traditions.includes(item.tradition)),
  ), [state.traditions]);
  const contextualItems = useMemo(() => {
    if (!data) return [];
    return data.searchItems
      .filter((item) => matchesTraditions(item))
      .filter((item) => !state.focus || contextualKeys.has(keyFor(item.kind, item.slug)));
  }, [contextualKeys, data, matchesTraditions, state.focus]);

  const filteredItems = useMemo(() => {
    if (!data || state.atlasTab === "relations") return [];
    const definition = TAB_DEFINITIONS[state.atlasTab];
    const normalisedQuery = query.trim().toLocaleLowerCase();
    return contextualItems
      .filter((item) => item.kind === definition.kind)
      .filter((item) => !normalisedQuery || `${item.title} ${item.context}`.toLocaleLowerCase().includes(normalisedQuery))
      .sort((a, b) => a.title.localeCompare(b.title, locale === "zh-CN" ? "zh-Hans" : "en"));
  }, [contextualItems, data, locale, query, state.atlasTab]);

  const queryFilteredContextualItems = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase();
    return contextualItems.filter((item) => !normalisedQuery || `${item.title} ${item.context}`.toLocaleLowerCase().includes(normalisedQuery));
  }, [contextualItems, query]);

  const contextualRelationItems = useMemo(() => {
    if (!data) return [];
    return contextRelations(data.relations, state.focus).filter((relation) => {
      const sourceItem = data.searchItems.find((item) => keyFor(item.kind, item.slug) === keyFor(relation.source.kind, relation.source.slug));
      const targetItem = data.searchItems.find((item) => keyFor(item.kind, item.slug) === keyFor(relation.target.kind, relation.target.slug));
      const sourceVisible = !sourceItem || matchesTraditions(sourceItem);
      const targetVisible = !targetItem || matchesTraditions(targetItem);
      return sourceVisible && targetVisible;
    });
  }, [data, matchesTraditions, state.focus]);

  const relationItems = useMemo(() => {
    if (!data || state.atlasTab !== "relations") return [];
    const normalisedQuery = query.trim().toLocaleLowerCase();
    return contextualRelationItems
      .filter((relation) => {
        const source = keyFor(relation.source.kind, relation.source.slug);
        const target = keyFor(relation.target.kind, relation.target.slug);
        const sourceTitle = searchMap.get(source) ?? source;
        const targetTitle = searchMap.get(target) ?? target;
        return !normalisedQuery || `${sourceTitle} ${targetTitle} ${relation.label}`.toLocaleLowerCase().includes(normalisedQuery);
      });
  }, [contextualRelationItems, data, query, searchMap, state.atlasTab]);

  const relationContextCounts = useMemo(
    () => contextRelationCounts(contextualRelationItems, state.focus, contextualKeys),
    [contextualKeys, contextualRelationItems, state.focus],
  );

  const tabCounts = useMemo(() => {
    const counts = {} as Record<AtlasTab, number>;
    for (const tab of TAB_ORDER) {
      if (tab === "relations") counts[tab] = relationItems.length;
      else counts[tab] = queryFilteredContextualItems.filter((item) => item.kind === TAB_DEFINITIONS[tab].kind).length;
    }
    return counts;
  }, [queryFilteredContextualItems, relationItems]);

  const selectFocus = (focus: string, preserveAtlasTab = false) => updateState({
    focus,
    detail: undefined,
    query: undefined,
    atlasTab: preserveAtlasTab ? state.atlasTab : tabForFocus(focus, state.atlasTab),
    view: "map",
    mapLayer: "real",
  });
  const setFocus = (focus: string) => selectFocus(focus);
  const setGraphFocus = (focus: string) => selectFocus(focus, true);
  const setMapFocus = (focus: string) => selectFocus(focus);
  const openDetail = (detail: string) => {
    const relationDetail = detail.startsWith("relation:");
    const focus = relationDetail ? state.focus : detail;
    updateState({
      focus,
      detail,
      atlasTab: relationDetail ? state.atlasTab : tabForFocus(detail, state.atlasTab),
      view: "map",
      mapLayer: "real",
    });
  };
  const clearFocus = () => updateState({ focus: undefined, detail: undefined, query: undefined });

  const detailCandidates = useMemo(
    () => state.atlasTab === "relations"
      ? relationItems.map((relation) => relationDetailKey(relation.id))
      : filteredItems.map((item) => keyFor(item.kind, item.slug)),
    [filteredItems, relationItems, state.atlasTab],
  );

  const shareState = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
    window.setTimeout(() => setShareStatus("idle"), 2200);
  };

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  return (
    <section className={`atlas-workspace ${compact ? "is-compact" : ""} ${className}`.trim()} aria-labelledby="atlas-workspace-title" data-mobile-panel={mobilePanel} data-atlas-zoom={state.zoomLevel}>
      <header className="atlas-workspace-heading">
        <div>
          <p className="eyebrow">Atlas / {locale === "zh-CN" ? "全历史时空" : "Full historical space-time"}</p>
          <h2 id="atlas-workspace-title">{heading ?? (locale === "zh-CN" ? "从地图进入文明" : "Enter civilisation through the map")}</h2>
          <p>{description ?? (locale === "zh-CN" ? "选择地点、人物、事件或一句话，让地图、时间与关系围绕当前焦点展开。" : "Choose a place, figure, event or saying and let the map, time and relationships gather around it.")}</p>
        </div>
        <div className="atlas-workspace-actions">
          <button className="text-link atlas-share-button" type="button" onClick={shareState}>
            {shareStatus === "copied"
              ? (locale === "zh-CN" ? "已复制此景链接" : "View link copied")
              : shareStatus === "failed"
                ? (locale === "zh-CN" ? "复制失败，请使用地址栏" : "Copy failed; use the address bar")
                : (locale === "zh-CN" ? "复制此景链接" : "Copy this view")}
          </button>
          <Link className="text-link" to={withLang("/explore?view=map", locale)}>{locale === "zh-CN" ? "打开完整地图" : "Open full atlas"} <Icon name="arrow" /></Link>
        </div>
      </header>

      <div className="atlas-focus-bar" aria-live="polite">
        <div>
          <span className="atlas-breadcrumb">{locale === "zh-CN" ? "全历史" : "All history"}</span>
          <span aria-hidden="true"> → </span>
          <strong>{focusTitle}</strong>
        </div>
        {state.focus ? <button className="atlas-clear-focus" type="button" onClick={clearFocus}>{locale === "zh-CN" ? "清除焦点" : "Clear focus"}</button> : null}
      </div>

      <div className="atlas-tradition-bar" aria-label={locale === "zh-CN" ? "传统筛选" : "Tradition filters"}>
        <span className="control-label">{locale === "zh-CN" ? "传统" : "Traditions"}</span>
        {TRADITIONS.map((tradition) => {
          const active = state.traditions.includes(tradition.slug);
          return (
            <button
              className={`filter-chip tradition-chip-${tradition.slug} ${active ? "active" : ""}`}
              key={tradition.slug}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const next = active ? state.traditions.filter((item) => item !== tradition.slug) : [...state.traditions, tradition.slug];
                if (next.length > 0) updateState({ traditions: next });
              }}
            >
              {locale === "zh-CN" ? tradition.zh : tradition.en}
            </button>
          );
        })}
      </div>

      <div className="atlas-era-bar" aria-label={locale === "zh-CN" ? "按时代筛选" : "Filter by era"}>
        <span className="control-label">{locale === "zh-CN" ? "时代" : "Era"}</span>
        {ERA_PRESETS.map((era) => {
          const active = (state.from ?? undefined) === era.from && (state.to ?? undefined) === era.to;
          return (
            <button className={`atlas-era-chip ${active ? "active" : ""}`} key={era.id} type="button" aria-pressed={active} onClick={() => updateState({ from: era.from, to: era.to })}>
              {locale === "zh-CN" ? era.zh : era.en}
            </button>
          );
        })}
      </div>

      <div className="atlas-zoom-bar" aria-label={locale === "zh-CN" ? "可视化展开层级" : "Visualization detail level"}>
        <span className="control-label">{locale === "zh-CN" ? "展开层级" : "Detail level"}</span>
        <div className="atlas-zoom-levels" role="group">
          {ZOOM_LEVELS.map((level) => (
            <button
              type="button"
              key={level.id}
              className={state.zoomLevel === level.id ? "active" : ""}
              aria-pressed={state.zoomLevel === level.id}
              onClick={() => updateState({ zoomLevel: level.id })}
            >
              <span>{locale === "zh-CN" ? level.zh : level.en}</span>
              <small>{locale === "zh-CN" ? level.noteZh : level.noteEn}</small>
            </button>
          ))}
        </div>
      </div>

      <nav className="atlas-mobile-view-controls" aria-label={locale === "zh-CN" ? "移动端探索面板" : "Mobile atlas panels"}>
        <button type="button" className={mobilePanel === "map" ? "active" : ""} aria-pressed={mobilePanel === "map"} onClick={() => setMobilePanel("map")}>{locale === "zh-CN" ? "地图" : "Map"}</button>
        <button type="button" className={mobilePanel === "timeline" ? "active" : ""} aria-pressed={mobilePanel === "timeline"} onClick={() => setMobilePanel("timeline")}>{locale === "zh-CN" ? "时间" : "Time"}</button>
        <button type="button" className={mobilePanel === "objects" ? "active" : ""} aria-pressed={mobilePanel === "objects"} onClick={() => setMobilePanel("objects")}>{locale === "zh-CN" ? "对象" : "Objects"}</button>
      </nav>

      <section className={`atlas-era-context atlas-era-context-${eraContext.tone}`} data-era-context data-era-context-id={eraIdForState(state)} aria-live="polite">
        <div className="atlas-era-context-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "时代语境" : "Era resonance"}</p>
          <h3>{locale === "zh-CN" ? eraContext.titleZh : eraContext.titleEn}</h3>
        </div>
        <blockquote>{locale === "zh-CN" ? eraContext.quoteZh : eraContext.quoteEn}</blockquote>
        <div className="atlas-era-context-meta">
          <cite>{locale === "zh-CN" ? eraContext.attributionZh : eraContext.attributionEn}</cite>
          <span>{locale === "zh-CN" ? eraContext.noteZh : eraContext.noteEn}</span>
          <Link className="atlas-era-context-link" to={entityPath("passage", eraContext.passageSlug, locale)}>
            {locale === "zh-CN" ? "打开原文" : "Open passage"} <Icon name="arrow" />
          </Link>
        </div>
      </section>

      <div className="atlas-main-grid">
        <div className="atlas-map-column">
          <CivilisationMap
            className="atlas-map-stage"
            data={data.map}
            routes={data.routes}
            locale={locale}
            traditions={effectiveState.traditions}
            from={effectiveState.from}
            to={effectiveState.to}
            focus={effectiveState.focus}
            mapLayers={state.mapLayers}
            zoomLevel={state.zoomLevel}
            onMapLayersChange={(mapLayers) => updateState({ mapLayers })}
            relations={data.relations}
            searchItems={data.searchItems}
            onFocus={setMapFocus}
            showContext
            showIndex={false}
            showRouteLedger={false}
          />
          <AtlasTimelineRail locale={locale} data={data.timeline} relations={data.relations} searchItems={data.searchItems} state={effectiveState} onChange={updateState} isPlaying={isPlaying} playbackYear={playbackYear} onTogglePlayback={() => setIsPlaying((playing) => !playing)} />
        </div>
        <AtlasObjectPanel
          locale={locale}
          state={state}
          data={data}
          query={query}
          onQuery={(value) => updateState({ query: value.trim() || undefined })}
          items={filteredItems}
          relationItems={relationItems}
          relationContextCounts={relationContextCounts}
          tabCounts={tabCounts}
          onChange={updateState}
          onFocus={state.atlasTab === "relations" ? setGraphFocus : setFocus}
          onOpenDetail={openDetail}
        />
      </div>

      {state.atlasTab === "relations" ? (
        <InteractiveRelationshipGraph
          locale={locale}
          relations={data.relations}
          scopeRelations={contextualRelationItems}
          searchItems={data.searchItems}
          focus={state.focus}
          traditions={state.traditions}
          zoomLevel={state.zoomLevel}
          onZoomLevel={(zoomLevel) => updateState({ zoomLevel })}
          onFocus={setGraphFocus}
          onOpenRelation={(relationId) => openDetail(relationDetailKey(relationId))}
        />
      ) : null}

      <AtlasDataNotes locale={locale} data={data} state={state} />

      {state.detail ? (
        <AtlasDetailDrawer
          locale={locale}
          detailKey={state.detail}
          relations={data.relations}
          searchItems={data.searchItems}
          onClose={() => updateState({ detail: undefined })}
          onFocus={setFocus}
          onOpenDetail={openDetail}
          adjacentKeys={detailCandidates}
          zoomLevel={state.zoomLevel}
        />
      ) : null}
    </section>
  );
}

function AtlasObjectPanel({
  locale,
  state,
  data,
  query,
  onQuery,
  items,
  relationItems,
  relationContextCounts,
  tabCounts,
  onChange,
  onFocus,
  onOpenDetail,
}: {
  locale: Locale;
  state: RouteState;
  data: AtlasData;
  query: string;
  onQuery: (value: string) => void;
  items: SearchItem[];
  relationItems: ReadModelRelation[];
  relationContextCounts: { direct: number; bridge: number; ambient: number };
  tabCounts: Record<AtlasTab, number>;
  onChange: (changes: Partial<RouteState>) => void;
  onFocus: (key: string) => void;
  onOpenDetail: (key: string) => void;
}) {
  const titleMap = new Map(data.searchItems.map((item) => [keyFor(item.kind, item.slug), item.title]));
  const focusContextKeys = useMemo(() => contextEntityKeys(data.relations, state.focus), [data.relations, state.focus]);
  const [visibleCount, setVisibleCount] = useState(80);
  useEffect(() => {
    setVisibleCount(80);
  }, [query, state.atlasTab, state.focus, state.traditions.join(",")]);
  const visibleItems = items.slice(0, visibleCount);
  const visibleRelations = relationItems.slice(0, visibleCount);
  const totalResults = state.atlasTab === "relations" ? relationItems.length : items.length;
  const shownResults = state.atlasTab === "relations" ? visibleRelations.length : visibleItems.length;
  const contextTitle = state.focus ? titleMap.get(state.focus) : undefined;
  const contextTypeLabel = locale === "zh-CN" ? TAB_DEFINITIONS[state.atlasTab].zh : TAB_DEFINITIONS[state.atlasTab].en;
  return (
    <aside className="atlas-object-panel" aria-label={locale === "zh-CN" ? "地图对象面板" : "Atlas entity panel"}>
      <nav className="atlas-tab-nav" aria-label={locale === "zh-CN" ? "对象类型" : "Entity types"}>
        {TAB_ORDER.map((tab) => (
          <button className={state.atlasTab === tab ? "active" : ""} type="button" key={tab} aria-pressed={state.atlasTab === tab} onClick={() => onChange({ atlasTab: tab, detail: undefined })}>
            <span>{locale === "zh-CN" ? TAB_DEFINITIONS[tab].zh : TAB_DEFINITIONS[tab].en}</span>
            <small>{tabCounts[tab]}</small>
          </button>
        ))}
      </nav>
      <div className="atlas-panel-toolbar">
        <label className="sr-only" htmlFor="atlas-object-search">{locale === "zh-CN" ? "搜索地图对象" : "Search atlas entities"}</label>
        <input id="atlas-object-search" type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={locale === "zh-CN" ? "搜索人物、事件、地点……" : "Search figures, events, places…"} />
        <span>{shownResults === totalResults ? totalResults : `${shownResults} / ${totalResults}`} {locale === "zh-CN" ? "项" : "items"}</span>
      </div>
      {state.focus && contextTitle ? (
        <div className="atlas-panel-scope-note" data-atlas-context-note>
          <span>
            {locale === "zh-CN" ? `${contextTitle} · 关联${contextTypeLabel}` : `${contextTitle} · Related ${contextTypeLabel.toLocaleLowerCase()}`} · {state.atlasTab === "relations" ? relationItems.length : items.length}
            {state.atlasTab === "relations" && state.focus ? ` · ${locale === "zh-CN" ? `直接 ${relationContextCounts.direct} · 桥接 ${relationContextCounts.bridge} · 背景 ${relationContextCounts.ambient}` : `${relationContextCounts.direct} direct · ${relationContextCounts.bridge} bridge · ${relationContextCounts.ambient} ambient`}` : ""}
          </span>
          <button type="button" onClick={() => onChange({ focus: undefined, detail: undefined, query: undefined })}>
            {locale === "zh-CN" ? "查看全部" : "Show all"}
          </button>
        </div>
      ) : null}
      <div className="atlas-object-list" aria-live="polite">
        {state.atlasTab === "relations" ? visibleRelations.map((relation) => {
          const sourceKey = contextEndpointKey(relation.source);
          const targetKey = contextEndpointKey(relation.target);
          const detailKey = relationDetailKey(relation.id);
          const contextLevel = contextRelationLevel(relation, state.focus, focusContextKeys);
          return (
            <article className={`atlas-relation-card ${state.detail === detailKey ? "is-selected" : ""}`} key={relation.id}>
              <button type="button" className="atlas-object-card-main" onClick={() => onOpenDetail(detailKey)} aria-pressed={state.detail === detailKey}>
                <strong>{titleMap.get(sourceKey) ?? sourceKey} <span aria-hidden="true">{relationConnector(relation)}</span> {titleMap.get(targetKey) ?? targetKey}</strong>
                <span>{locale === "zh-CN" ? ({ direct: "直接关系", bridge: "桥接关系", ambient: "背景关系" } as const)[contextLevel] : ({ direct: "Direct", bridge: "Bridge", ambient: "Ambient" } as const)[contextLevel]} · {relation.label}</span>
                <small>{relation.temporalAssertions.map((assertion) => assertion.displayDate).join(" · ") || formatEvidence(relation.evidenceLayer, locale)} · {formatConfidence(relation.confidence, locale)}</small>
              </button>
              <div className="atlas-relation-card-actions">
                <button type="button" onClick={() => onFocus(sourceKey)}>{locale === "zh-CN" ? "聚焦" : "Focus"} {titleMap.get(sourceKey) ?? sourceKey}</button>
                <button type="button" onClick={() => onFocus(targetKey)}>{locale === "zh-CN" ? "聚焦" : "Focus"} {titleMap.get(targetKey) ?? targetKey}</button>
              </div>
            </article>
          );
        }) : visibleItems.map((item) => {
          const key = keyFor(item.kind, item.slug);
          return (
            <article className={`atlas-object-card ${state.focus === key ? "is-selected" : ""}`} key={key}>
              <button type="button" className="atlas-object-card-main" onClick={() => onFocus(key)} aria-pressed={state.focus === key}>
                <strong>{item.title}</strong>
                <span>{item.context}</span>
                <small>{item.kind === "event" ? `${formatEventKind(item.eventKind, locale)}${item.eventScope ? ` · ${formatEventScope(item.eventScope, locale)}` : ""}` : formatEntityKind(item.kind, locale)} · {item.tradition === "convergence" ? (locale === "zh-CN" ? "交汇" : "Convergence") : item.tradition}</small>
              </button>
              <button className="atlas-object-card-detail" type="button" onClick={() => onOpenDetail(key)}>{locale === "zh-CN" ? "详情" : "Inspect"}</button>
            </article>
          );
        })}
        {((state.atlasTab === "relations" && relationItems.length === 0) || (state.atlasTab !== "relations" && items.length === 0)) ? <p className="atlas-empty-state">{locale === "zh-CN" ? "当前筛选下没有可展开对象。" : "No entities match the current filters."}</p> : null}
        {shownResults < totalResults ? (
          <div className="atlas-list-more">
            <p className="atlas-list-note">{locale === "zh-CN" ? `已显示 ${shownResults} / ${totalResults} 项；继续展开或使用搜索缩小范围。` : `Showing ${shownResults} of ${totalResults}; expand or narrow the search.`}</p>
            <button type="button" className="button button-secondary" onClick={() => setVisibleCount((count) => Math.min(totalResults, count + 80))}>
              {locale === "zh-CN" ? (shownResults + 80 >= totalResults ? "显示全部" : "显示更多") : (shownResults + 80 >= totalResults ? "Show all" : "Show more")}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function AtlasTimelineRail({
  locale,
  data,
  relations,
  searchItems,
  state,
  onChange,
  isPlaying,
  playbackYear,
  onTogglePlayback,
}: {
  locale: Locale;
  data: TimelineData;
  relations: ReadModelRelationIndex;
  searchItems: SearchItem[];
  state: RouteState;
  onChange: (changes: Partial<RouteState>) => void;
  isPlaying: boolean;
  playbackYear?: number;
  onTogglePlayback: () => void;
}) {
  const [eventLimit, setEventLimit] = useState(12);
  const projected = useMemo(() => projectTimelineEvents(data, relations, searchItems, state.focus), [data, relations, searchItems, state.focus]);
  const modeEvents = state.timelineMode === "tradition"
    ? projected.filter((event) => event.evidenceLayer === "traditional_account" || event.evidenceLayer === "mythic_symbolic" || event.type.toLowerCase().includes("traditional"))
    : projected;
  const events = (modeEvents.length > 0 ? modeEvents : projected).filter((event) => {
    const end = event.endYear ?? event.year;
    return end >= (state.from ?? data.startYear) && event.year <= (state.to ?? data.endYear)
      && (event.tradition === "convergence" || state.traditions.includes(event.tradition));
  });
  const start = state.from ?? data.startYear;
  const end = state.to ?? data.endYear;
  const shown = events.slice(0, eventLimit);
  const undated = projected.filter((event) => !Number.isSafeInteger(event.year));
  const densityBins = useMemo(() => timelineDensityBins(events, start, end), [end, events, start]);
  const trackEvents = state.zoomLevel === "era" ? [] : sampleTimelineEvents(events, state.zoomLevel === "all" ? 36 : state.zoomLevel === "figure" ? 28 : 20);
  const trackTicks = Array.from({ length: 5 }, (_, index) => start + ((end - start) * index) / 4);
  useEffect(() => setEventLimit(12), [state.atlasTab, state.focus, state.from, state.to, state.timelineMode, state.traditions.join(","), state.zoomLevel]);
  const focusTimelineEvent = (event: TimelineEvent) => {
    const focus = eventFocus(event);
    onChange({ focus, atlasTab: tabForFocus(focus, state.atlasTab), detail: undefined, query: undefined, view: "map", mapLayer: "real" });
  };
  const rangeBoundary = (year: number): number => year === 0 ? (year < start ? -1 : 1) : Math.round(year);
  const selectDensityBin = (bin: TimelineDensityBin) => {
    const nextStart = rangeBoundary(bin.start);
    const nextEnd = rangeBoundary(bin.end);
    if (nextStart === nextEnd) return;
    onChange({ from: nextStart, to: nextEnd });
  };
  return (
    <section className="atlas-timeline-rail" aria-labelledby="atlas-timeline-title" data-atlas-timeline>
      <div className="atlas-timeline-heading">
        <div>
          <p className="eyebrow">{locale === "zh-CN" ? "时间轴" : "Timeline"}</p>
          <h3 id="atlas-timeline-title">{formatYear(start, locale)} — {formatYear(end, locale)}{playbackYear !== undefined ? ` · ${locale === "zh-CN" ? "播放至" : "playing to"} ${formatYear(playbackYear, locale)}` : ""}</h3>
        </div>
        <span>{events.length} / {projected.length} {locale === "zh-CN" ? "事件" : "events"}</span>
      </div>
      <div className="atlas-timeline-controls">
        <div className="atlas-timeline-mode" role="group" aria-label={locale === "zh-CN" ? "时间模式" : "Timeline mode"}>
          {(["history", "tradition"] as TimelineMode[]).map((mode) => (
            <button key={mode} className={state.timelineMode === mode ? "active" : ""} type="button" aria-pressed={state.timelineMode === mode} onClick={() => onChange({ timelineMode: mode })}>
              {mode === "history" ? (locale === "zh-CN" ? "历史时间" : "Historical") : (locale === "zh-CN" ? "传统顺序" : "Traditional")}
            </button>
          ))}
        </div>
        <div className="atlas-time-inputs">
          <label><span className="sr-only">{locale === "zh-CN" ? "起始年份" : "Start year"}</span><input type="number" value={start} min={data.startYear} max={data.endYear} aria-label={locale === "zh-CN" ? "时间轴起始年份" : "Timeline start year"} onChange={(event) => { const next = Number(event.target.value); if (Number.isSafeInteger(next) && next !== 0) onChange({ from: next, to: Math.max(next, end) }); }} /></label>
          <span aria-hidden="true">—</span>
          <label><span className="sr-only">{locale === "zh-CN" ? "结束年份" : "End year"}</span><input type="number" value={end} min={data.startYear} max={data.endYear} aria-label={locale === "zh-CN" ? "时间轴结束年份" : "Timeline end year"} onChange={(event) => { const next = Number(event.target.value); if (Number.isSafeInteger(next) && next !== 0) onChange({ from: Math.min(start, next), to: next }); }} /></label>
          {(state.from !== undefined || state.to !== undefined) ? <button type="button" onClick={() => onChange({ from: undefined, to: undefined })}>{locale === "zh-CN" ? "全段" : "Full"}</button> : null}
          <button type="button" className={isPlaying ? "is-playing" : ""} onClick={onTogglePlayback} aria-pressed={isPlaying}>
            {isPlaying ? (locale === "zh-CN" ? "暂停" : "Pause") : (locale === "zh-CN" ? "播放" : "Play")}
          </button>
        </div>
      </div>
      <div className="atlas-timeline-range" aria-label={locale === "zh-CN" ? "拖动选择时间范围" : "Drag to select a time range"}>
        <label>
          <span>{locale === "zh-CN" ? "范围起点" : "Range start"}</span>
          <input type="range" min={data.startYear} max={data.endYear} value={start} onChange={(event) => { const next = Number(event.target.value); if (next !== 0) onChange({ from: next, to: Math.max(next, end) }); }} />
        </label>
        <label>
          <span>{locale === "zh-CN" ? "范围终点" : "Range end"}</span>
          <input type="range" min={data.startYear} max={data.endYear} value={end} onChange={(event) => { const next = Number(event.target.value); if (next !== 0) onChange({ from: Math.min(start, next), to: next }); }} />
        </label>
      </div>
      <div className="atlas-timeline-track-wrap" aria-label={locale === "zh-CN" ? "可点击时间轴" : "Interactive chronology"}>
        <div className="atlas-timeline-track" data-timeline-track role="group" aria-label={locale === "zh-CN" ? "时间轴事件节点" : "Timeline event nodes"}>
          <span className="atlas-timeline-track-line" aria-hidden="true" />
          {ERA_PRESETS.filter((era) => era.id !== "all" && era.from !== undefined || era.to !== undefined).map((era) => {
            const bandStart = Math.max(start, era.from ?? start);
            const bandEnd = Math.min(end, era.to ?? end);
            if (bandEnd <= bandStart) return null;
            return <span className={`atlas-timeline-era-band atlas-era-band-${era.id}`} key={era.id} style={{ left: `${timelinePercent(bandStart, start, end)}%`, width: `${Math.max(1, timelinePercent(bandEnd, start, end) - timelinePercent(bandStart, start, end))}%` }} aria-hidden="true" />;
          })}
          {densityBins.map((bin, index) => (
            <button
              type="button"
              className={`atlas-timeline-density-bin ${bin.count > 0 ? "has-events" : ""}`}
              key={`${bin.start}-${index}`}
              style={{ left: `${timelinePercent(bin.start, start, end)}%`, width: `${Math.max(1, timelinePercent(bin.end, start, end) - timelinePercent(bin.start, start, end))}%`, height: `${Math.min(88, 18 + bin.count * 8)}%` }}
              aria-label={locale === "zh-CN" ? `${formatYear(Math.round(bin.start), locale)} 至 ${formatYear(Math.round(bin.end), locale)}：${bin.count} 个事件` : `${formatYear(Math.round(bin.start), locale)} to ${formatYear(Math.round(bin.end), locale)}: ${bin.count} events`}
              onClick={() => bin.count > 0 && selectDensityBin(bin)}
            />
          ))}
          {trackTicks.map((tick, index) => (
            <span className="atlas-timeline-tick" style={{ left: `${(index / 4) * 100}%` }} key={index}>
              <i aria-hidden="true" />
              <small>{formatYear(Math.round(tick), locale)}</small>
            </span>
          ))}
          {trackEvents.map((event, index) => {
            const focus = eventFocus(event);
            return (
              <button
                className={`atlas-timeline-track-event ${state.focus === focus ? "is-selected" : ""}`}
                data-timeline-track-focus={focus}
                style={{ left: `${timelinePosition(event.year, start, end, index, trackEvents.length, state.timelineMode === "tradition")}%` }}
                type="button"
                key={`${event.id}-track`}
                aria-label={`${event.displayDate ?? formatYear(event.year, locale)} · ${event.title}`}
                onClick={() => focusTimelineEvent(event)}
              >
                <span aria-hidden="true" />
                <strong>{event.title}</strong>
              </button>
            );
          })}
        </div>
      </div>
      <div className="atlas-timeline-events">
        {shown.map((event) => {
          const focus = eventFocus(event);
          return <button className={state.focus === focus ? "is-selected" : ""} type="button" key={event.id} onClick={() => focusTimelineEvent(event)}>
            <span>{event.displayDate ?? formatYear(event.year, locale)}</span>
            <strong>{event.title}</strong>
          </button>;
        })}
        {shown.length === 0 ? <p className="atlas-empty-state">{locale === "zh-CN" ? "此时间范围暂无事件。" : "No events in this time range."}</p> : null}
      </div>
      {events.length > shown.length ? <div className="atlas-list-more"><p className="atlas-list-note">{locale === "zh-CN" ? `显示 ${shown.length} / ${events.length} 项；密度柱可快速缩小范围。` : `Showing ${shown.length} of ${events.length}; density bins narrow the range.`}</p><button type="button" className="button button-secondary" onClick={() => setEventLimit(events.length)}>{locale === "zh-CN" ? "显示全部事件" : "Show all events"}</button></div> : null}
      {undated.length > 0 ? <details className="atlas-undated-events"><summary>{locale === "zh-CN" ? `未定年 · ${undated.length}` : `Undated · ${undated.length}`}</summary><ul>{undated.map((event) => <li key={event.id}><button type="button" onClick={() => focusTimelineEvent(event)}>{event.title}</button></li>)}</ul></details> : null}
    </section>
  );
}

function AtlasDataNotes({ locale, data, state }: { locale: Locale; data: AtlasData; state: RouteState }) {
  const visibleLayers = state.mapLayers.length > 0 ? state.mapLayers.join(locale === "zh-CN" ? "、" : ", ") : (locale === "zh-CN" ? "已隐藏全部地图图层" : "All map layers hidden");
  return (
    <section className="atlas-data-notes" aria-labelledby="atlas-data-notes-title">
      <div>
        <p className="eyebrow">{locale === "zh-CN" ? "当前视图的数据说明" : "Data notes for this view"}</p>
        <h3 id="atlas-data-notes-title">{locale === "zh-CN" ? "地图、时间与关系使用同一份可追溯读模型" : "Map, time and relations share one traceable read model"}</h3>
      </div>
      <p>{locale === "zh-CN"
        ? `当前显示 ${data.map.features.length} 个现实地点、${data.routes.length} 条路线和 ${data.timeline.events.length} 个时间事件；图层：${visibleLayers}。年代、坐标和关系置信度会在对象详情中保留，不确定位置不会被绘制成确定事实。`
        : `${data.map.features.length} real places, ${data.routes.length} routes and ${data.timeline.events.length} timeline events are available; layers: ${visibleLayers}. Date, coordinate and relation confidence remain visible in each dossier, and pending positions are not drawn as facts.`}</p>
      <details>
        <summary>{locale === "zh-CN" ? "查看证据图例" : "Open evidence legend"}</summary>
        <ul>
          <li><strong>{locale === "zh-CN" ? "有文献依据" : "Documented history"}</strong><span>{locale === "zh-CN" ? "可以回到来源或明确记录。" : "Can be traced to a source or explicit record."}</span></li>
          <li><strong>{locale === "zh-CN" ? "历史推定" : "Historical inference"}</strong><span>{locale === "zh-CN" ? "由多个线索或空间关系推得。" : "Inferred from multiple clues or spatial relations."}</span></li>
          <li><strong>{locale === "zh-CN" ? "传统／象征" : "Traditional or symbolic"}</strong><span>{locale === "zh-CN" ? "保留为传统叙事，不等同现实坐标。" : "Kept as tradition, not equated with a real coordinate."}</span></li>
          <li><strong>{locale === "zh-CN" ? "虚线与半透明" : "Dashed and translucent"}</strong><span>{locale === "zh-CN" ? "表示路线或位置仍待核，不是视觉装饰。" : "Mark routes or positions that remain unresolved."}</span></li>
        </ul>
      </details>
      <Link className="text-link" to={withLang("/research", locale)}>{locale === "zh-CN" ? "进入完整来源与审核" : "Open full sources and review"} <Icon name="arrow" /></Link>
    </section>
  );
}

function AtlasDetailDrawer({ locale, detailKey, relations, searchItems, onClose, onFocus, onOpenDetail, adjacentKeys, zoomLevel }: { locale: Locale; detailKey: string; relations: ReadModelRelationIndex; searchItems: SearchItem[]; onClose: () => void; onFocus: (key: string) => void; onOpenDetail: (key: string) => void; adjacentKeys: string[]; zoomLevel: ZoomLevel }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);
  const relation = relationFromDetail(detailKey, relations);
  const entityKey = relation ? undefined : detailKey;
  const [kind, slug] = entityKey?.split(":") ?? [];
  const loadEntity = useCallback((signal: AbortSignal) => kind && slug ? staticData.entity(kind as EntityKind, slug, locale, signal) : Promise.resolve(null), [kind, locale, slug]);
  const { data, error } = useStaticData(loadEntity);
  const searchMap = useMemo(() => new Map(searchItems.map((item) => [keyFor(item.kind, item.slug), item.title])), [searchItems]);
  const adjacentIndex = adjacentKeys.indexOf(detailKey);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, []);

  return (
    <div className="atlas-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={drawerRef} className="atlas-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="atlas-detail-title">
        <div className="atlas-drawer-header">
          <p className="eyebrow">{relation ? (locale === "zh-CN" ? "语境关系" : "Context relation") : (locale === "zh-CN" ? "对象档案" : "Entity dossier")}</p>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={locale === "zh-CN" ? "关闭详情" : "Close detail"}><Icon name="close" /></button>
        </div>
        {adjacentKeys.length > 1 ? (
          <nav className="atlas-drawer-traversal" aria-label={locale === "zh-CN" ? "在当前结果中浏览" : "Browse current results"}>
            <span>{locale === "zh-CN" ? `${adjacentIndex + 1} / ${adjacentKeys.length}` : `${adjacentIndex + 1} / ${adjacentKeys.length}`}</span>
            <div>
              <button type="button" disabled={adjacentIndex <= 0} onClick={() => adjacentIndex > 0 && onOpenDetail(adjacentKeys[adjacentIndex - 1])}>{locale === "zh-CN" ? "上一个" : "Previous"}</button>
              <button type="button" disabled={adjacentIndex < 0 || adjacentIndex >= adjacentKeys.length - 1} onClick={() => adjacentIndex >= 0 && adjacentIndex < adjacentKeys.length - 1 && onOpenDetail(adjacentKeys[adjacentIndex + 1])}>{locale === "zh-CN" ? "下一个" : "Next"}</button>
            </div>
          </nav>
        ) : null}
        {relation ? (
          <RelationDrawerContent locale={locale} relation={relation} searchMap={searchMap} onFocus={onFocus} />
        ) : error ? <ErrorState locale={locale} error={error} /> : !data ? <LoadingState locale={locale} /> : (
          <EntityDrawerContent locale={locale} entity={data} relations={relations} searchItems={searchItems} onFocus={onFocus} onOpenDetail={onOpenDetail} zoomLevel={zoomLevel} />
        )}
      </aside>
    </div>
  );
}

function RelationDrawerContent({ locale, relation, searchMap, onFocus }: { locale: Locale; relation: ReadModelRelation; searchMap: Map<string, string>; onFocus: (key: string) => void }) {
  const sourceKey = contextEndpointKey(relation.source);
  const targetKey = contextEndpointKey(relation.target);
  const sourceKind = formatEntityKind(relation.source.kind as EntityKind, locale);
  const targetKind = formatEntityKind(relation.target.kind as EntityKind, locale);
  return (
    <div className="atlas-drawer-content">
      <p className="eyebrow">{sourceKind} {relationConnector(relation)} {targetKind}</p>
      <h2 id="atlas-detail-title">{searchMap.get(sourceKey) ?? sourceKey} <span aria-hidden="true">{relationConnector(relation)}</span> {searchMap.get(targetKey) ?? targetKey}</h2>
      <p className="atlas-detail-lede">{relation.label}</p>
      <dl className="atlas-detail-facts">
        <div><dt>{locale === "zh-CN" ? "关系类型" : "Relation"}</dt><dd>{formatRelationType(relation.relationType, locale)}</dd></div>
        <div><dt>{locale === "zh-CN" ? "时间" : "Time"}</dt><dd>{relation.temporalAssertions.map((assertion) => assertion.displayDate).join(" · ") || (locale === "zh-CN" ? "未标明" : "Not specified")}</dd></div>
        <div><dt>{locale === "zh-CN" ? "证据" : "Evidence"}</dt><dd>{formatEvidenceLine(relation.evidenceLayer, relation.confidence, locale)}</dd></div>
        {relation.qualifiers.interactionMode ? <div><dt>{locale === "zh-CN" ? "互动方式" : "Interaction"}</dt><dd>{formatInteractionMode(relation.qualifiers.interactionMode, locale)}</dd></div> : null}
      </dl>
      <p className="atlas-detail-prose">{relation.summary}</p>
      {relation.qualifiers.note ? <p className="atlas-detail-note">{relation.qualifiers.note[locale]}</p> : null}
      <p className="atlas-detail-note">{locale === "zh-CN" ? "关系类型、方向与证据层按读模型原样展示；人物互动、空间活动、事件参与、文本归属与后世接受不会被混写成同一种关系。" : "Relation type, direction and evidence follow the read model; personal interaction, spatial activity, event participation, textual attribution and later reception remain distinct."}</p>
      {relation.sourceIds.length > 0 ? (
        <div className="atlas-drawer-sources">
          <span className="eyebrow">{locale === "zh-CN" ? "来源" : "Sources"}</span>
          <div className="atlas-drawer-actions">
            {relation.sourceIds.map((sourceId) => <Link key={sourceId} className="button button-secondary" to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}
          </div>
        </div>
      ) : null}
      <div className="atlas-drawer-actions">
        <button className="button button-secondary" type="button" onClick={() => onFocus(sourceKey)}>{locale === "zh-CN" ? `聚焦${searchMap.get(sourceKey) ?? sourceKind}` : `Focus ${searchMap.get(sourceKey) ?? sourceKind}`}</button>
        <button className="button button-secondary" type="button" onClick={() => onFocus(targetKey)}>{locale === "zh-CN" ? `聚焦${searchMap.get(targetKey) ?? targetKind}` : `Focus ${searchMap.get(targetKey) ?? targetKind}`}</button>
      </div>
    </div>
  );
}

function EntityDrawerContent({ locale, entity, relations, searchItems, onFocus, onOpenDetail, zoomLevel }: { locale: Locale; entity: EntityData; relations: ReadModelRelationIndex; searchItems: SearchItem[]; onFocus: (key: string) => void; onOpenDetail: (key: string) => void; zoomLevel: ZoomLevel }) {
  const entityKey = keyFor(entity.kind, entity.slug);
  return (
    <div className="atlas-drawer-content">
      <p className="eyebrow">{formatEntityKind(entity.kind, locale)} · {formatEvidence(entity.evidence, locale)}</p>
      <h2 id="atlas-detail-title">{entity.title}</h2>
      {entity.subtitle ? <p className="atlas-detail-subtitle">{entity.subtitle}</p> : null}
      <p className="atlas-detail-lede">{entity.shortSummary}</p>
      {entity.curatorialDescription.length > 0 ? (
        <section className="atlas-significance" aria-labelledby="atlas-significance-title">
          <p className="eyebrow">{locale === "zh-CN" ? "语境意义" : "Significance in context"}</p>
          <h3 id="atlas-significance-title">{locale === "zh-CN" ? "为什么这个对象值得被看见" : "Why this object matters"}</h3>
          <p>{entity.curatorialDescription[0]}</p>
        </section>
      ) : null}
      {entity.quote ? (
        <figure className="atlas-quote-card">
          <blockquote lang={locale === "zh-CN" ? "zh-Hans" : undefined}>{entity.quote.original}</blockquote>
          <p>{entity.quote.interpretation}</p>
          <figcaption>{entity.quote.locator} · {locale === "zh-CN" ? "言论归属与文本层保持分开" : "Attribution and textual layer remain separate"}</figcaption>
        </figure>
      ) : null}
      <dl className="atlas-detail-facts">
        <div><dt>{entity.kind === "event" ? (locale === "zh-CN" ? "时间范围" : "Time range") : (locale === "zh-CN" ? "时间" : "Time")}</dt><dd>{entity.timeLabel}</dd></div>
        {entity.kind === "event" && profileText(entity.profile, "eventKind") ? <div><dt>{locale === "zh-CN" ? "事件性质" : "Event nature"}</dt><dd>{formatEventKind(profileText(entity.profile, "eventKind"), locale)}{profileText(entity.profile, "eventScope") ? ` · ${formatEventScope(profileText(entity.profile, "eventScope"), locale)}` : ""}</dd></div> : null}
        {entity.keyFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
      </dl>
      {entity.curatorialDescription.length > 1 ? <div className="atlas-detail-prose">{entity.curatorialDescription.slice(1, 3).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div> : null}
      {entity.related.length > 0 ? (
        <section className="atlas-drawer-section" aria-labelledby="atlas-related-title">
          <h3 id="atlas-related-title">{locale === "zh-CN" ? "关联语境" : "Related context"}</h3>
          <ul className="atlas-related-list">
            {entity.related.slice(0, 12).map((related) => {
              const key = keyFor(related.kind, related.slug);
              return <li key={key}><button type="button" onClick={() => onOpenDetail(key)}>{related.title}</button><span>{related.relation}</span></li>;
            })}
          </ul>
        </section>
      ) : null}
      {entity.kind === "figure" ? <RelationNetwork locale={locale} focus={entityKey} relations={relations} searchItems={searchItems} onFocus={onFocus} compact peopleOnly zoomLevel={zoomLevel} /> : null}
      <div className="atlas-drawer-actions">
        <button className="button button-primary" type="button" onClick={() => onFocus(entityKey)}>{locale === "zh-CN" ? "在地图中定位" : "Locate in atlas"}</button>
        <Link className="button button-secondary" to={entityPath(entity.kind, entity.slug, locale)}>{locale === "zh-CN" ? "打开完整档案" : "Open full dossier"}</Link>
      </div>
      {entity.sources.length > 0 ? (
        <section className="atlas-drawer-section" aria-labelledby="atlas-source-title">
          <h3 id="atlas-source-title">{locale === "zh-CN" ? "出处与数据说明" : "Sources and data"}</h3>
          <ul className="atlas-source-list">
            {entity.sources.slice(0, 6).map((source) => <li key={source.id}><span>{source.title}</span><small>{source.locator} · {source.grade}</small></li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function profileText(profile: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = profile?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
