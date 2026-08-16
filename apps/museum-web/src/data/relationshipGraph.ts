import type { ReadModelRelation } from "@drf-museum/domain-schema";
import { contextEndpointKey, isPersonToPersonRelation } from "./contextProjection";
import type { SearchItem, Tradition } from "../types";

export type RelationshipGraphTier = "era" | "group" | "major" | "all";
export type RelationshipGraphNodeKind = "era" | "group" | "person";
export type RelationshipGraphTone = "influence" | "contemporary" | "reception" | "comparison" | "other";
export type RelationshipGraphTimeStatus = "overlap" | "outside" | "undated";

export interface RelationshipGraphNode {
  id: string;
  kind: RelationshipGraphNodeKind;
  slug: string;
  label: string;
  sublabel: string;
  tradition: Tradition | "convergence";
  members: string[];
  weight: number;
  degree: number;
  importance: number;
  x: number;
  y: number;
  outsideTimeRange: boolean;
}

export interface RelationshipGraphEdge {
  id: string;
  source: string;
  target: string;
  relationIds: string[];
  relationTypes: string[];
  relationType: string;
  label: string;
  summary: string;
  tone: RelationshipGraphTone;
  directed: boolean;
  timeStatus: RelationshipGraphTimeStatus;
}

export interface RelationshipGraphModel {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
  relationRows: ReadModelRelation[];
  hiddenPeople: number;
  scopedPeople: number;
  effectiveTier: RelationshipGraphTier;
}

const ERA_BUCKETS = [
  { id: "origins", zh: "神话与先秦", en: "Origins / Pre-Qin", from: Number.NEGATIVE_INFINITY, to: -221 },
  { id: "qin-han", zh: "秦汉", en: "Qin–Han", from: -221, to: 220 },
  { id: "wei-jin", zh: "魏晋南北朝", en: "Wei–Jin", from: 220, to: 581 },
  { id: "sui-tang", zh: "隋唐", en: "Sui–Tang", from: 581, to: 907 },
  { id: "song-yuan", zh: "宋元", en: "Song–Yuan", from: 907, to: 1368 },
  { id: "ming-qing", zh: "明清", en: "Ming–Qing", from: 1368, to: 1911 },
  { id: "modern", zh: "近现代", en: "Modern", from: 1911, to: Number.POSITIVE_INFINITY },
] as const;

const TRADITION_LABELS: Record<Tradition | "convergence", { zh: string; en: string }> = {
  daoism: { zh: "道家", en: "Daoist" },
  confucianism: { zh: "儒家", en: "Confucian" },
  buddhism: { zh: "佛教", en: "Buddhist" },
  convergence: { zh: "交汇", en: "Convergence" },
};

function endpointIsFigure(relation: ReadModelRelation, key: string): boolean {
  return (contextEndpointKey(relation.source) === key && relation.source.kind === "figure")
    || (contextEndpointKey(relation.target) === key && relation.target.kind === "figure");
}

function relationTone(relationType: string): RelationshipGraphTone {
  if (relationType === "influenced") return "influence";
  if (relationType === "received_by") return "reception";
  if (relationType === "contemporary_with") return "contemporary";
  if (["deified_as", "remembered_in"].includes(relationType)) return "reception";
  if (relationType === "comparative_parallel") return "comparison";
  return "other";
}

function isDirected(relationType: string): boolean {
  return !["contemporary_with", "comparative_parallel"].includes(relationType);
}

function eraForYear(year: number | undefined): (typeof ERA_BUCKETS)[number] | undefined {
  if (year === undefined) return undefined;
  return ERA_BUCKETS.find((bucket) => year >= bucket.from && year < bucket.to);
}

function yearForFigure(key: string, relations: ReadModelRelation[], searchMap: Map<string, SearchItem>): number | undefined {
  const indexedYear = searchMap.get(key)?.timeRange?.startYear;
  if (indexedYear !== undefined) return indexedYear;
  const years = relations
    .filter((relation) => endpointIsFigure(relation, key))
    .flatMap((relation) => relation.temporalAssertions.map((assertion) => assertion.startYear))
    .filter((year): year is number => year !== undefined);
  if (years.length === 0) return undefined;
  return Math.min(...years);
}

function titleForKey(key: string, searchItems: SearchItem[]): string {
  const item = searchItems.find((candidate) => contextEndpointKey(candidate) === key);
  return item?.title ?? key.split(":").slice(1).join(":").replaceAll("-", " ");
}

function traditionForKey(key: string, searchMap: Map<string, SearchItem>): Tradition | "convergence" {
  return searchMap.get(key)?.tradition ?? "convergence";
}

function edgeKey(source: string, target: string, relationType: string): string {
  if (isDirected(relationType)) return `${source}|${target}|${relationType}`;
  const ordered = [source, target].sort();
  return `${ordered[0]}|${ordered[1]}|${relationType}`;
}

function relationTimeStatus(relation: ReadModelRelation, from?: number, to?: number): RelationshipGraphTimeStatus {
  if (relation.temporalAssertions.length === 0) return "undated";
  if (from === undefined && to === undefined) return "overlap";
  const windowStart = from ?? Number.NEGATIVE_INFINITY;
  const windowEnd = to ?? Number.POSITIVE_INFINITY;
  return relation.temporalAssertions.some((assertion) => {
    if (assertion.startYear === undefined) return false;
    const assertionEnd = assertion.endYear ?? assertion.startYear;
    return assertionEnd >= windowStart && assertion.startYear <= windowEnd;
  }) ? "overlap" : "outside";
}

function mergeTimeStatus(statuses: RelationshipGraphTimeStatus[]): RelationshipGraphTimeStatus {
  if (statuses.includes("overlap")) return "overlap";
  if (statuses.includes("undated")) return "undated";
  return "outside";
}

function aggregateEdges(
  relations: ReadModelRelation[],
  nodeMap: Map<string, string>,
  from?: number,
  to?: number,
): RelationshipGraphEdge[] {
  const buckets = new Map<string, { source: string; target: string; relations: ReadModelRelation[] }>();
  for (const relation of relations) {
    const source = nodeMap.get(contextEndpointKey(relation.source));
    const target = nodeMap.get(contextEndpointKey(relation.target));
    if (!source || !target || source === target) continue;
    const key = edgeKey(source, target, relation.relationType);
    const existing = buckets.get(key);
    if (existing) existing.relations.push(relation);
    else buckets.set(key, { source, target, relations: [relation] });
  }
  return [...buckets.entries()].map(([id, bucket]) => {
    const first = bucket.relations[0]!;
    const labels = [...new Set(bucket.relations.map((relation) => relation.label))];
    const relationTypes = [...new Set(bucket.relations.map((relation) => relation.relationType))];
    return {
      id,
      source: bucket.source,
      target: bucket.target,
      relationIds: bucket.relations.map((relation) => relation.id),
      relationTypes,
      relationType: first.relationType,
      label: labels.length > 1 ? labels.join(" · ") : labels[0] ?? first.relationType,
      summary: first.summary,
      tone: relationTone(first.relationType),
      directed: isDirected(first.relationType),
      timeStatus: mergeTimeStatus(bucket.relations.map((relation) => relationTimeStatus(relation, from, to))),
    } satisfies RelationshipGraphEdge;
  });
}

function deterministicPosition(index: number, count: number, width = 900, height = 470): { x: number; y: number } {
  const angle = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
  const radiusX = Math.min(360, 100 + count * 4.5);
  const radiusY = Math.min(180, 70 + count * 2.5);
  return { x: width / 2 + Math.cos(angle) * radiusX, y: height / 2 + Math.sin(angle) * radiusY };
}

/**
 * Build the graph from the same read-model edges that drive the map and
 * relation list. The graph deliberately keeps figure↔figure edges separate
 * from figure↔place/event edges: context can limit the people shown, but a
 * location edge is never silently presented as a personal interaction.
 */
export function buildRelationshipGraph({
  relations,
  scopeRelations,
  searchItems,
  focus,
  traditions,
  tier,
  locale,
  from,
  to,
}: {
  relations: ReadModelRelation[];
  scopeRelations: ReadModelRelation[];
  searchItems: SearchItem[];
  focus?: string;
  traditions: Tradition[];
  tier: RelationshipGraphTier;
  locale: "zh-CN" | "en";
  from?: number;
  to?: number;
}): RelationshipGraphModel {
  const searchMap = new Map(searchItems.map((item) => [contextEndpointKey(item), item]));
  const figureItems = searchItems.filter((item) => item.kind === "figure" && (item.tradition === "convergence" || traditions.includes(item.tradition)));
  const figureKeys = new Set(figureItems.map((item) => contextEndpointKey(item)));
  const scopedKeys = new Set<string>();
  for (const relation of scopeRelations) {
    if (relation.source.kind === "figure") scopedKeys.add(contextEndpointKey(relation.source));
    if (relation.target.kind === "figure") scopedKeys.add(contextEndpointKey(relation.target));
  }
  if (focus?.startsWith("figure:")) scopedKeys.add(focus);
  const visibleFigureKeys = focus ? new Set([...scopedKeys].filter((key) => figureKeys.has(key))) : figureKeys;
  const figureRelations = relations.filter((relation) => {
    if (!isPersonToPersonRelation(relation)) return false;
    const source = contextEndpointKey(relation.source);
    const target = contextEndpointKey(relation.target);
    return visibleFigureKeys.has(source) && visibleFigureKeys.has(target);
  });
  const degree = new Map<string, number>();
  for (const relation of figureRelations) {
    const source = contextEndpointKey(relation.source);
    const target = contextEndpointKey(relation.target);
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  }

  const groupingKey = (key: string, candidateTier: RelationshipGraphTier): string => {
    if (candidateTier === "group") return `group:${searchMap.get(key)?.tradition ?? "convergence"}`;
    return `era:${eraForYear(yearForFigure(key, relations, searchMap))?.id ?? "undated"}`;
  };
  const effectiveTier: RelationshipGraphTier = focus?.startsWith("figure:") && visibleFigureKeys.has(focus) && (tier === "group" || tier === "era")
    ? "major"
    : tier;

  let selectedPeople = [...visibleFigureKeys].sort((left, right) =>
    titleForKey(left, searchItems).localeCompare(titleForKey(right, searchItems), locale === "zh-CN" ? "zh-Hans" : "en")
      || left.localeCompare(right),
  );
  const hiddenPeople = effectiveTier === "major" ? Math.max(0, selectedPeople.length - 24) : 0;
  if (effectiveTier === "major") {
    selectedPeople = selectedPeople
      .sort((left, right) => {
        const focusWeight = (key: string) => key === focus ? 1000 : 0;
        return focusWeight(right) + (degree.get(right) ?? 0) * 10 - focusWeight(left) - (degree.get(left) ?? 0) * 10
          || titleForKey(left, searchItems).localeCompare(titleForKey(right, searchItems), locale === "zh-CN" ? "zh-Hans" : "en");
      })
      .slice(0, 24);
  }
  const selectedSet = new Set(selectedPeople);
  const relationRows = figureRelations.filter((relation) => selectedSet.has(contextEndpointKey(relation.source)) && selectedSet.has(contextEndpointKey(relation.target)));
  const nodeMap = new Map<string, string>();
  const nodes: RelationshipGraphNode[] = [];

  if (effectiveTier === "all" || effectiveTier === "major") {
    selectedPeople.forEach((key, index) => {
      const item = searchMap.get(key);
      const tradition = item?.tradition ?? "convergence";
      const position = deterministicPosition(index, selectedPeople.length);
      nodeMap.set(key, key);
      nodes.push({
        id: key,
        kind: "person",
        slug: key.split(":").slice(1).join(":"),
        label: item?.title ?? titleForKey(key, searchItems),
        sublabel: item?.context ?? "",
        tradition,
        members: [key],
        weight: 1,
        degree: degree.get(key) ?? 0,
        importance: (degree.get(key) ?? 0) + (key === focus ? 10 : 0),
        outsideTimeRange: Boolean((from !== undefined || to !== undefined) && item?.timeRange && (
          (item.timeRange.endYear ?? item.timeRange.startYear) < (from ?? Number.NEGATIVE_INFINITY)
          || item.timeRange.startYear > (to ?? Number.POSITIVE_INFINITY)
        )),
        ...position,
      });
    });
  } else {
    const groups = new Map<string, string[]>();
    for (const key of selectedPeople) {
      const groupId = groupingKey(key, effectiveTier);
      const members = groups.get(groupId) ?? [];
      members.push(key);
      groups.set(groupId, members);
    }
    [...groups.entries()].forEach(([groupId, members], index) => {
      const isEra = effectiveTier === "era";
      const traditionCounts = new Map<Tradition | "convergence", number>();
      for (const key of members) {
        const tradition = traditionForKey(key, searchMap);
        traditionCounts.set(tradition, (traditionCounts.get(tradition) ?? 0) + 1);
      }
      const tradition = [...traditionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "convergence";
      const era = isEra ? ERA_BUCKETS.find((bucket) => groupId === `era:${bucket.id}`) : undefined;
      const groupLabel = isEra
        ? (locale === "zh-CN" ? era?.zh : era?.en) ?? (locale === "zh-CN" ? "年代未定" : "Undated")
        : TRADITION_LABELS[tradition][locale === "zh-CN" ? "zh" : "en"];
      const position = deterministicPosition(index, groups.size, 900, 470);
      for (const member of members) nodeMap.set(member, groupId);
      nodes.push({
        id: groupId,
        kind: isEra ? "era" : "group",
        slug: groupId.split(":")[1] ?? groupId,
        label: groupLabel,
        sublabel: locale === "zh-CN" ? `${members.length} 位人物` : `${members.length} people`,
        tradition,
        members,
        weight: members.length,
        degree: members.reduce((sum, key) => sum + (degree.get(key) ?? 0), 0),
        importance: members.length,
        outsideTimeRange: members.every((key) => {
          const timeRange = searchMap.get(key)?.timeRange;
          return Boolean((from !== undefined || to !== undefined) && timeRange && (
            (timeRange.endYear ?? timeRange.startYear) < (from ?? Number.NEGATIVE_INFINITY)
            || timeRange.startYear > (to ?? Number.POSITIVE_INFINITY)
          ));
        }),
        ...position,
      });
    });
  }

  const edges = aggregateEdges(relationRows, nodeMap, from, to);
  return { nodes, edges, relationRows, hiddenPeople, scopedPeople: visibleFigureKeys.size, effectiveTier };
}

export function graphTierForZoomLevel(zoomLevel: "era" | "region" | "figure" | "all"): RelationshipGraphTier {
  if (zoomLevel === "region") return "group";
  if (zoomLevel === "figure") return "major";
  return zoomLevel;
}

export function zoomLevelForGraphTier(tier: RelationshipGraphTier): "era" | "region" | "figure" | "all" {
  if (tier === "group") return "region";
  if (tier === "major") return "figure";
  return tier;
}

export function relationToneLabel(tone: RelationshipGraphTone, locale: "zh-CN" | "en"): string {
  const labels: Record<RelationshipGraphTone, { zh: string; en: string }> = {
    influence: { zh: "思想影响", en: "Intellectual influence" },
    contemporary: { zh: "同时代语境", en: "Contemporary context" },
    reception: { zh: "后世接受", en: "Later reception" },
    comparison: { zh: "比较并置", en: "Comparison" },
    other: { zh: "其他人物关系", en: "Other person relation" },
  };
  return labels[tone][locale === "zh-CN" ? "zh" : "en"];
}
