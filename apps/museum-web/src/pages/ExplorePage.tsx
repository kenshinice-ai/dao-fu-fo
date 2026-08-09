import { useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath, parseRouteState, serializeRouteState } from "../routing";
import type { ExploreView, RouteState, ViewMode } from "../routing";
import type { GraphData, Locale, MuseumMapData, TimelineData, Tradition } from "../types";

export function ExplorePage() {
  const { locale } = useMuseumContext();
  const [params, setParams] = useSearchParams();
  const routeState = parseRouteState(params);
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
          <p className="eyebrow">Explore / {locale === "zh-CN" ? "隋唐切片" : "Sui–Tang slice"}</p>
          <h1>{locale === "zh-CN" ? "在同一座城市，看见三条传统" : "See three traditions in one city"}</h1>
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
      {routeState.view === "map" ? <MapView locale={locale} traditions={routeState.traditions} /> : null}
      {routeState.view === "cosmos" ? <CosmosView locale={locale} traditions={routeState.traditions} /> : null}
      {routeState.view === "timeline" ? <TimelineView locale={locale} traditions={routeState.traditions} from={routeState.from} to={routeState.to} /> : null}
      {routeState.view === "graph" ? <GraphView locale={locale} traditions={routeState.traditions} /> : null}
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
      <p className="explore-state-note">
        {locale === "zh-CN"
          ? `可分享状态：${state.mode === "research" ? "研究模式" : "当前筛选"} · ${state.traditions.length} 条传统`
          : `Shareable state: ${state.mode} · ${state.traditions.length} tradition${state.traditions.length === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

function MapView({ locale, traditions }: { locale: Locale; traditions: Tradition[] }) {
  const loader = useCallback((signal: AbortSignal) => staticData.map(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  return <MapPlate data={data} locale={locale} traditions={traditions} />;
}

function MapPlate({ data, locale, traditions }: { data: MuseumMapData; locale: Locale; traditions: Tradition[] }) {
  const visibleFeatures = data.features.filter((feature) =>
    feature.properties.tradition === "convergence" || traditions.includes(feature.properties.tradition),
  );
  const bounds = useMemo(() => {
    const features = visibleFeatures.length > 0 ? visibleFeatures : data.features;
    const lons = features.map((feature) => feature.geometry.coordinates[0]);
    const lats = features.map((feature) => feature.geometry.coordinates[1]);
    return { minLon: Math.min(...lons), maxLon: Math.max(...lons), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
  }, [data, visibleFeatures]);

  const project = ([lon, lat]: [number, number]) => {
    const x = 80 + ((lon - bounds.minLon) / Math.max(0.01, bounds.maxLon - bounds.minLon)) * 820;
    const y = 510 - ((lat - bounds.minLat) / Math.max(0.01, bounds.maxLat - bounds.minLat)) * 390;
    return [x, y] as const;
  };

  return (
    <div className="explore-golden page-shell">
      <div className="map-canvas">
        <div className="canvas-title">
          <span>{locale === "zh-CN" ? "历史地理示意 · 坐标来自现实地点" : "Historical geography · real coordinates"}</span>
          <strong>581—907</strong>
        </div>
        <svg viewBox="0 0 980 580" role="img" aria-labelledby="map-title map-desc">
          <title id="map-title">{locale === "zh-CN" ? "隋唐佛道儒地点示意图" : "Sui–Tang sites across three traditions"}</title>
          <desc id="map-desc">{locale === "zh-CN" ? "依据真实经纬度投影的地点示意，重点显示长安、洛阳、敦煌和五台山。" : "A schematic projected from real coordinates, highlighting Chang'an, Luoyang, Dunhuang and Mount Wutai."}</desc>
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(32,37,34,.09)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="980" height="580" fill="url(#mapGrid)" />
          <path className="map-river" d="M34 330C180 260 350 390 502 316s298-118 448-52" />
          <path className="map-route" d="M104 210C236 250 350 305 482 341s266 18 370-40" />
          {visibleFeatures.map((feature) => {
            const [x, y] = project(feature.geometry.coordinates);
            return (
              <g key={feature.id} className={`map-node tradition-${feature.properties.tradition}`} transform={`translate(${x} ${y})`}>
                <circle r={feature.properties.slug === "changan" ? 17 : 10} />
                <text x="0" y="-18" textAnchor="middle">{feature.properties.title}</text>
              </g>
            );
          })}
          <g className="map-compass" transform="translate(920 70)"><path d="M0 28V-22M-6-10 0-22l6 12" /><text x="0" y="-31" textAnchor="middle">N</text></g>
        </svg>
      </div>
      <aside className="explore-evidence">
        <p className="eyebrow">{locale === "zh-CN" ? "地点列表" : "Place list"}</p>
        <h2>{locale === "zh-CN" ? "帝国城市与传播网络" : "Imperial cities and networks"}</h2>
        <p>{locale === "zh-CN" ? "本版只显示有现实地理指向的地点。神圣地理不会被写成伪经纬度。" : "Only places with real geographic referents appear here. Sacred geography is never assigned false coordinates."}</p>
        <ul className="evidence-list">
          {visibleFeatures.map((feature) => (
            <li key={feature.id}>
              <TraditionMark tradition={feature.properties.tradition} size="sm" />
              <div>
                <Link to={entityPath("place", feature.properties.slug, locale)}>{feature.properties.title}</Link>
                <span>{feature.properties.placeType} · {feature.properties.confidence}</span>
                <p>{feature.properties.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function TimelineView({ locale, traditions, from, to }: { locale: Locale; traditions: Tradition[]; from?: number; to?: number }) {
  const loader = useCallback((signal: AbortSignal) => staticData.timeline(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  return <TimelinePlate data={data} locale={locale} traditions={traditions} from={from} to={to} />;
}

function TimelinePlate({ data, locale, traditions, from, to }: { data: TimelineData; locale: Locale; traditions: Tradition[]; from?: number; to?: number }) {
  const startYear = from ?? data.startYear;
  const endYear = to ?? data.endYear;
  const visibleEvents = data.events.filter((event) => {
    const eventEnd = event.endYear ?? event.year;
    return eventEnd >= startYear && event.year <= endYear && (event.tradition === "convergence" || traditions.includes(event.tradition));
  });
  const xFor = (year: number) => 55 + ((year - startYear) / Math.max(1, endYear - startYear)) * 870;
  const lanes: Record<Tradition | "convergence", number> = { buddhism: 120, daoism: 220, confucianism: 320, convergence: 420 };
  return (
    <div className="explore-golden page-shell">
      <div className="timeline-canvas">
        <div className="canvas-title"><span>{data.title}</span><strong>{startYear}—{endYear}</strong></div>
        <svg viewBox="0 0 980 520" role="img">
          <title>{data.title}</title>
          {Object.entries(lanes).map(([tradition, y]) => (
            <g key={tradition}>
              <line x1="55" x2="925" y1={y} y2={y} className="timeline-line" />
              <text x="20" y={y + 5} className="timeline-lane-label">
                {tradition === "buddhism" ? "佛" : tradition === "daoism" ? "道" : tradition === "confucianism" ? "儒" : "合"}
              </text>
            </g>
          ))}
          {visibleEvents.map((event) => {
            const x = xFor(event.year);
            const y = lanes[event.tradition];
            return (
              <g key={event.id} className={`timeline-event tradition-${event.tradition}`} transform={`translate(${x} ${y})`}>
                <circle r="8" />
                <line y1="-8" y2="-36" />
                <text y="-45" textAnchor="middle">{event.year}</text>
              </g>
            );
          })}
          {[600, 650, 700, 750, 800, 850, 900].filter((year) => year >= startYear && year <= endYear).map((year) => (
            <g key={year} transform={`translate(${xFor(year)} 480)`}>
              <line y1="-18" y2="0" className="timeline-tick" />
              <text y="22" textAnchor="middle">{year}</text>
            </g>
          ))}
        </svg>
      </div>
      <aside className="explore-evidence">
        <p className="eyebrow">{locale === "zh-CN" ? "事件列表" : "Event list"}</p>
        <h2>{locale === "zh-CN" ? "同一时代，不同节奏" : "One era, different rhythms"}</h2>
        <ul className="timeline-list">
          {visibleEvents.map((event) => (
            <li key={event.id}>
              <span className={`timeline-year tradition-border-${event.tradition}`}>{event.year}</span>
              <div>
                {event.entity ? <Link to={entityPath(event.entity.kind, event.entity.slug, locale)}>{event.title}</Link> : <strong>{event.title}</strong>}
                <p>{event.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function GraphView({ locale, traditions }: { locale: Locale; traditions: Tradition[] }) {
  const loader = useCallback((signal: AbortSignal) => staticData.graph(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  return <GraphPlate data={data} locale={locale} traditions={traditions} />;
}

function GraphPlate({ data, locale, traditions }: { data: GraphData; locale: Locale; traditions: Tradition[] }) {
  const visibleNodes = data.nodes.filter((node) => node.tradition === "convergence" || traditions.includes(node.tradition));
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
            <Link key={node.id} to={entityPath(node.kind, node.slug, locale)} className={`graph-node tradition-${node.tradition}`}>
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
      </aside>
    </div>
  );
}

function CosmosView({ locale, traditions }: { locale: Locale; traditions: Tradition[] }) {
  const traditionLabels = {
    daoism: locale === "zh-CN" ? "道" : "Dao",
    confucianism: locale === "zh-CN" ? "儒" : "Ru",
    buddhism: locale === "zh-CN" ? "佛" : "Fo",
  } as const;
  const positions = {
    daoism: [300, 190],
    confucianism: [510, 330],
    buddhism: [720, 190],
  } as const;
  return (
    <div className="explore-golden page-shell">
      <div className="cosmos-canvas">
        <div className="canvas-title">
          <span>{locale === "zh-CN" ? "传统宇宙观示意 · 非现实地图" : "Traditional cosmologies · not a geographic map"}</span>
          <strong>{locale === "zh-CN" ? "象征层" : "Symbolic"}</strong>
        </div>
        <svg viewBox="0 0 980 580" role="img" aria-labelledby="cosmos-title cosmos-desc">
          <title id="cosmos-title">{locale === "zh-CN" ? "道儒佛传统宇宙观示意" : "Schematic of Dao, Ru and Fo cosmologies"}</title>
          <desc id="cosmos-desc">
            {locale === "zh-CN"
              ? "这是传统叙事的象征性关系图，不代表现实经纬度，也不把不同传统压缩成同一套神学。"
              : "A symbolic relationship diagram for traditional narratives. It does not represent real coordinates or collapse the traditions into one theology."}
          </desc>
          <circle className="cosmos-orbit cosmos-orbit-outer" cx="510" cy="260" r="205" />
          <circle className="cosmos-orbit cosmos-orbit-inner" cx="510" cy="260" r="112" />
          <path className="cosmos-thread" d="M300 190Q510 62 720 190M300 190Q510 460 720 190M300 190Q510 320 720 190" />
          <g className="cosmos-center">
            <circle cx="510" cy="260" r="55" />
            <text x="510" y="254" textAnchor="middle">{locale === "zh-CN" ? "相遇" : "Encounter"}</text>
            <text x="510" y="277" textAnchor="middle">{locale === "zh-CN" ? "不是合一" : "not sameness"}</text>
          </g>
          {traditions.map((tradition) => {
            const [x, y] = positions[tradition];
            return (
              <g key={tradition} className={`cosmos-node tradition-${tradition}`} transform={`translate(${x} ${y})`}>
                <circle r="48" />
                <text x="0" y="8" textAnchor="middle">{traditionLabels[tradition]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <aside className="explore-evidence">
        <p className="eyebrow">{locale === "zh-CN" ? "象征层说明" : "Symbolic layer"}</p>
        <h2>{locale === "zh-CN" ? "把神圣地理与现实地理分开" : "Keep sacred and real geographies distinct"}</h2>
        <p>
          {locale === "zh-CN"
            ? "这里呈现的是传统文本、仪式与后世叙事中的象征关系。它可以帮助我们比较不同传统如何组织世界，但不能替代现实地点的历史证据。"
            : "This view presents symbolic relationships in texts, ritual and later narratives. It supports comparison without replacing historical evidence about real places."}
        </p>
        <ul className="relation-list">
          <li><strong>{locale === "zh-CN" ? "现实地图" : "Real map"}</strong><small>{locale === "zh-CN" ? "使用现实坐标，标明证据与置信度。" : "Uses real coordinates with evidence and confidence."}</small></li>
          <li><strong>{locale === "zh-CN" ? "神圣地理" : "Sacred geography"}</strong><small>{locale === "zh-CN" ? "使用象征关系，不生成伪经纬度。" : "Uses symbolic relations without inventing coordinates."}</small></li>
        </ul>
      </aside>
    </div>
  );
}
