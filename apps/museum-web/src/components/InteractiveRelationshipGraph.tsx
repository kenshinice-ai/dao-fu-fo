import { useEffect, useMemo, useRef, useState } from "react";
import type { ReadModelRelation, ReadModelRelationIndex } from "@drf-museum/domain-schema";
import type { Locale, SearchItem, Tradition } from "../types";
import type { ZoomLevel } from "../routing";
import { contextEndpointKey, relationConnector } from "../data/contextProjection";
import {
  buildRelationshipGraph,
  graphTierForZoomLevel,
  relationToneLabel,
  zoomLevelForGraphTier,
  type RelationshipGraphEdge,
  type RelationshipGraphModel,
  type RelationshipGraphNode,
  type RelationshipGraphTier,
} from "../data/relationshipGraph";
import { formatConfidence, formatEvidence, formatRelationType } from "../data/labels";

interface InteractiveRelationshipGraphProps {
  locale: Locale;
  relations: ReadModelRelationIndex;
  scopeRelations: ReadModelRelation[];
  searchItems: SearchItem[];
  focus?: string;
  traditions: Tradition[];
  zoomLevel: ZoomLevel;
  onZoomLevel: (zoomLevel: ZoomLevel) => void;
  onFocus: (focus: string) => void;
  onOpenRelation: (relationId: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

interface HoverState {
  node: RelationshipGraphNode;
  x: number;
  y: number;
}

const VIEWBOX_WIDTH = 900;
const VIEWBOX_HEIGHT = 470;
const TIER_ORDER: RelationshipGraphTier[] = ["era", "group", "major", "all"];
const TRADITION_COLORS: Record<Tradition | "convergence", string> = {
  daoism: "#2f6e68",
  confucianism: "#9a4b3d",
  buddhism: "#b1772d",
  convergence: "#6e5b85",
};
const EDGE_COLORS: Record<RelationshipGraphEdge["tone"], string> = {
  influence: "#9a4b3d",
  contemporary: "#b1772d",
  reception: "#6e5b85",
  comparison: "#2f6e68",
  other: "#747b73",
};

function titleForKey(key: string, searchItems: SearchItem[], locale: Locale): string {
  const item = searchItems.find((candidate) => contextEndpointKey(candidate) === key);
  return item?.title ?? (key.split(":").slice(1).join(":").replaceAll("-", " ") || (locale === "zh-CN" ? "未命名人物" : "Unnamed figure"));
}

function shortLabel(label: string): string {
  return label.length <= 8 ? label : `${label.slice(0, 7)}…`;
}

function nodeRadius(node: RelationshipGraphNode): number {
  if (node.kind === "era") return 24 + Math.min(16, Math.sqrt(node.weight) * 4);
  if (node.kind === "group") return 23 + Math.min(14, Math.sqrt(node.weight) * 3.5);
  return 12 + Math.min(12, node.degree * 1.8);
}

function layoutModel(model: RelationshipGraphModel, manualPositions: Map<string, Point>): RelationshipGraphModel {
  const nodes = model.nodes.map((node) => ({ ...node, ...(manualPositions.get(node.id) ?? {}) }));
  if (nodes.length <= 1) return { ...model, nodes };
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const velocity = new Map(nodes.map((node) => [node.id, { x: 0, y: 0 }]));
  const pinned = new Set(manualPositions.keys());
  for (let iteration = 0; iteration < 86; iteration += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const left = nodes[i]!;
      if (pinned.has(left.id)) continue;
      const leftVelocity = velocity.get(left.id)!;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const right = nodes[j]!;
        const rightVelocity = velocity.get(right.id)!;
        const dx = left.x - right.x;
        const dy = left.y - right.y;
        const distance = Math.max(16, Math.hypot(dx, dy));
        const force = 1750 / (distance * distance);
        leftVelocity.x += (dx / distance) * force;
        leftVelocity.y += (dy / distance) * force;
        if (!pinned.has(right.id)) {
          rightVelocity.x -= (dx / distance) * force;
          rightVelocity.y -= (dy / distance) * force;
        }
      }
    }
    for (const edge of model.edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = source.kind === "person" && target.kind === "person" ? 105 : 150;
      const force = (distance - desired) * 0.0028;
      const sourceVelocity = velocity.get(source.id)!;
      const targetVelocity = velocity.get(target.id)!;
      if (!pinned.has(source.id)) {
        sourceVelocity.x += (dx / distance) * force;
        sourceVelocity.y += (dy / distance) * force;
      }
      if (!pinned.has(target.id)) {
        targetVelocity.x -= (dx / distance) * force;
        targetVelocity.y -= (dy / distance) * force;
      }
    }
    for (const node of nodes) {
      if (pinned.has(node.id)) continue;
      const motion = velocity.get(node.id)!;
      motion.x += (VIEWBOX_WIDTH / 2 - node.x) * 0.0013;
      motion.y += (VIEWBOX_HEIGHT / 2 - node.y) * 0.0013;
      node.x = Math.max(32, Math.min(VIEWBOX_WIDTH - 32, node.x + motion.x));
      node.y = Math.max(32, Math.min(VIEWBOX_HEIGHT - 32, node.y + motion.y));
      motion.x *= 0.84;
      motion.y *= 0.84;
    }
  }
  return { ...model, nodes };
}

function edgePath(edge: RelationshipGraphEdge, nodes: Map<string, RelationshipGraphNode>, edgeIndex: number, edgeCount: number): string | null {
  const source = nodes.get(edge.source);
  const target = nodes.get(edge.target);
  if (!source || !target) return null;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const offset = (edgeIndex - (edgeCount - 1) / 2) * 14;
  const controlX = (source.x + target.x) / 2 - (dy / length) * offset;
  const controlY = (source.y + target.y) / 2 + (dx / length) * offset;
  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function graphPoint(event: React.PointerEvent<SVGElement>, transform: ViewTransform): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * VIEWBOX_WIDTH;
  const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * VIEWBOX_HEIGHT;
  return { x: (x - transform.x) / transform.k, y: (y - transform.y) / transform.k };
}

function relationDate(relation: ReadModelRelation): string | undefined {
  const date = relation.temporalAssertions.map((assertion) => assertion.displayDate).filter(Boolean).join(" · ");
  return date || undefined;
}

function tierLabel(tier: RelationshipGraphTier, locale: Locale): string {
  const labels: Record<RelationshipGraphTier, { zh: string; en: string }> = {
    era: { zh: "时代", en: "Eras" },
    group: { zh: "传统", en: "Groups" },
    major: { zh: "焦点人物", en: "Key people" },
    all: { zh: "全部人物", en: "Everyone" },
  };
  return labels[tier][locale === "zh-CN" ? "zh" : "en"];
}

export function InteractiveRelationshipGraph({
  locale,
  relations,
  scopeRelations,
  searchItems,
  focus,
  traditions,
  zoomLevel,
  onZoomLevel,
  onFocus,
  onOpenRelation,
}: InteractiveRelationshipGraphProps) {
  const tier = graphTierForZoomLevel(zoomLevel);
  const [asTable, setAsTable] = useState(false);
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [manualPositions, setManualPositions] = useState<Map<string, Point>>(new Map());
  const [hover, setHover] = useState<HoverState | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; start: Point; moved: boolean; pointerId: number } | null>(null);
  const panRef = useRef<{ start: Point; transform: ViewTransform; pointerId: number } | null>(null);
  const model = useMemo(() => buildRelationshipGraph({
    relations: relations.items,
    scopeRelations,
    searchItems,
    focus,
    traditions,
    tier,
    locale,
  }), [focus, locale, relations.items, scopeRelations, searchItems, tier, traditions]);
  const laidOutModel = useMemo(() => layoutModel(model, manualPositions), [manualPositions, model]);
  const nodeMap = useMemo(() => new Map(laidOutModel.nodes.map((node) => [node.id, node])), [laidOutModel.nodes]);
  const modelSignature = `${tier}|${focus ?? ""}|${laidOutModel.nodes.map((node) => node.id).join(",")}|${laidOutModel.edges.map((edge) => edge.id).join(",")}`;
  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (hover) {
      for (const edge of laidOutModel.edges) {
        if (edge.source === hover.node.id || edge.target === hover.node.id) {
          ids.add(edge.source);
          ids.add(edge.target);
        }
      }
    }
    if (focus && nodeMap.has(focus)) ids.add(focus);
    return ids;
  }, [focus, hover, laidOutModel.edges, nodeMap]);

  useEffect(() => {
    setTransform({ x: 0, y: 0, k: 1 });
    setHover(null);
    setManualPositions((current) => {
      const visible = new Set(laidOutModel.nodes.map((node) => node.id));
      const next = new Map([...current].filter(([id]) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [modelSignature]);

  const fitView = () => setTransform({ x: 0, y: 0, k: 1 });
  const setTier = (nextTier: RelationshipGraphTier) => {
    if (nextTier === tier) {
      fitView();
      return;
    }
    setTransform({ x: 0, y: 0, k: 1 });
    onZoomLevel(zoomLevelForGraphTier(nextTier));
  };

  const activateNode = (node: RelationshipGraphNode) => {
    if (node.kind === "person") {
      onFocus(node.id);
      return;
    }
    const index = TIER_ORDER.indexOf(tier);
    const nextTier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, index + 1)];
    if (nextTier && nextTier !== tier) setTier(nextTier);
  };

  const zoomAround = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * VIEWBOX_WIDTH,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * VIEWBOX_HEIGHT,
    };
    const factor = event.deltaY < 0 ? 1.14 : 0.88;
    setTransform((current) => {
      const k = Math.max(0.62, Math.min(3.4, current.k * factor));
      return {
        k,
        x: point.x - (point.x - current.x) * (k / current.k),
        y: point.y - (point.y - current.y) * (k / current.k),
      };
    });
  };

  const graphHeading = focus
    ? (locale === "zh-CN" ? "当前焦点的人物关系图" : "People around the current focus")
    : (locale === "zh-CN" ? "交错的人物关系" : "Interwoven people");

  return (
    <section className="relationship-graph" aria-labelledby="relationship-graph-title">
      <div className="relationship-graph-heading">
        <div>
          <p className="eyebrow">{locale === "zh-CN" ? "人物关系图" : "Relationship graph"}</p>
          <h3 id="relationship-graph-title">{graphHeading}</h3>
          <p>{locale === "zh-CN" ? "图中只取人物—人物读模型关系，并把思想影响、同时代往来与后世接受分开标注；地点、事件和文本仍沿用右侧关系清单与地图上下文。" : "The graph uses only figure-to-figure read-model relations and separates intellectual influence, contemporaneity and later reception; places, events and texts remain in the contextual list and map."}</p>
        </div>
        <div className="relationship-graph-count" aria-live="polite">
          <strong>{laidOutModel.nodes.length}</strong> {locale === "zh-CN" ? "节点" : "nodes"} · <strong>{laidOutModel.edges.length}</strong> {locale === "zh-CN" ? "条人物边" : "people edges"}
        </div>
      </div>

      <div className="relationship-graph-toolbar">
        <div className="relationship-graph-tiers" role="group" aria-label={locale === "zh-CN" ? "关系图展开层级" : "Relationship graph detail level"}>
          {TIER_ORDER.map((level) => (
            <button key={level} type="button" className={level === tier ? "active" : ""} aria-pressed={level === tier} onClick={() => setTier(level)}>
              {tierLabel(level, locale)}
            </button>
          ))}
        </div>
        <div className="relationship-graph-actions">
          <span>{model.scopedPeople} {locale === "zh-CN" ? "位关联人物" : "scoped people"}{model.hiddenPeople > 0 ? ` · ${locale === "zh-CN" ? `隐藏 ${model.hiddenPeople}` : `${model.hiddenPeople} hidden`}` : ""}</span>
          <button type="button" onClick={() => setAsTable((value) => !value)} aria-pressed={asTable}>{asTable ? (locale === "zh-CN" ? "显示关系图" : "Show graph") : (locale === "zh-CN" ? "显示关系表" : "Show as table")}</button>
          {!asTable ? <button type="button" onClick={fitView}>{locale === "zh-CN" ? "重置视图" : "Reset view"}</button> : null}
        </div>
      </div>

      {asTable ? (
        <div className="relationship-graph-table-wrap">
          <table className="relationship-graph-table">
            <caption>{locale === "zh-CN" ? `当前人物关系 · ${model.relationRows.length} 条` : `Current people relations · ${model.relationRows.length}`}</caption>
            <thead>
              <tr>
                <th scope="col">{locale === "zh-CN" ? "人物 A" : "Person A"}</th>
                <th scope="col">{locale === "zh-CN" ? "关系" : "Relation"}</th>
                <th scope="col">{locale === "zh-CN" ? "人物 B" : "Person B"}</th>
                <th scope="col">{locale === "zh-CN" ? "时间／证据" : "Time / evidence"}</th>
                <th scope="col">{locale === "zh-CN" ? "详情" : "Open"}</th>
              </tr>
            </thead>
            <tbody>
              {model.relationRows.map((relation) => {
                const source = contextEndpointKey(relation.source);
                const target = contextEndpointKey(relation.target);
                return (
                  <tr key={relation.id}>
                    <td><button type="button" onClick={() => onFocus(source)}>{titleForKey(source, searchItems, locale)}</button></td>
                    <td><button type="button" onClick={() => onOpenRelation(relation.id)}>{titleForRelation(relation, locale)} <span aria-hidden="true">{relationConnector(relation)}</span></button></td>
                    <td><button type="button" onClick={() => onFocus(target)}>{titleForKey(target, searchItems, locale)}</button></td>
                    <td>{relationDate(relation) ?? formatEvidence(relation.evidenceLayer, locale)} · {formatConfidence(relation.confidence, locale)}</td>
                    <td><button type="button" onClick={() => onOpenRelation(relation.id)}>{locale === "zh-CN" ? "查看" : "Open"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {model.relationRows.length === 0 ? <p className="relationship-graph-empty">{locale === "zh-CN" ? "当前上下文暂时没有可核实的人物—人物关系；地点、事件、文本和后世接受仍可从右侧清单进入。" : "No verified figure-to-figure relation is available in this context yet; use the right-hand list for places, events, texts and later reception."}</p> : null}
        </div>
      ) : (
        <div className="relationship-graph-canvas-wrap" ref={canvasWrapRef}>
          <svg
            className="relationship-graph-canvas"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            role="img"
            aria-label={`${laidOutModel.nodes.length} ${locale === "zh-CN" ? "个节点" : "nodes"}, ${laidOutModel.edges.length} ${locale === "zh-CN" ? "条边" : "edges"}`}
            onWheel={zoomAround}
            onPointerDown={(event) => {
              const target = event.target as Element;
              if (event.target !== event.currentTarget && !target.classList.contains("relationship-graph-backdrop")) return;
              const point = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
              panRef.current = { start: point, transform, pointerId: event.pointerId };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (drag && drag.pointerId === event.pointerId) {
                const current = graphPoint(event, transform);
                if (!drag.moved && Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) > 3) drag.moved = true;
                if (drag.moved) setManualPositions((positions) => new Map(positions).set(drag.id, current));
                return;
              }
              const pan = panRef.current;
              if (pan && pan.pointerId === event.pointerId) {
                setTransform({ ...pan.transform, x: pan.transform.x + event.clientX - pan.start.x, y: pan.transform.y + event.clientY - pan.start.y });
              }
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              if (drag && drag.pointerId === event.pointerId) {
                dragRef.current = null;
                if (!drag.moved) {
                  const node = nodeMap.get(drag.id);
                  if (node) activateNode(node);
                }
                return;
              }
              if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
            }}
            onPointerCancel={() => { dragRef.current = null; panRef.current = null; }}
          >
            <defs>
              <filter id="relationship-graph-shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#202522" floodOpacity="0.16" /></filter>
              {(Object.entries(EDGE_COLORS) as [RelationshipGraphEdge["tone"], string][]).map(([tone, color]) => <marker key={tone} id={`relationship-graph-arrow-${tone}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 8 4 L 0 8 z" fill={color} /></marker>)}
            </defs>
            <rect className="relationship-graph-backdrop" x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx="16" />
            <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
              {laidOutModel.edges.map((edge, index) => {
                const relatedCount = laidOutModel.edges.filter((candidate) => candidate.source === edge.source && candidate.target === edge.target || candidate.source === edge.target && candidate.target === edge.source).length;
                const relatedIndex = laidOutModel.edges.filter((candidate) => candidate.source === edge.source && candidate.target === edge.target || candidate.source === edge.target && candidate.target === edge.source).indexOf(edge);
                const path = edgePath(edge, nodeMap, relatedIndex, relatedCount);
                if (!path) return null;
                const active = activeNodeIds.size === 0 || activeNodeIds.has(edge.source) || activeNodeIds.has(edge.target);
                return <path key={edge.id} className={`relationship-graph-edge tone-${edge.tone}`} d={path} style={{ opacity: active ? 0.78 : 0.12, stroke: EDGE_COLORS[edge.tone] }} markerEnd={edge.directed ? `url(#relationship-graph-arrow-${edge.tone})` : undefined} role="button" tabIndex={0} aria-label={`${edge.label}: ${titleForKey(edge.source, searchItems, locale)} ${titleForKey(edge.target, searchItems, locale)}`} onClick={() => onOpenRelation(edge.relationIds[0]!)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenRelation(edge.relationIds[0]!); } }}><title>{edge.label} · {edge.summary}</title></path>;
              })}
              {laidOutModel.nodes.map((node) => {
                const active = activeNodeIds.size === 0 || activeNodeIds.has(node.id);
                const selected = node.id === focus;
                return (
                  <g
                    key={node.id}
                    className={`relationship-graph-node node-${node.kind}`}
                    transform={`translate(${node.x} ${node.y})`}
                    style={{ opacity: active ? 1 : 0.18 }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label} · ${node.sublabel}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragRef.current = { id: node.id, start: { x: event.clientX, y: event.clientY }, moved: false, pointerId: event.pointerId };
                    }}
                    onPointerMove={(event) => {
                      const drag = dragRef.current;
                      if (!drag || drag.id !== node.id || drag.pointerId !== event.pointerId) return;
                      const current = graphPoint(event, transform);
                      if (!drag.moved && Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) > 3) drag.moved = true;
                      if (drag.moved) setManualPositions((positions) => new Map(positions).set(node.id, current));
                    }}
                    onPointerUp={(event) => {
                      event.stopPropagation();
                      const drag = dragRef.current;
                      if (!drag || drag.id !== node.id || drag.pointerId !== event.pointerId) return;
                      dragRef.current = null;
                      if (!drag.moved) activateNode(node);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setManualPositions((positions) => {
                        const next = new Map(positions);
                        next.delete(node.id);
                        return next;
                      });
                    }}
                    onPointerEnter={(event) => { const rect = canvasWrapRef.current?.getBoundingClientRect(); setHover({ node, x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }); }}
                    onPointerMoveCapture={(event) => { if (!dragRef.current) { const rect = canvasWrapRef.current?.getBoundingClientRect(); setHover({ node, x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }); } }}
                    onPointerLeave={() => setHover(null)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activateNode(node); } }}
                  >
                    {selected ? <circle className="relationship-graph-node-halo" r={nodeRadius(node) + 7} /> : null}
                    <circle className="relationship-graph-node-disc" r={nodeRadius(node)} fill={TRADITION_COLORS[node.tradition]} filter={node.kind === "person" ? undefined : "url(#relationship-graph-shadow)"} />
                    <text className="relationship-graph-node-label" textAnchor="middle" y="4">{node.kind === "person" ? shortLabel(node.label) : node.label}</text>
                    <text className="relationship-graph-node-count" textAnchor="middle" y={nodeRadius(node) + 16}>{node.kind === "person" ? node.degree : node.weight}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          {hover ? <div className="relationship-graph-tooltip" style={{ left: `${Math.min(Math.max(8, hover.x + 12), Math.max(8, (canvasWrapRef.current?.clientWidth ?? 320) - 220))}px`, top: `${Math.min(Math.max(8, hover.y + 12), Math.max(8, (canvasWrapRef.current?.clientHeight ?? 320) - 100))}px` }}><strong>{hover.node.label}</strong><span>{hover.node.sublabel}</span><small>{hover.node.kind === "person" ? `${hover.node.degree} ${locale === "zh-CN" ? "条相连人物关系" : "connected people relations"}` : `${hover.node.weight} ${locale === "zh-CN" ? "位人物" : "people"}`}</small></div> : null}
          <p className="relationship-graph-hint">{locale === "zh-CN" ? "滚轮缩放，拖动空白区域平移；拖动节点固定位置，双击节点释放。点击人物进入 canonical 人物 URL，点击边打开关系详情。" : "Scroll to zoom and drag the background to pan; drag a node to pin it and double-click to release. Click a person for its canonical URL, or an edge for relation detail."}</p>
        </div>
      )}

      <ul className="relationship-graph-legend" aria-label={locale === "zh-CN" ? "关系语义图例" : "Relation semantics legend"}>
        {(Object.keys(EDGE_COLORS) as RelationshipGraphEdge["tone"][]).map((tone) => <li key={tone}><i style={{ background: EDGE_COLORS[tone] }} />{relationToneLabel(tone, locale)}</li>)}
      </ul>
    </section>
  );
}

function titleForRelation(relation: ReadModelRelation, locale: Locale): string {
  return relation.label || formatRelationType(relation.relationType, locale);
}
