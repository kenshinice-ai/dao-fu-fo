import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { ReadModelRelation, ReadModelRelationIndex } from "@drf-museum/domain-schema";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { GraphTier } from "../routing";
import type { Locale, SearchItem, Tradition } from "../types";
import { contextEndpointKey, relationConnector } from "../data/contextProjection";
import {
  buildRelationshipGraph,
  relationToneLabel,
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
  graphTier: GraphTier;
  from?: number;
  to?: number;
  onGraphTier: (graphTier: GraphTier) => void;
  onFocus: (focus: string) => void;
  onOpenRelation: (relationId: string) => void;
}

interface Point { x: number; y: number }

interface SimulationNode extends RelationshipGraphNode {
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

interface SimulationLink extends Omit<RelationshipGraphEdge, "source" | "target"> {
  source: string | SimulationNode;
  target: string | SimulationNode;
}

interface HoverState {
  kind: "node" | "edge";
  id: string;
  x: number;
  y: number;
}

interface DragState {
  id: string;
  pointerId: number;
  start: Point;
  moved: boolean;
}

interface CanvasClickState {
  pointerId: number;
  start: Point;
}

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
const BASELINE_ZOOM_IN = 1.8;
const BASELINE_ZOOM_OUT = 0.56;

function titleForKey(key: string, searchItems: SearchItem[], locale: Locale): string {
  const item = searchItems.find((candidate) => contextEndpointKey(candidate) === key);
  return item?.title ?? (key.split(":").slice(1).join(":").replaceAll("-", " ") || (locale === "zh-CN" ? "未命名人物" : "Unnamed figure"));
}

function shortLabel(label: string): string {
  return label.length <= 9 ? label : `${label.slice(0, 8)}…`;
}

function nodeRadius(node: RelationshipGraphNode): number {
  if (node.kind === "era") return 24 + Math.min(16, Math.sqrt(node.weight) * 4);
  if (node.kind === "group") return 23 + Math.min(14, Math.sqrt(node.weight) * 3.5);
  return 12 + Math.min(12, node.degree * 1.8);
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

function relationDate(relation: ReadModelRelation): string | undefined {
  const date = relation.temporalAssertions.map((assertion) => assertion.displayDate).filter(Boolean).join(" · ");
  return date || undefined;
}

function resolveNode(value: string | SimulationNode): SimulationNode | undefined {
  return typeof value === "string" ? undefined : value;
}

function edgeEndpoints(edge: SimulationLink): { source: SimulationNode; target: SimulationNode } | undefined {
  const source = resolveNode(edge.source);
  const target = resolveNode(edge.target);
  return source && target ? { source, target } : undefined;
}

function pointFromClient(event: { clientX: number; clientY: number }, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function graphPoint(point: Point, transform: ZoomTransform): Point {
  const [x, y] = transform.invert([point.x, point.y]);
  return { x, y };
}

function distanceToSegment(point: Point, left: Point, right: Point): number {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - left.x, point.y - left.y);
  const projection = Math.max(0, Math.min(1, ((point.x - left.x) * dx + (point.y - left.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (left.x + projection * dx), point.y - (left.y + projection * dy));
}

function distanceToEdge(point: Point, source: Point, target: Point, offset: number): number {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const control = { x: (source.x + target.x) / 2 - (dy / length) * offset, y: (source.y + target.y) / 2 + (dx / length) * offset };
  let previous = source;
  let closest = Number.POSITIVE_INFINITY;
  for (let index = 1; index <= 18; index += 1) {
    const t = index / 18;
    const next = {
      x: (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * control.x + t * t * target.x,
      y: (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * control.y + t * t * target.y,
    };
    closest = Math.min(closest, distanceToSegment(point, previous, next));
    previous = next;
  }
  return closest;
}

function drawArrow(ctx: CanvasRenderingContext2D, source: Point, target: Point, color: string, transform: ZoomTransform): void {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const point = { x: target.x - unitX * 13, y: target.y - unitY * 13 };
  const size = 6 / transform.k;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(point.x + unitX * size * 1.6, point.y + unitY * size * 1.6);
  ctx.lineTo(point.x - unitY * size, point.y + unitX * size);
  ctx.lineTo(point.x + unitY * size, point.y - unitX * size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fitTransform(nodes: SimulationNode[], width: number, height: number): ZoomTransform {
  if (nodes.length === 0) return zoomIdentity;
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const graphWidth = Math.max(180, maxX - minX + 100);
  const graphHeight = Math.max(140, maxY - minY + 100);
  const scale = Math.max(0.56, Math.min(1.28, (width - 48) / graphWidth, (height - 48) / graphHeight));
  return zoomIdentity.translate(width / 2 - ((minX + maxX) / 2) * scale, height / 2 - ((minY + maxY) / 2) * scale).scale(scale);
}

function timeStatusLabel(status: RelationshipGraphEdge["timeStatus"], locale: Locale): string {
  if (status === "outside") return locale === "zh-CN" ? "时间窗外" : "Outside time window";
  if (status === "undated") return locale === "zh-CN" ? "年代未定" : "Undated";
  return locale === "zh-CN" ? "时间窗内" : "Overlaps time window";
}

export function InteractiveRelationshipGraph({
  locale,
  relations,
  scopeRelations,
  searchItems,
  focus,
  traditions,
  graphTier,
  from,
  to,
  onGraphTier,
  onFocus,
  onOpenRelation,
}: InteractiveRelationshipGraphProps) {
  const [asTable, setAsTable] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 520 });
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimulationNode>> | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const linksRef = useRef<SimulationLink[]>([]);
  const positionMemoryRef = useRef(new Map<string, Point>());
  const pinnedRef = useRef(new Set<string>());
  const dragRef = useRef<DragState | null>(null);
  const clickRef = useRef<CanvasClickState | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const baselineTransformRef = useRef<ZoomTransform>(zoomIdentity);
  const thresholdLockRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const modelRef = useRef<RelationshipGraphModel | null>(null);

  const model = useMemo(() => buildRelationshipGraph({
    relations: relations.items,
    scopeRelations,
    searchItems,
    focus,
    traditions,
    tier: graphTier,
    locale: locale === "zh-CN" ? "zh-CN" : "en",
    from,
    to,
  }), [focus, from, graphTier, locale, relations.items, scopeRelations, searchItems, to, traditions]);
  const modelSignature = `${model.effectiveTier}|${focus ?? ""}|${from ?? ""}|${to ?? ""}|${model.nodes.map((node) => node.id).join(",")}|${model.edges.map((edge) => edge.id).join(",")}`;
  const selectedNode = selectedNodeId ? model.nodes.find((node) => node.id === selectedNodeId) : undefined;
  const selectedEdge = selectedEdgeId ? model.edges.find((edge) => edge.id === selectedEdgeId) : undefined;
  const selectedRelations = selectedEdge ? model.relationRows.filter((relation) => selectedEdge.relationIds.includes(relation.id)) : [];
  const drawRef = useRef<() => void>(() => undefined);
  const scheduleDraw = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      drawRef.current();
    });
  }, []);

  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, dimensions.width, dimensions.height);
    context.fillStyle = "#fcfaf3";
    context.fillRect(0, 0, dimensions.width, dimensions.height);
    const transform = transformRef.current;
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const hoveredNodeId = hover?.kind === "node" ? hover.id : undefined;
    const hoveredEdgeId = hover?.kind === "edge" ? hover.id : undefined;
    const activeIds = new Set<string>();
    if (focus) activeIds.add(focus);
    if (hoveredNodeId) {
      activeIds.add(hoveredNodeId);
      for (const link of links) {
        const endpoints = edgeEndpoints(link);
        if (!endpoints) continue;
        if (endpoints.source.id === hoveredNodeId || endpoints.target.id === hoveredNodeId) {
          activeIds.add(endpoints.source.id);
          activeIds.add(endpoints.target.id);
        }
      }
    }
    const hasActive = activeIds.size > 0;
    context.save();
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);
    const pairCounts = new Map<string, number>();
    for (const link of links) {
      const endpoints = edgeEndpoints(link);
      if (!endpoints) continue;
      const pair = [endpoints.source.id, endpoints.target.id].sort().join("|");
      pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
    }
    const pairIndexes = new Map<string, number>();
    for (const link of links) {
      const endpoints = edgeEndpoints(link);
      if (!endpoints) continue;
      const { source, target } = endpoints;
      const pair = [source.id, target.id].sort().join("|");
      const index = pairIndexes.get(pair) ?? 0;
      pairIndexes.set(pair, index + 1);
      const count = pairCounts.get(pair) ?? 1;
      const offset = (index - (count - 1) / 2) * 16;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const controlX = (source.x + target.x) / 2 - (dy / length) * offset;
      const controlY = (source.y + target.y) / 2 + (dx / length) * offset;
      const edgeActive = !hasActive || activeIds.has(source.id) || activeIds.has(target.id) || hoveredEdgeId === link.id || selectedEdgeId === link.id;
      const color = EDGE_COLORS[link.tone];
      context.save();
      context.globalAlpha = edgeActive ? (link.timeStatus === "outside" ? 0.34 : 0.78) : 0.12;
      context.strokeStyle = color;
      context.lineWidth = selectedEdgeId === link.id || hoveredEdgeId === link.id ? 3.2 : 1.6;
      if (link.timeStatus === "outside") context.setLineDash([7, 6]);
      else if (link.timeStatus === "undated") context.setLineDash([2, 5]);
      context.beginPath();
      context.moveTo(source.x, source.y);
      context.quadraticCurveTo(controlX, controlY, target.x, target.y);
      context.stroke();
      context.setLineDash([]);
      if (link.directed) drawArrow(context, { x: controlX, y: controlY }, target, color, transform);
      context.restore();
    }
    for (const node of nodes) {
      const active = !hasActive || activeIds.has(node.id);
      const selected = node.id === focus;
      const radius = nodeRadius(node);
      context.save();
      context.globalAlpha = active ? 1 : 0.2;
      if (selected) {
        context.strokeStyle = "#202522";
        context.lineWidth = 2;
        context.setLineDash([3, 4]);
        context.beginPath();
        context.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
      }
      context.fillStyle = node.outsideTimeRange ? "#eee9dd" : TRADITION_COLORS[node.tradition];
      context.strokeStyle = node.outsideTimeRange ? "#8f897b" : "#fcfaf3";
      context.lineWidth = node.outsideTimeRange ? 2 : 1.5;
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = node.outsideTimeRange ? "#5d5a52" : "#fffdf6";
      context.font = `${node.kind === "person" ? 12 : 13}px ui-sans-serif, system-ui, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(node.kind === "person" ? shortLabel(node.label) : node.label, node.x, node.y);
      context.fillStyle = "#4d514b";
      context.font = "11px ui-sans-serif, system-ui, sans-serif";
      context.fillText(String(node.kind === "person" ? node.degree : node.weight), node.x, node.y + radius + 15);
      context.restore();
    }
    context.restore();
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const update = () => {
      const width = Math.max(320, element.clientWidth);
      const compact = window.matchMedia("(max-width: 760px)").matches;
      const height = compact
        ? Math.max(420, Math.min(560, width * 0.72))
        : Math.max(620, Math.min(760, width * 0.48));
      setDimensions({ width, height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(dimensions.width * dpr);
    canvas.height = Math.round(dimensions.height * dpr);
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    scheduleDraw();
  }, [dimensions, scheduleDraw]);

  const hitNode = useCallback((point: Point, transform = transformRef.current): SimulationNode | undefined => {
    const local = graphPoint(point, transform);
    return [...nodesRef.current].reverse().find((node) => Math.hypot(local.x - node.x, local.y - node.y) <= nodeRadius(node) + 7 / transform.k);
  }, []);

  const hitEdge = useCallback((point: Point, transform = transformRef.current): SimulationLink | undefined => {
    const local = graphPoint(point, transform);
    const pairCounts = new Map<string, number>();
    for (const link of linksRef.current) {
      const endpoints = edgeEndpoints(link);
      if (!endpoints) continue;
      const pair = [endpoints.source.id, endpoints.target.id].sort().join("|");
      pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
    }
    const pairIndexes = new Map<string, number>();
    return linksRef.current.find((link) => {
      const endpoints = edgeEndpoints(link);
      if (!endpoints) return false;
      const pair = [endpoints.source.id, endpoints.target.id].sort().join("|");
      const index = pairIndexes.get(pair) ?? 0;
      pairIndexes.set(pair, index + 1);
      const offset = (index - ((pairCounts.get(pair) ?? 1) - 1) / 2) * 16;
      return distanceToEdge(local, endpoints.source, endpoints.target, offset) <= 9 / transform.k;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width <= 0) return;
    const behavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.45, 4])
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.type === "mousedown") {
          if ("button" in event && event.button !== 0) return false;
          const mouse = event as MouseEvent;
          return !hitNode({ x: mouse.offsetX, y: mouse.offsetY });
        }
        return !dragRef.current;
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        scheduleDraw();
        const ratio = event.transform.k / Math.max(0.01, baselineTransformRef.current.k);
        if (thresholdLockRef.current) return;
        const currentIndex = TIER_ORDER.indexOf(graphTier);
        if (ratio >= BASELINE_ZOOM_IN && currentIndex < TIER_ORDER.length - 1) {
          thresholdLockRef.current = true;
          onGraphTier(TIER_ORDER[currentIndex + 1]!);
        } else if (ratio <= BASELINE_ZOOM_OUT && currentIndex > 0) {
          thresholdLockRef.current = true;
          onGraphTier(TIER_ORDER[currentIndex - 1]!);
        }
      });
    zoomBehaviorRef.current = behavior;
    select(canvas).call(behavior);
    select(canvas).call(behavior.transform, transformRef.current);
    return () => {
      select(canvas).on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [dimensions.width, graphTier, hitNode, modelSignature, onGraphTier, scheduleDraw]);

  useEffect(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    if (width <= 0) return;
    const previousPositions = positionMemoryRef.current;
    const nodes: SimulationNode[] = model.nodes.map((node) => {
      const memberPosition = node.members.map((member) => previousPositions.get(member)).find((position): position is Point => Boolean(position));
      const previous = previousPositions.get(node.id) ?? memberPosition;
      return {
        ...node,
        x: previous?.x ?? node.x * width / 900,
        y: previous?.y ?? node.y * height / 470,
        ...(pinnedRef.current.has(node.id) && previous ? { fx: previous.x, fy: previous.y } : {}),
      };
    });
    const links: SimulationLink[] = model.edges.map((edge) => ({ ...edge, source: edge.source, target: edge.target }));
    nodesRef.current = nodes;
    linksRef.current = links;
    modelRef.current = model;
    thresholdLockRef.current = false;
    const baseline = fitTransform(nodes, width, height);
    baselineTransformRef.current = baseline;
    transformRef.current = baseline;
    const simulation = forceSimulation(nodes)
      .force("link", forceLink<SimulationNode, SimulationLink>(links).id((node) => node.id).distance((link) => link.timeStatus === "outside" ? 180 : link.timeStatus === "undated" ? 155 : 125).strength(0.7))
      .force("charge", forceManyBody<SimulationNode>().strength((node) => node.kind === "person" ? -230 : -320).distanceMax(520))
      .force("collide", forceCollide<SimulationNode>().radius((node) => nodeRadius(node) + 14).iterations(2))
      .force("center", forceCenter(width / 2, height / 2))
      .force("x", forceX<SimulationNode>(width / 2).strength(0.025))
      .force("y", forceY<SimulationNode>(height / 2).strength(0.025));
    simulationRef.current = simulation;
    simulation.on("tick", () => {
      for (const node of nodes) positionMemoryRef.current.set(node.id, { x: node.x, y: node.y });
      scheduleDraw();
    });
    if (reducedMotion) {
      simulation.tick(180);
      for (const node of nodes) positionMemoryRef.current.set(node.id, { x: node.x, y: node.y });
      simulation.stop();
      scheduleDraw();
    } else {
      simulation.alpha(0.9).restart();
    }
    return () => {
      simulation.stop();
      if (simulationRef.current === simulation) simulationRef.current = null;
    };
  }, [dimensions.height, dimensions.width, model, modelSignature, reducedMotion, scheduleDraw]);

  useEffect(() => {
    const node = nodesRef.current.find((candidate) => candidate.id === focus);
    const canvas = canvasRef.current;
    if (!node || !canvas || dimensions.width <= 0) return;
    const current = transformRef.current;
    const screen = current.apply([node.x, node.y]);
    const margin = 72;
    if (screen[0] > margin && screen[0] < dimensions.width - margin && screen[1] > margin && screen[1] < dimensions.height - margin) return;
    const next = zoomIdentity.translate(current.x + dimensions.width / 2 - screen[0], current.y + dimensions.height / 2 - screen[1]).scale(current.k);
    transformRef.current = next;
    if (zoomBehaviorRef.current) select(canvas).call(zoomBehaviorRef.current.transform, next);
    scheduleDraw();
  }, [dimensions.height, dimensions.width, focus, modelSignature, scheduleDraw]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const fitView = () => {
    const canvas = canvasRef.current;
    const baseline = baselineTransformRef.current;
    transformRef.current = baseline;
    if (canvas && zoomBehaviorRef.current) select(canvas).call(zoomBehaviorRef.current.transform, baseline);
    scheduleDraw();
  };

  const setTier = (nextTier: RelationshipGraphTier) => {
    if (nextTier === graphTier) {
      fitView();
      return;
    }
    thresholdLockRef.current = true;
    onGraphTier(nextTier);
  };

  const activateNode = (node: RelationshipGraphNode) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    if (node.kind === "person") {
      onFocus(node.id);
      return;
    }
    const index = TIER_ORDER.indexOf(graphTier);
    const nextTier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, index + 1)];
    if (nextTier && nextTier !== graphTier) setTier(nextTier);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = pointFromClient(event, canvas);
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      const node = nodesRef.current.find((candidate) => candidate.id === drag.id);
      if (!node) return;
      if (!drag.moved && Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 3) drag.moved = true;
      if (!drag.moved) return;
      const next = graphPoint(point, transformRef.current);
      node.x = next.x;
      node.y = next.y;
      node.fx = next.x;
      node.fy = next.y;
      pinnedRef.current.add(node.id);
      simulationRef.current?.alphaTarget(0.18).restart();
      scheduleDraw();
      return;
    }
    const node = hitNode(point);
    const edge = node ? undefined : hitEdge(point);
    const nextHover = node
      ? { kind: "node" as const, id: node.id, x: point.x, y: point.y }
      : edge ? { kind: "edge" as const, id: edge.id, x: point.x, y: point.y } : null;
    if (nextHover?.kind !== hover?.kind || nextHover?.id !== hover?.id) setHover(nextHover);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = pointFromClient(event, canvas);
    clickRef.current = { pointerId: event.pointerId, start: point };
    const node = hitNode(point);
    if (!node) return;
    event.preventDefault();
    event.stopPropagation();
    canvas.setPointerCapture(event.pointerId);
    dragRef.current = { id: node.id, pointerId: event.pointerId, start: point, moved: false };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = pointFromClient(event, canvas);
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      const node = nodesRef.current.find((candidate) => candidate.id === drag.id);
      dragRef.current = null;
      simulationRef.current?.alphaTarget(0);
      if (!drag.moved && node) activateNode(node);
      return;
    }
    const click = clickRef.current;
    clickRef.current = null;
    if (click && click.pointerId === event.pointerId && Math.hypot(point.x - click.start.x, point.y - click.start.y) < 4) {
      const edge = hitEdge(point);
      if (edge) {
        setSelectedNodeId(null);
        setSelectedEdgeId(edge.id);
        onOpenRelation(edge.relationIds[0]!);
      }
    }
  };

  const handleDoubleClick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const node = hitNode(pointFromClient(event, canvas));
    if (!node) return;
    event.preventDefault();
    node.fx = null;
    node.fy = null;
    pinnedRef.current.delete(node.id);
    simulationRef.current?.alpha(0.25).restart();
    scheduleDraw();
  };

  const canvasLabel = `${model.nodes.length} ${locale === "zh-CN" ? "个节点" : "nodes"}, ${model.edges.length} ${locale === "zh-CN" ? "条关系边" : "relationship edges"}`;
  const graphHeading = focus
    ? (locale === "zh-CN" ? "当前焦点的人物关系图" : "People around the current focus")
    : (locale === "zh-CN" ? "交错的人物关系" : "Interwoven people");

  return (
    <section className="relationship-graph" aria-labelledby="relationship-graph-title" data-graph-renderer="canvas" data-graph-tier={graphTier} data-graph-effective-tier={model.effectiveTier} data-graph-node-count={model.nodes.length} data-graph-edge-count={model.edges.length}>
      <div className="relationship-graph-heading">
        <div>
          <p className="eyebrow">{locale === "zh-CN" ? "人物关系图" : "Relationship graph"}</p>
          <h3 id="relationship-graph-title">{graphHeading}</h3>
          <p>{locale === "zh-CN" ? "Canvas 力导图只取人物—人物读模型关系；地点、事件、文本和后世记忆保留在地图、时间轴与证据清单中。" : "The Canvas force graph uses only figure-to-figure read-model relations; places, events, texts and later memory remain in the map, timeline and evidence lists."}</p>
        </div>
        <div className="relationship-graph-count" aria-live="polite">
          <strong>{model.nodes.length}</strong> {locale === "zh-CN" ? "节点" : "nodes"} · <strong>{model.edges.length}</strong> {locale === "zh-CN" ? "条人物边" : "people edges"}
        </div>
      </div>
      <div className="relationship-graph-toolbar">
        <div className="relationship-graph-tiers" role="group" aria-label={locale === "zh-CN" ? "关系图展开层级" : "Relationship graph detail level"}>
          {TIER_ORDER.map((level) => <button key={level} type="button" className={level === graphTier ? "active" : ""} aria-pressed={level === graphTier} onClick={() => setTier(level)}>{tierLabel(level, locale)}</button>)}
        </div>
        <div className="relationship-graph-actions">
          <span>{model.scopedPeople} {locale === "zh-CN" ? "位关联人物" : "scoped people"}{model.hiddenPeople > 0 ? ` · ${locale === "zh-CN" ? `隐藏 ${model.hiddenPeople}` : `${model.hiddenPeople} hidden`}` : ""}</span>
          <button type="button" onClick={() => setAsTable((value) => !value)} aria-pressed={asTable}>{asTable ? (locale === "zh-CN" ? "显示关系图" : "Show graph") : (locale === "zh-CN" ? "显示关系表" : "Show as table")}</button>
          {!asTable ? <button type="button" onClick={fitView}>{locale === "zh-CN" ? "重置视图" : "Reset view"}</button> : null}
        </div>
      </div>
      {model.effectiveTier !== graphTier ? <p className="relationship-graph-note" role="status">{locale === "zh-CN" ? "当前聚合层级已自动展开焦点人物；图谱层级与地图缩放独立保存。" : "The aggregate view is expanded to the focused person; graph detail and map zoom are saved independently."}</p> : null}
      {from !== undefined || to !== undefined ? <p className="relationship-graph-time-note" role="status">{locale === "zh-CN" ? `时间窗：${from ?? "…"} 至 ${to ?? "…"}；虚线边为窗外关系，点线边为年代未定。` : `Time window: ${from ?? "…"} to ${to ?? "…"}; dashed edges are outside it and dotted edges are undated.`}</p> : null}

      <div className="relationship-graph-content">
      {asTable ? (
        <div className="relationship-graph-table-wrap">
          <table className="relationship-graph-table">
            <caption>{locale === "zh-CN" ? `当前人物关系 · ${model.relationRows.length} 条` : `Current people relations · ${model.relationRows.length}`}</caption>
            <thead><tr><th scope="col">{locale === "zh-CN" ? "人物 A" : "Person A"}</th><th scope="col">{locale === "zh-CN" ? "关系" : "Relation"}</th><th scope="col">{locale === "zh-CN" ? "人物 B" : "Person B"}</th><th scope="col">{locale === "zh-CN" ? "时间／证据" : "Time / evidence"}</th><th scope="col">{locale === "zh-CN" ? "详情" : "Open"}</th></tr></thead>
            <tbody>
              {model.relationRows.map((relation) => {
                const source = contextEndpointKey(relation.source);
                const target = contextEndpointKey(relation.target);
                return <tr key={relation.id}><td><button type="button" onClick={() => onFocus(source)}>{titleForKey(source, searchItems, locale)}</button></td><td><button type="button" onClick={() => onOpenRelation(relation.id)}>{titleForRelation(relation, locale)} <span aria-hidden="true">{relationConnector(relation)}</span></button></td><td><button type="button" onClick={() => onFocus(target)}>{titleForKey(target, searchItems, locale)}</button></td><td>{relationDate(relation) ?? formatEvidence(relation.evidenceLayer, locale)} · {formatConfidence(relation.confidence, locale)}</td><td><button type="button" onClick={() => onOpenRelation(relation.id)}>{locale === "zh-CN" ? "查看" : "Open"}</button></td></tr>;
              })}
            </tbody>
          </table>
          {model.relationRows.length === 0 ? <p className="relationship-graph-empty">{locale === "zh-CN" ? "当前上下文暂时没有可核实的人物—人物关系；地点、事件、文本和后世接受仍可从关联清单进入。" : "No verified figure-to-figure relation is available in this context yet; use the related lists for places, events, texts and later reception."}</p> : null}
        </div>
      ) : (
        <div className="relationship-graph-canvas-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} className="relationship-graph-canvas" role="img" aria-label={canvasLabel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={() => { dragRef.current = null; clickRef.current = null; simulationRef.current?.alphaTarget(0); }} onPointerLeave={() => setHover(null)} onDoubleClick={handleDoubleClick} />
          {hover ? (() => {
            const node = hover.kind === "node" ? nodesRef.current.find((candidate) => candidate.id === hover.id) : undefined;
            const edge = hover.kind === "edge" ? linksRef.current.find((candidate) => candidate.id === hover.id) : undefined;
            return <div className="relationship-graph-tooltip" style={{ left: `${Math.min(Math.max(8, hover.x + 12), Math.max(8, dimensions.width - 230))}px`, top: `${Math.min(Math.max(8, hover.y + 12), Math.max(8, dimensions.height - 104))}px` }} role="status"><strong>{node?.label ?? edge?.label}</strong><span>{node?.sublabel ?? edge?.summary}</span><small>{node ? `${node.degree || node.weight} ${locale === "zh-CN" ? (node.kind === "person" ? "条相连人物关系" : "位人物") : (node.kind === "person" ? "connected people relations" : "people")}` : edge ? `${timeStatusLabel(edge.timeStatus, locale)} · ${edge.relationTypes.join(" / ")}` : ""}</small></div>;
          })() : null}
          <p className="relationship-graph-hint">{locale === "zh-CN" ? "滚轮缩放（相对当前图谱基线）；拖动空白区域平移；拖动节点固定位置，双击节点释放。点击边打开关系详情。" : "Scroll to zoom relative to this graph's baseline; drag the background to pan; drag a node to pin it and double-click to release. Click an edge for relation detail."}</p>
          <nav className="relationship-graph-roster" aria-label={locale === "zh-CN" ? "关系图节点目录" : "Graph node roster"}>
            <p className="eyebrow">{locale === "zh-CN" ? "节点目录（键盘可操作）" : "Node roster (keyboard accessible)"}</p>
            <ul>
              {model.nodes.map((node) => <li key={node.id}><button type="button" className={`graph-node relationship-graph-node node-${node.kind}${node.id === focus ? " is-focused" : ""}`} aria-pressed={node.id === focus} onClick={() => activateNode(node)} onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activateNode(node); } }}><span className="relationship-graph-roster-swatch" style={{ background: TRADITION_COLORS[node.tradition] }} aria-hidden="true" /><span>{node.label}</span><small>{node.outsideTimeRange ? `${locale === "zh-CN" ? "时间窗外 · " : "Outside window · "}` : ""}{node.kind === "person" ? `${node.degree} ${locale === "zh-CN" ? "边" : "edges"}` : `${node.weight} ${locale === "zh-CN" ? "人" : "people"}`}</small></button></li>)}
            </ul>
          </nav>
        </div>
      )}
      <aside className="relationship-graph-inspector" aria-live="polite" aria-label={locale === "zh-CN" ? "关系图检查器" : "Graph inspector"}>
        {selectedEdge ? (
          <>
            <p className="eyebrow">{locale === "zh-CN" ? "关系检查器" : "Relation inspector"}</p>
            <h3>{selectedEdge.label}</h3>
            <p>{selectedEdge.summary}</p>
            <dl>
              <div><dt>{locale === "zh-CN" ? "语义" : "Semantic"}</dt><dd>{relationToneLabel(selectedEdge.tone, locale === "zh-CN" ? "zh-CN" : "en")}</dd></div>
              <div><dt>{locale === "zh-CN" ? "时间" : "Time"}</dt><dd>{timeStatusLabel(selectedEdge.timeStatus, locale)}</dd></div>
              <div><dt>{locale === "zh-CN" ? "证据条目" : "Evidence rows"}</dt><dd>{selectedRelations.length}</dd></div>
            </dl>
            {selectedRelations.slice(0, 3).map((relation) => <button key={relation.id} type="button" className="relationship-graph-inspector-link" onClick={() => onOpenRelation(relation.id)}>{locale === "zh-CN" ? "打开关系详情" : "Open relation detail"} · {formatConfidence(relation.confidence, locale)}</button>)}
          </>
        ) : selectedNode ? (
          <>
            <p className="eyebrow">{locale === "zh-CN" ? "节点检查器" : "Node inspector"}</p>
            <h3>{selectedNode.label}</h3>
            <p>{selectedNode.sublabel}</p>
            <dl>
              <div><dt>{locale === "zh-CN" ? "类型" : "Type"}</dt><dd>{selectedNode.kind === "person" ? (locale === "zh-CN" ? "人物" : "Figure") : selectedNode.kind === "era" ? (locale === "zh-CN" ? "时代聚合" : "Era group") : (locale === "zh-CN" ? "传统聚合" : "Tradition group")}</dd></div>
              <div><dt>{locale === "zh-CN" ? "人物数" : "People"}</dt><dd>{selectedNode.members.length}</dd></div>
              <div><dt>{locale === "zh-CN" ? "关系数" : "Relations"}</dt><dd>{selectedNode.degree}</dd></div>
            </dl>
            {selectedNode.kind !== "person" ? <button type="button" className="relationship-graph-inspector-link" onClick={() => setTier(graphTier === "era" || graphTier === "group" ? "major" : "all")}>{locale === "zh-CN" ? "展开此聚合" : "Expand this aggregate"}</button> : null}
          </>
        ) : (
          <>
            <p className="eyebrow">{locale === "zh-CN" ? "关系图检查器" : "Graph inspector"}</p>
            <h3>{locale === "zh-CN" ? "选择一个节点或关系" : "Select a node or relation"}</h3>
            <p>{locale === "zh-CN" ? "点击节点查看人物或聚合信息；点击边打开可追溯关系详情。" : "Select a node for its figure or aggregate details, or select an edge for traceable relation evidence."}</p>
          </>
        )}
      </aside>
      </div>
      <ul className="relationship-graph-legend" aria-label={locale === "zh-CN" ? "关系语义图例" : "Relation semantics legend"}>
        {(Object.keys(EDGE_COLORS) as RelationshipGraphEdge["tone"][]).map((tone) => <li key={tone}><i style={{ background: EDGE_COLORS[tone] }} />{relationToneLabel(tone, locale)}</li>)}
        <li><i className="is-dashed" />{locale === "zh-CN" ? "窗外／年代未定边" : "Outside-window / undated edge"}</li>
      </ul>
    </section>
  );
}

function titleForRelation(relation: ReadModelRelation, locale: Locale): string {
  return relation.label || formatRelationType(relation.relationType, locale);
}
