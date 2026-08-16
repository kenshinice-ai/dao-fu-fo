import { useEffect, useMemo, useState } from "react";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import type { RouteState, TimelineMode } from "../routing";
import { projectTimelineEvents } from "../data/contextProjection";
import { formatConfidence, formatEvidence } from "../data/labels";
import type { Locale, SearchItem, TimelineData, TimelineEvent, Tradition } from "../types";

interface FullWidthTimelineProps {
  variant?: "full" | "ribbon";
  locale: Locale;
  data: TimelineData;
  relations: ReadModelRelationIndex;
  searchItems: SearchItem[];
  focus?: string;
  traditions: Tradition[];
  from?: number;
  to?: number;
  timelineMode: TimelineMode;
  onChange: (changes: Partial<RouteState>) => void;
  onFocus: (focus: string) => void;
  isPlaying?: boolean;
  playbackYear?: number;
  onTogglePlayback?: () => void;
}

type TimelineLane = "history" | "events" | "space" | "transmission" | "memory";

const LANES: Array<{ id: TimelineLane; zh: string; en: string }> = [
  { id: "space", zh: "地点与行旅", en: "Places / journeys" },
  { id: "history", zh: "人物与时代", en: "People / periods" },
  { id: "events", zh: "事件", en: "Events" },
  { id: "transmission", zh: "文本与传承", en: "Texts / transmission" },
  { id: "memory", zh: "后世记忆", en: "Later memory" },
];

function formatYear(year: number, locale: Locale): string {
  if (year === 0) return locale === "zh-CN" ? "年代未定" : "Undated";
  if (locale === "zh-CN") return year < 0 ? `前${Math.abs(year)}年` : `${year}年`;
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

function eventFocus(event: TimelineEvent): string {
  return event.kind === "event"
    ? `${event.kind}:${event.slug}`
    : event.entity
      ? `${event.entity.kind}:${event.entity.slug}`
      : `${event.kind}:${event.slug}`;
}

function isEventFocused(event: TimelineEvent, focus: string | undefined): boolean {
  return Boolean(focus && (eventFocus(event) === focus || event.contextKeys?.includes(focus) || (event.entity && `${event.entity.kind}:${event.entity.slug}` === focus)));
}

function keepFocused(events: TimelineEvent[], limit: number, focus: string | undefined): TimelineEvent[] {
  const selected = focus ? events.filter((event) => isEventFocused(event, focus)) : [];
  return [...new Map([...events.slice(0, limit), ...selected].map((event) => [event.id, event])).values()];
}

function laneForEvent(event: TimelineEvent): TimelineLane {
  if (event.evidenceLayer === "traditional_account" || event.evidenceLayer === "mythic_symbolic" || event.predicate?.includes("memory") || event.predicate?.includes("reception")) return "memory";
  if (event.kind === "event") return "events";
  if (event.kind === "place" || event.eventKind === "journey" || event.predicate === "occurred_at" || event.predicate === "travel") return "space";
  if (["text", "text_version", "passage"].includes(event.kind) || event.predicate?.includes("transmit") || event.predicate?.includes("translation")) return "transmission";
  return "history";
}

function percent(year: number, start: number, end: number): number {
  if (end <= start) return 50;
  return Math.max(0, Math.min(100, ((year - start) / (end - start)) * 100));
}

function validBoundary(value: number, fallback: number): number {
  return Number.isSafeInteger(value) && value !== 0 ? value : fallback;
}

function density(events: TimelineEvent[], start: number, end: number, count = 16): Array<{ start: number; end: number; count: number }> {
  const bins = Array.from({ length: count }, (_, index) => ({
    start: start + ((end - start) * index) / count,
    end: start + ((end - start) * (index + 1)) / count,
    count: 0,
  }));
  if (end <= start) return [{ start, end, count: events.length }];
  for (const event of events) {
    const index = Math.min(count - 1, Math.max(0, Math.floor(((event.year - start) / (end - start)) * count)));
    bins[index]!.count += 1;
  }
  return bins;
}

export function FullWidthTimeline({
  variant = "full",
  locale,
  data,
  relations,
  searchItems,
  focus,
  traditions,
  from,
  to,
  timelineMode,
  onChange,
  onFocus,
  isPlaying = false,
  playbackYear,
  onTogglePlayback,
}: FullWidthTimelineProps) {
  const [eventLimit, setEventLimit] = useState(24);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | undefined>();
  const isRibbon = variant === "ribbon";
  const start = from ?? data.startYear;
  const end = to ?? data.endYear;
  const projected = useMemo(() => projectTimelineEvents(data, relations, searchItems, focus), [data, focus, relations, searchItems]);
  const modeEvents = timelineMode === "tradition"
    ? projected.filter((event) => event.evidenceLayer === "traditional_account" || event.evidenceLayer === "mythic_symbolic" || event.type.toLowerCase().includes("traditional"))
    : projected;
  const events = useMemo(() => (modeEvents.length > 0 ? modeEvents : projected).filter((event) => {
    const eventEnd = event.endYear ?? event.year;
    return eventEnd >= start && event.year <= end && (event.tradition === "convergence" || traditions.includes(event.tradition));
  }), [end, modeEvents, projected, start, traditions]);
  const densityBins = useMemo(() => density(events, start, end), [end, events, start]);
  const laneEvents = useMemo(() => new Map(LANES.map((lane) => [lane.id, keepFocused(events.filter((event) => laneForEvent(event) === lane.id), 34, focus)])), [events, focus]);
  const undated = projected.filter((event) => !Number.isSafeInteger(event.year));

  useEffect(() => {
    setEventLimit(24);
  }, [focus, from, timelineMode, to, traditions.join(",")]);

  const updateStart = (value: number) => {
    const next = validBoundary(value, start);
    onChange({ from: Math.min(next, end), to: end });
  };
  const updateEnd = (value: number) => {
    const next = validBoundary(value, end);
    onChange({ from: start, to: Math.max(start, next) });
  };
  const focusEvent = (event: TimelineEvent) => {
    setSelectedEvent(event);
    onFocus(eventFocus(event));
  };

  return (
    <section className={`full-width-timeline timeline-canvas ${isRibbon ? "is-ribbon" : "is-full"}`} aria-labelledby="full-width-timeline-title" data-atlas-timeline data-timeline-variant={variant} data-timeline-range={`${start}:${end}`} data-timeline-record-count={events.length}>
      <header className="full-width-timeline-heading">
        <div>
          <p className="eyebrow">{locale === "zh-CN" ? "全宽时间轴" : "Full-width chronology"}</p>
          <h2 className="full-width-timeline-tagline">{locale === "zh-CN" ? "同一时空，不同节奏" : "One space-time, different rhythms"}</h2>
          <h3 className="canvas-title" id="full-width-timeline-title">{locale === "zh-CN" ? "道—儒—佛历史时空" : "Dao–Ru–Fo historical space-time"} · {formatYear(start, locale)} — {formatYear(end, locale)}{playbackYear !== undefined ? ` · ${locale === "zh-CN" ? "播放至" : "playing to"} ${formatYear(playbackYear, locale)}` : ""}</h3>
          <p>{locale === "zh-CN" ? "历史年代、事件、空间活动、文本传承与后世记忆分层呈现；点击节点会把地图、关系图和对象面板带到同一焦点。" : "Historical time, events, spatial activity, textual transmission and later memory stay in separate lanes; selecting a marker links the map, graph and object panel to the same focus."}</p>
        </div>
        <span className="full-width-timeline-count" aria-live="polite">{events.length} / {projected.length} {locale === "zh-CN" ? "条记录" : "records"}</span>
      </header>

      <div className="full-width-timeline-controls">
        <div className="timeline-mode-switch" role="group" aria-label={locale === "zh-CN" ? "时间轴模式" : "Timeline mode"}>
          {(["history", "tradition"] as TimelineMode[]).map((mode) => <button key={mode} type="button" className={timelineMode === mode ? "active" : ""} aria-pressed={timelineMode === mode} onClick={() => onChange({ timelineMode: mode })}>{mode === "history" ? (locale === "zh-CN" ? "历史时间" : "Historical") : (locale === "zh-CN" ? "传统顺序" : "Traditional")}</button>)}
        </div>
        <div className="full-width-timeline-inputs">
          <label><span>{locale === "zh-CN" ? "起点" : "Start"}</span><input type="number" value={start} min={data.startYear} max={data.endYear} aria-label={locale === "zh-CN" ? "时间轴起始年份" : "Timeline start year"} onChange={(event) => updateStart(Number(event.target.value))} /></label>
          <span aria-hidden="true">—</span>
          <label><span>{locale === "zh-CN" ? "终点" : "End"}</span><input type="number" value={end} min={data.startYear} max={data.endYear} aria-label={locale === "zh-CN" ? "时间轴结束年份" : "Timeline end year"} onChange={(event) => updateEnd(Number(event.target.value))} /></label>
          {(from !== undefined || to !== undefined) ? <button type="button" onClick={() => onChange({ from: undefined, to: undefined })}>{locale === "zh-CN" ? "全段" : "Full range"}</button> : null}
          {onTogglePlayback ? <button type="button" className={isPlaying ? "is-playing" : ""} aria-pressed={isPlaying} onClick={onTogglePlayback}>{isPlaying ? (locale === "zh-CN" ? "暂停" : "Pause") : (locale === "zh-CN" ? "播放" : "Play")}</button> : null}
        </div>
      </div>

      <div className="full-width-timeline-brush atlas-timeline-range" aria-label={locale === "zh-CN" ? "时间轴范围刷选" : "Timeline range brush"}>
        <label><span>{locale === "zh-CN" ? "刷选起点" : "Brush start"}</span><input type="range" min={data.startYear} max={data.endYear} value={start} onChange={(event) => updateStart(Number(event.target.value))} /></label>
        <label><span>{locale === "zh-CN" ? "刷选终点" : "Brush end"}</span><input type="range" min={data.startYear} max={data.endYear} value={end} onChange={(event) => updateEnd(Number(event.target.value))} /></label>
      </div>

      <div className="full-width-timeline-track-wrap" aria-label={locale === "zh-CN" ? "五层时间轴轨道" : "Five-lane chronology"}>
        <div className="full-width-timeline-track atlas-timeline-track" data-timeline-track role="group" aria-label={locale === "zh-CN" ? "时间轴记录节点" : "Timeline record markers"}>
          <div className="full-width-timeline-density" aria-hidden="true">
            {densityBins.map((bin, index) => <span key={`${bin.start}-${index}`} style={{ left: `${percent(bin.start, start, end)}%`, width: `${Math.max(0.5, percent(bin.end, start, end) - percent(bin.start, start, end))}%`, height: `${Math.min(100, 16 + bin.count * 5)}%` }} />)}
          </div>
          <div className="full-width-timeline-axis" aria-hidden="true"><span>{formatYear(start, locale)}</span><span>{formatYear(Math.round(start + (end - start) / 2), locale)}</span><span>{formatYear(end, locale)}</span></div>
          {LANES.map((lane) => <div className={`full-width-timeline-lane timeline-lane-${lane.id}`} key={lane.id} data-timeline-lane={lane.id}><strong>{locale === "zh-CN" ? lane.zh : lane.en}</strong><div>{(laneEvents.get(lane.id) ?? []).map((event, index) => {
            const selected = isEventFocused(event, focus);
            return <button key={`${event.id}-${index}`} type="button" className={`timeline-event full-width-timeline-marker ${selected ? "is-focused" : ""}`} data-timeline-focus={eventFocus(event)} data-timeline-track-focus={eventFocus(event)} style={{ left: `${percent(event.year, start, end)}%`, top: `${10 + (index % 3) * 34}px`, zIndex: 120 - index }} aria-label={`${event.displayDate ?? formatYear(event.year, locale)} · ${event.title}`} onClick={() => focusEvent(event)}><span aria-hidden="true" /><b>{event.title}</b></button>;
          })}</div></div>)}
        </div>
      </div>

      <div className="full-width-timeline-summary" aria-live="polite"><strong>{locale === "zh-CN" ? "当前刷选" : "Current brush"}</strong><span>{formatYear(start, locale)} — {formatYear(end, locale)}</span><span>{events.length} {locale === "zh-CN" ? "条有年代记录" : "dated records"}</span>{undated.length > 0 ? <span>{undated.length} {locale === "zh-CN" ? "条年代待定" : "undated records"}</span> : null}</div>

      {selectedEvent && !isRibbon ? (
        <aside className="timeline-event-inspector" aria-live="polite" aria-label={locale === "zh-CN" ? "当前时间事件检查器" : "Selected timeline event inspector"}>
          <div>
            <p className="eyebrow">{locale === "zh-CN" ? "当前事件" : "Selected event"}</p>
            <h3>{selectedEvent.title}</h3>
            <p>{selectedEvent.summary}</p>
          </div>
          <dl>
            <div><dt>{locale === "zh-CN" ? "时间" : "Time"}</dt><dd>{selectedEvent.displayDate ?? formatYear(selectedEvent.year, locale)}</dd></div>
            <div><dt>{locale === "zh-CN" ? "证据" : "Evidence"}</dt><dd>{selectedEvent.confidence ? formatConfidence(selectedEvent.confidence, locale) : formatEvidence(selectedEvent.evidenceLayer, locale)}</dd></div>
            <div><dt>{locale === "zh-CN" ? "轨道" : "Lane"}</dt><dd>{locale === "zh-CN" ? LANES.find((lane) => lane.id === laneForEvent(selectedEvent))?.zh : LANES.find((lane) => lane.id === laneForEvent(selectedEvent))?.en}</dd></div>
          </dl>
        </aside>
      ) : null}

      {!isRibbon ? <>
        <ol className="timeline-list full-width-timeline-list">
          {keepFocused(events, eventLimit, focus).map((event) => <li className={`timeline-event-list-item ${isEventFocused(event, focus) ? "is-focused" : ""}`} key={event.id}><span className="timeline-year">{event.displayDate ?? formatYear(event.year, locale)}</span><div><button className="timeline-event-select" type="button" data-timeline-focus={eventFocus(event)} onClick={() => focusEvent(event)}>{event.title}</button><small>{locale === "zh-CN" ? LANES.find((lane) => lane.id === laneForEvent(event))?.zh : LANES.find((lane) => lane.id === laneForEvent(event))?.en} · {event.kind}</small><p>{event.summary}</p><small>{event.confidence ? formatConfidence(event.confidence, locale) : formatEvidence(event.evidenceLayer, locale)}{event.evidenceLayer ? ` · ${formatEvidence(event.evidenceLayer, locale)}` : ""}</small></div></li>)}
        </ol>
        {events.length > eventLimit ? <button className="button button-secondary full-width-timeline-more" type="button" onClick={() => setEventLimit((limit) => Math.min(events.length, limit + 24))}>{locale === "zh-CN" ? "加载更多时间记录" : "Load more timeline records"}</button> : null}
      </> : null}
      {events.length === 0 ? <p className="timeline-empty-state">{locale === "zh-CN" ? "当前时间窗没有可展示的有据记录；可以扩大刷选范围。" : "No dated records are available in this window; expand the brush to continue."}</p> : null}
    </section>
  );
}
