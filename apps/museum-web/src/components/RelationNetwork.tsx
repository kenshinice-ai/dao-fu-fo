import { useMemo } from "react";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import { contextEndpointKey, relationClass, relationNeighbors } from "../data/contextProjection";
import type { Locale, SearchItem } from "../types";

interface RelationNetworkProps {
  locale: Locale;
  focus: string;
  relations?: ReadModelRelationIndex;
  searchItems: SearchItem[];
  onFocus: (key: string) => void;
  compact?: boolean;
}

function titleFor(key: string, searchItems: SearchItem[], locale: Locale): string {
  const item = searchItems.find((candidate) => candidate.kind + ":" + candidate.slug === key);
  if (item) return item.title;
  return key.split(":").slice(1).join(":").replaceAll("-", " ") || (locale === "zh-CN" ? "未命名对象" : "Unnamed object");
}

function shortLabel(value: string): string {
  return value.length > 11 ? value.slice(0, 10) + "…" : value;
}

export function RelationNetwork({ locale, focus, relations, searchItems, onFocus, compact = false }: RelationNetworkProps) {
  const neighbours = useMemo(() => {
    const seen = new Set<string>();
    return relationNeighbors(relations, focus).filter((relation) => {
      const other = contextEndpointKey(relation.source) === focus
        ? contextEndpointKey(relation.target)
        : contextEndpointKey(relation.source);
      if (seen.has(other)) return false;
      seen.add(other);
      return true;
    }).slice(0, compact ? 8 : 16);
  }, [compact, focus, relations]);
  const title = titleFor(focus, searchItems, locale);
  const networkTitleId = "relation-network-title-" + focus.replace(/[^a-z0-9]+/gi, "-");
  const center = { x: 360, y: compact ? 135 : 190 };
  const radius = compact ? 92 : 145;
  const positions = useMemo(() => new Map(neighbours.map((relation, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, neighbours.length)) * Math.PI * 2;
    const other = contextEndpointKey(relation.source) === focus
      ? contextEndpointKey(relation.target)
      : contextEndpointKey(relation.source);
    return [other, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }];
  })), [center.x, center.y, focus, neighbours, radius]);

  if (neighbours.length === 0) {
    return <p className="relation-network-empty">{locale === "zh-CN" ? "当前对象暂时没有可展开的一跳关系。" : "No one-hop relations are available for this object yet."}</p>;
  }

  return (
    <div className={"relation-network " + (compact ? "is-compact" : "")}>
      <div className="relation-network-heading">
        <div>
          <p className="eyebrow">{locale === "zh-CN" ? "一层关系网" : "One-hop network"}</p>
          <h3>{locale === "zh-CN" ? title + " 的关系" : title + " · relationships"}</h3>
        </div>
        <span>{neighbours.length} {locale === "zh-CN" ? "个邻接对象" : "neighbours"}</span>
      </div>
      <svg className="relation-network-canvas" viewBox={"0 0 720 " + (compact ? 280 : 390)} role="group" aria-labelledby={networkTitleId}>
        <title id={networkTitleId}>{locale === "zh-CN" ? title + " 一层关系图" : title + " one-hop relationship network"}</title>
        {neighbours.map((relation) => {
          const other = contextEndpointKey(relation.source) === focus
            ? contextEndpointKey(relation.target)
            : contextEndpointKey(relation.source);
          const position = positions.get(other);
          if (!position) return null;
          return <line key={relation.id} x1={center.x} y1={center.y} x2={position.x} y2={position.y} className={"relation-network-edge relation-" + relationClass(relation)}><title>{relation.label}</title></line>;
        })}
        <g className="relation-network-focus-node">
          <circle cx={center.x} cy={center.y} r={compact ? 35 : 46} />
          <text x={center.x} y={center.y + 5} textAnchor="middle">{shortLabel(title)}</text>
        </g>
        {neighbours.map((relation) => {
          const other = contextEndpointKey(relation.source) === focus
            ? contextEndpointKey(relation.target)
            : contextEndpointKey(relation.source);
          const position = positions.get(other);
          if (!position) return null;
          const otherItem = searchItems.find((item) => item.kind + ":" + item.slug === other);
          return (
            <g
              key={other + "-node"}
              className={"relation-network-node relation-kind-" + (otherItem?.kind ?? "context")}
              transform={"translate(" + position.x + " " + position.y + ")"}
              role="button"
              tabIndex={0}
              aria-label={(locale === "zh-CN" ? "聚焦 " : "Focus ") + titleFor(other, searchItems, locale)}
              onClick={() => onFocus(other)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocus(other);
                }
              }}
            >
              <circle r={compact ? 25 : 32} />
              <text y="4" textAnchor="middle">{shortLabel(titleFor(other, searchItems, locale))}</text>
            </g>
          );
        })}
      </svg>
      <ul className="relation-network-list">
        {neighbours.map((relation) => {
          const other = contextEndpointKey(relation.source) === focus
            ? contextEndpointKey(relation.target)
            : contextEndpointKey(relation.source);
          const date = relation.temporalAssertions.map((assertion) => assertion.displayDate).join(" · ");
          return (
            <li key={relation.id}>
              <button type="button" onClick={() => onFocus(other)}>{titleFor(other, searchItems, locale)}</button>
              <span>{relation.label}</span>
              <small>{date || relation.evidenceLayer} · {relation.confidence}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
