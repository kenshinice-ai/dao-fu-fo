import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ReadModelRelation, ReadModelRelationIndex } from "@drf-museum/domain-schema";
import type { AtlasTab, RouteState, TimelineMode } from "../routing";
import { entityPath, withLang } from "../routing";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { contextEndpointKey, eventFigureContexts, isPersonToPersonRelation, placeEventContexts, placeFigureContexts, projectTimelineEvents } from "../data/contextProjection";
import { CivilisationMap } from "./CivilisationMap";
import { ErrorState, LoadingState } from "./LoadingState";
import { Icon } from "./Icon";
import { RelationNetwork } from "./RelationNetwork";
import { ERA_CONTEXTS } from "../data/eraContexts";
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
  return `relation:${id}`;
}

function relationFromDetail(detail: string | undefined, relations: ReadModelRelationIndex | undefined): ReadModelRelation | undefined {
  if (!detail?.startsWith("relation:") || !relations) return undefined;
  return relations.items.find((relation) => relation.id === detail.slice("relation:".length));
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
  if (kind === "place" || kind === "figure") return "figures";
  if (kind === "event") return "events";
  if (kind === "route") return "routes";
  if (kind === "text") return "texts";
  if (kind === "passage") return "sayings";
  return fallback;
}

function scopeKeyForState(state: RouteState): string | undefined {
  if (state.scope) return state.scope;
  if (state.focus?.startsWith("place:") || state.focus?.startsWith("event:")) return state.focus;
  return undefined;
}

function scopeLabelFor(state: RouteState, locale: Locale): string | undefined {
  const scope = scopeKeyForState(state);
  if (scope?.startsWith("place:") && state.atlasTab === "figures") return locale === "zh-CN" ? "关联人物" : "Connected figures";
  if (scope?.startsWith("place:") && state.atlasTab === "events") return locale === "zh-CN" ? "城市事件" : "Events in this place";
  if (scope?.startsWith("place:") && state.atlasTab === "relations") return locale === "zh-CN" ? "城市人物关系" : "Person relations in this place";
  if (scope?.startsWith("event:") && state.atlasTab === "figures") return locale === "zh-CN" ? "事件人物" : "Figures in this event";
  return undefined;
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
  const [query, setQuery] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");

  const searchMap = useMemo(() => new Map((data?.searchItems ?? []).map((item) => [keyFor(item.kind, item.slug), item.title])), [data?.searchItems]);
  const focusTitle = titleFor(state.focus, data?.searchItems ?? [], locale);
  const scopeKey = scopeKeyForState(state);
  const eraContext = ERA_CONTEXTS[eraIdForState(state)] ?? ERA_CONTEXTS.all;

  const scopedFigureKeys = useMemo(() => {
    if (!data || !scopeKey?.startsWith("place:")) return undefined;
    return new Set(placeFigureContexts(data.relations, scopeKey).map((context) => context.figureKey));
  }, [data, scopeKey]);
  const scopedEventKeys = useMemo(() => {
    if (!data || !scopeKey?.startsWith("place:")) return undefined;
    return new Set(placeEventContexts(data.relations, scopeKey).map((context) => context.eventKey));
  }, [data, scopeKey]);
  const scopedRelationKeys = useMemo(() => {
    if (!data || !scopeKey?.startsWith("place:")) return undefined;
    return new Set([...scopedFigureKeys ?? []]);
  }, [data, scopedFigureKeys, scopeKey]);

  const filteredItems = useMemo(() => {
    if (!data || state.atlasTab === "relations") return [];
    const definition = TAB_DEFINITIONS[state.atlasTab];
    const normalisedQuery = query.trim().toLocaleLowerCase();
    return data.searchItems
      .filter((item) => item.kind === definition.kind)
      .filter((item) => item.tradition === "convergence" || state.traditions.includes(item.tradition))
      .filter((item) => {
        if (scopeKey?.startsWith("place:") && state.atlasTab === "figures") return scopedFigureKeys?.has(keyFor(item.kind, item.slug)) ?? false;
        if (scopeKey?.startsWith("place:") && state.atlasTab === "events") return scopedEventKeys?.has(keyFor(item.kind, item.slug)) ?? false;
        if (state.focus?.startsWith("event:") && state.atlasTab === "figures") return eventFigureContexts(data.relations, state.focus).some((context) => context.figureKey === keyFor(item.kind, item.slug));
        return true;
      })
      .filter((item) => !normalisedQuery || `${item.title} ${item.context}`.toLocaleLowerCase().includes(normalisedQuery))
      .sort((a, b) => a.title.localeCompare(b.title, locale === "zh-CN" ? "zh-Hans" : "en"));
  }, [data, locale, query, scopeKey, scopedEventKeys, scopedFigureKeys, state.atlasTab, state.focus, state.traditions]);

  const relationItems = useMemo(() => {
    if (!data || state.atlasTab !== "relations") return [];
    const normalisedQuery = query.trim().toLocaleLowerCase();
    return data.relations.items
      .filter(isPersonToPersonRelation)
      .filter((relation) => {
        const source = keyFor(relation.source.kind, relation.source.slug);
        const target = keyFor(relation.target.kind, relation.target.slug);
        const sourceTitle = searchMap.get(source) ?? source;
        const targetTitle = searchMap.get(target) ?? target;
        return !normalisedQuery || `${sourceTitle} ${targetTitle} ${relation.label}`.toLocaleLowerCase().includes(normalisedQuery);
      })
      .filter((relation) => {
        if (!scopedRelationKeys) return true;
        const sourceKey = keyFor(relation.source.kind, relation.source.slug);
        const targetKey = keyFor(relation.target.kind, relation.target.slug);
        return scopedRelationKeys.has(sourceKey) && scopedRelationKeys.has(targetKey);
      })
      .filter((relation) => {
        const sourceItem = data.searchItems.find((item) => keyFor(item.kind, item.slug) === keyFor(relation.source.kind, relation.source.slug));
        const targetItem = data.searchItems.find((item) => keyFor(item.kind, item.slug) === keyFor(relation.target.kind, relation.target.slug));
        return Boolean((sourceItem?.tradition === "convergence" || !sourceItem?.tradition || state.traditions.includes(sourceItem.tradition))
          && (targetItem?.tradition === "convergence" || !targetItem?.tradition || state.traditions.includes(targetItem.tradition)));
      });
  }, [data, query, scopedRelationKeys, searchMap, state.atlasTab, state.traditions]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<AtlasTab, number>;
    for (const tab of TAB_ORDER) {
      if (tab === "relations") counts[tab] = data?.relations.items.filter(isPersonToPersonRelation).length ?? 0;
      else counts[tab] = data?.searchItems.filter((item) => item.kind === TAB_DEFINITIONS[tab].kind).length ?? 0;
    }
    return counts;
  }, [data]);

  const setFocus = (focus: string) => onChange({ focus, detail: undefined, view: "map", mapLayer: "real" });
  const setMapFocus = (focus: string, scope?: string | null) => onChange({ focus, scope: scope === null ? undefined : scope ?? state.scope, detail: undefined, atlasTab: tabForFocus(focus, state.atlasTab), view: "map", mapLayer: "real" });
  const openDetail = (detail: string) => onChange({ focus: detail.startsWith("relation:") ? state.focus : detail, detail, view: "map", mapLayer: "real" });
  const clearFocus = () => onChange({ focus: undefined, scope: undefined, detail: undefined });

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
    <section className={`atlas-workspace ${compact ? "is-compact" : ""} ${className}`.trim()} aria-labelledby="atlas-workspace-title">
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
        {state.focus || state.scope ? <button className="atlas-clear-focus" type="button" onClick={clearFocus}>{locale === "zh-CN" ? "清除焦点" : "Clear focus"}</button> : null}
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
                if (next.length > 0) onChange({ traditions: next });
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
            <button className={`atlas-era-chip ${active ? "active" : ""}`} key={era.id} type="button" aria-pressed={active} onClick={() => onChange({ from: era.from, to: era.to })}>
              {locale === "zh-CN" ? era.zh : era.en}
            </button>
          );
        })}
      </div>

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
            traditions={state.traditions}
            from={state.from}
            to={state.to}
            focus={state.focus}
            relations={data.relations}
            searchItems={data.searchItems}
            onFocus={setMapFocus}
            showContext
            showIndex={false}
            showRouteLedger={false}
          />
          <AtlasTimelineRail locale={locale} data={data.timeline} relations={data.relations} searchItems={data.searchItems} state={state} onChange={onChange} />
        </div>
        <AtlasObjectPanel
          locale={locale}
          state={state}
          data={data}
          query={query}
          onQuery={setQuery}
          items={filteredItems}
          relationItems={relationItems}
          tabCounts={tabCounts}
          onChange={onChange}
          onFocus={setFocus}
          onOpenDetail={openDetail}
        />
      </div>

      {state.detail ? (
        <AtlasDetailDrawer
          locale={locale}
          detailKey={state.detail}
          relations={data.relations}
          searchItems={data.searchItems}
          onClose={() => onChange({ detail: undefined })}
          onFocus={setFocus}
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
  tabCounts: Record<AtlasTab, number>;
  onChange: (changes: Partial<RouteState>) => void;
  onFocus: (key: string) => void;
  onOpenDetail: (key: string) => void;
}) {
  const titleMap = new Map(data.searchItems.map((item) => [keyFor(item.kind, item.slug), item.title]));
  const visibleItems = items.slice(0, 80);
  const scopeKey = scopeKeyForState(state);
  const scopeTitle = scopeKey ? titleMap.get(scopeKey) : undefined;
  const scopeLabel = scopeLabelFor(state, locale);
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
        <span>{state.atlasTab === "relations" ? relationItems.length : items.length} {locale === "zh-CN" ? "项" : "items"}</span>
      </div>
      {scopeLabel && scopeTitle ? (
        <div className="atlas-panel-scope-note" data-atlas-scope-note>
          <span>{scopeTitle} · {scopeLabel} · {state.atlasTab === "relations" ? relationItems.length : items.length}</span>
          <button type="button" onClick={() => onChange({ focus: scopeKey, scope: undefined, detail: undefined, view: "map", mapLayer: "real" })}>
            {locale === "zh-CN" ? `回到${scopeTitle}` : `Return to ${scopeTitle}`}
          </button>
        </div>
      ) : null}
      <div className="atlas-object-list" aria-live="polite">
        {state.atlasTab === "relations" ? relationItems.slice(0, 80).map((relation) => {
          const sourceKey = contextEndpointKey(relation.source);
          const targetKey = contextEndpointKey(relation.target);
          const detailKey = relationDetailKey(relation.id);
          return (
            <article className={`atlas-relation-card ${state.detail === detailKey ? "is-selected" : ""}`} key={relation.id}>
              <button type="button" className="atlas-object-card-main" onClick={() => onFocus(sourceKey)} aria-pressed={state.focus === sourceKey}>
                <strong>{titleMap.get(sourceKey) ?? sourceKey} <span aria-hidden="true">↔</span> {titleMap.get(targetKey) ?? targetKey}</strong>
                <span>{relation.label}</span>
                <small>{relation.temporalAssertions.map((assertion) => assertion.displayDate).join(" · ") || relation.evidenceLayer} · {relation.confidence}</small>
              </button>
              <button className="atlas-object-card-detail" type="button" onClick={() => onOpenDetail(detailKey)}>{locale === "zh-CN" ? "查看关系" : "Inspect relation"}</button>
            </article>
          );
        }) : visibleItems.map((item) => {
          const key = keyFor(item.kind, item.slug);
          return (
            <article className={`atlas-object-card ${state.focus === key ? "is-selected" : ""}`} key={key}>
              <button type="button" className="atlas-object-card-main" onClick={() => onFocus(key)} aria-pressed={state.focus === key}>
                <strong>{item.title}</strong>
                <span>{item.context}</span>
                <small>{kindLabel(item.kind, locale)} · {item.tradition === "convergence" ? (locale === "zh-CN" ? "交汇" : "Convergence") : item.tradition}</small>
              </button>
              <button className="atlas-object-card-detail" type="button" onClick={() => onOpenDetail(key)}>{locale === "zh-CN" ? "详情" : "Inspect"}</button>
            </article>
          );
        })}
        {((state.atlasTab === "relations" && relationItems.length === 0) || (state.atlasTab !== "relations" && items.length === 0)) ? <p className="atlas-empty-state">{locale === "zh-CN" ? "当前筛选下没有可展开对象。" : "No entities match the current filters."}</p> : null}
        {((state.atlasTab === "relations" ? relationItems.length : items.length) > 80) ? <p className="atlas-list-note">{locale === "zh-CN" ? "列表已先显示 80 项，请使用搜索继续缩小范围。" : "Showing the first 80 items; use search to narrow the list."}</p> : null}
      </div>
    </aside>
  );
}

function AtlasTimelineRail({ locale, data, relations, searchItems, state, onChange }: { locale: Locale; data: TimelineData; relations: ReadModelRelationIndex; searchItems: SearchItem[]; state: RouteState; onChange: (changes: Partial<RouteState>) => void }) {
  const projected = useMemo(() => projectTimelineEvents(data, relations, searchItems, state.focus), [data, relations, searchItems, state.focus]);
  const modeEvents = state.timelineMode === "tradition"
    ? projected.filter((event) => event.evidenceLayer === "traditional_account" || event.evidenceLayer === "mythic_symbolic" || event.type.toLowerCase().includes("traditional"))
    : projected;
  const events = (modeEvents.length > 0 ? modeEvents : projected).filter((event) => {
    const end = event.endYear ?? event.year;
    return end >= (state.from ?? data.startYear) && event.year <= (state.to ?? data.endYear)
      && (event.tradition === "convergence" || state.traditions.includes(event.tradition));
  });
  const shown = events.slice(0, 12);
  const start = state.from ?? data.startYear;
  const end = state.to ?? data.endYear;
  const trackEvents = sampleTimelineEvents(events);
  const trackTicks = Array.from({ length: 5 }, (_, index) => start + ((end - start) * index) / 4);
  const focusTimelineEvent = (event: TimelineEvent) => {
    const focus = eventFocus(event);
    onChange({ focus, scope: undefined, atlasTab: tabForFocus(focus, state.atlasTab), detail: undefined, view: "map", mapLayer: "real" });
  };
  return (
    <section className="atlas-timeline-rail" aria-labelledby="atlas-timeline-title" data-atlas-timeline>
      <div className="atlas-timeline-heading">
        <div>
          <p className="eyebrow">{locale === "zh-CN" ? "时间轴" : "Timeline"}</p>
          <h3 id="atlas-timeline-title">{formatYear(start, locale)} — {formatYear(end, locale)}</h3>
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
          <label><span className="sr-only">{locale === "zh-CN" ? "起始年份" : "Start year"}</span><input type="number" value={start} aria-label={locale === "zh-CN" ? "时间轴起始年份" : "Timeline start year"} onChange={(event) => { const next = Number(event.target.value); if (Number.isSafeInteger(next) && next !== 0) onChange({ from: next, to: Math.max(next, end) }); }} /></label>
          <span aria-hidden="true">—</span>
          <label><span className="sr-only">{locale === "zh-CN" ? "结束年份" : "End year"}</span><input type="number" value={end} aria-label={locale === "zh-CN" ? "时间轴结束年份" : "Timeline end year"} onChange={(event) => { const next = Number(event.target.value); if (Number.isSafeInteger(next) && next !== 0) onChange({ from: Math.min(start, next), to: next }); }} /></label>
          {(state.from !== undefined || state.to !== undefined) ? <button type="button" onClick={() => onChange({ from: undefined, to: undefined })}>{locale === "zh-CN" ? "全段" : "Full"}</button> : null}
        </div>
      </div>
      <div className="atlas-timeline-track-wrap" aria-label={locale === "zh-CN" ? "可点击时间轴" : "Interactive chronology"}>
        <div className="atlas-timeline-track" data-timeline-track role="group" aria-label={locale === "zh-CN" ? "时间轴事件节点" : "Timeline event nodes"}>
          <span className="atlas-timeline-track-line" aria-hidden="true" />
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
      {events.length > shown.length ? <p className="atlas-list-note">{locale === "zh-CN" ? `显示前 ${shown.length} 项；点击对象或缩小时间范围继续探索。` : `Showing the first ${shown.length}; select an entity or narrow the time range to continue.`}</p> : null}
    </section>
  );
}

function AtlasDetailDrawer({ locale, detailKey, relations, searchItems, onClose, onFocus }: { locale: Locale; detailKey: string; relations: ReadModelRelationIndex; searchItems: SearchItem[]; onClose: () => void; onFocus: (key: string) => void }) {
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
          <p className="eyebrow">{relation ? (locale === "zh-CN" ? "人物关系" : "Person relation") : (locale === "zh-CN" ? "对象档案" : "Entity dossier")}</p>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={locale === "zh-CN" ? "关闭详情" : "Close detail"}><Icon name="close" /></button>
        </div>
        {relation ? (
          <RelationDrawerContent locale={locale} relation={relation} searchMap={searchMap} onFocus={onFocus} />
        ) : error ? <ErrorState locale={locale} error={error} /> : !data ? <LoadingState locale={locale} /> : (
          <EntityDrawerContent locale={locale} entity={data} relations={relations} searchItems={searchItems} onFocus={onFocus} />
        )}
      </aside>
    </div>
  );
}

function RelationDrawerContent({ locale, relation, searchMap, onFocus }: { locale: Locale; relation: ReadModelRelation; searchMap: Map<string, string>; onFocus: (key: string) => void }) {
  const sourceKey = contextEndpointKey(relation.source);
  const targetKey = contextEndpointKey(relation.target);
  return (
    <div className="atlas-drawer-content">
      <h2 id="atlas-detail-title">{searchMap.get(sourceKey) ?? sourceKey} <span aria-hidden="true">↔</span> {searchMap.get(targetKey) ?? targetKey}</h2>
      <p className="atlas-detail-lede">{relation.label}</p>
      <dl className="atlas-detail-facts">
        <div><dt>{locale === "zh-CN" ? "关系类型" : "Relation"}</dt><dd>{relation.relationType}</dd></div>
        <div><dt>{locale === "zh-CN" ? "时间" : "Time"}</dt><dd>{relation.temporalAssertions.map((assertion) => assertion.displayDate).join(" · ") || (locale === "zh-CN" ? "未标明" : "Not specified")}</dd></div>
        <div><dt>{locale === "zh-CN" ? "证据" : "Evidence"}</dt><dd>{relation.evidenceLayer} · {relation.confidence}</dd></div>
      </dl>
      <p className="atlas-detail-note">{locale === "zh-CN" ? "此处只显示现实人物与现实人物之间的关系；地点、事件、著作与后世接受保持在独立语境层。" : "This layer is limited to relations between real figures; places, events, works and later reception remain separate context layers."}</p>
      <div className="atlas-drawer-actions">
        <button className="button button-secondary" type="button" onClick={() => onFocus(sourceKey)}>{locale === "zh-CN" ? "聚焦第一位人物" : "Focus first figure"}</button>
        <button className="button button-secondary" type="button" onClick={() => onFocus(targetKey)}>{locale === "zh-CN" ? "聚焦第二位人物" : "Focus second figure"}</button>
      </div>
    </div>
  );
}

function EntityDrawerContent({ locale, entity, relations, searchItems, onFocus }: { locale: Locale; entity: EntityData; relations: ReadModelRelationIndex; searchItems: SearchItem[]; onFocus: (key: string) => void }) {
  const entityKey = keyFor(entity.kind, entity.slug);
  return (
    <div className="atlas-drawer-content">
      <p className="eyebrow">{kindLabel(entity.kind, locale)} · {entity.evidence}</p>
      <h2 id="atlas-detail-title">{entity.title}</h2>
      {entity.subtitle ? <p className="atlas-detail-subtitle">{entity.subtitle}</p> : null}
      <p className="atlas-detail-lede">{entity.shortSummary}</p>
      {entity.quote ? (
        <figure className="atlas-quote-card">
          <blockquote lang={locale === "zh-CN" ? "zh-Hans" : undefined}>{entity.quote.original}</blockquote>
          <p>{entity.quote.interpretation}</p>
          <figcaption>{entity.quote.locator} · {locale === "zh-CN" ? "言论归属与文本层保持分开" : "Attribution and textual layer remain separate"}</figcaption>
        </figure>
      ) : null}
      <dl className="atlas-detail-facts">
        <div><dt>{locale === "zh-CN" ? "时间" : "Time"}</dt><dd>{entity.timeLabel}</dd></div>
        {entity.keyFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
      </dl>
      {entity.curatorialDescription.length > 0 ? <div className="atlas-detail-prose">{entity.curatorialDescription.slice(0, 2).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div> : null}
      {entity.related.length > 0 ? (
        <section className="atlas-drawer-section" aria-labelledby="atlas-related-title">
          <h3 id="atlas-related-title">{locale === "zh-CN" ? "关联语境" : "Related context"}</h3>
          <ul className="atlas-related-list">
            {entity.related.slice(0, 12).map((related) => {
              const key = keyFor(related.kind, related.slug);
              return <li key={key}><button type="button" onClick={() => onFocus(key)}>{related.title}</button><span>{related.relation}</span></li>;
            })}
          </ul>
        </section>
      ) : null}
      {entity.kind === "figure" ? <RelationNetwork locale={locale} focus={entityKey} relations={relations} searchItems={searchItems} onFocus={onFocus} compact peopleOnly /> : null}
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
