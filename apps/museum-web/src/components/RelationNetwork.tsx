import { useMemo, useState } from "react";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import { contextEndpointKey, isPersonToPersonRelation, relationClass, relationConnector, relationNeighbors } from "../data/contextProjection";
import { formatConfidence, formatEvidence, formatRelationType } from "../data/labels";
import type { ZoomLevel } from "../routing";
import type { Locale, SearchItem } from "../types";

interface RelationNetworkProps {
  locale: Locale;
  focus: string;
  relations?: ReadModelRelationIndex;
  searchItems: SearchItem[];
  onFocus: (key: string) => void;
  compact?: boolean;
  peopleOnly?: boolean;
  scopeKeys?: string[];
  zoomLevel?: ZoomLevel;
}

function titleFor(key: string, searchItems: SearchItem[], locale: Locale): string {
  const item = searchItems.find((candidate) => candidate.kind + ":" + candidate.slug === key);
  if (item) return item.title;
  return key.split(":").slice(1).join(":").replaceAll("-", " ") || (locale === "zh-CN" ? "未命名对象" : "Unnamed object");
}

function shortLabel(value: string): string {
  return value.length > 11 ? value.slice(0, 10) + "…" : value;
}

export function RelationNetwork({ locale, focus, relations, searchItems, onFocus, compact = false, peopleOnly = false, scopeKeys, zoomLevel = "figure" }: RelationNetworkProps) {
  const [presentation, setPresentation] = useState<"map" | "list">("map");
  const neighbourLimit = zoomLevel === "era" ? 4 : zoomLevel === "region" ? 8 : zoomLevel === "figure" ? (compact ? 8 : 16) : 32;
  const neighbours = useMemo(() => {
    const seen = new Set<string>();
    return relationNeighbors(relations, focus).filter((relation) => {
      if (peopleOnly && !isPersonToPersonRelation(relation)) return false;
      const other = contextEndpointKey(relation.source) === focus
        ? contextEndpointKey(relation.target)
        : contextEndpointKey(relation.source);
      if (seen.has(other)) return false;
      seen.add(other);
      return true;
    }).slice(0, neighbourLimit);
  }, [focus, neighbourLimit, peopleOnly, relations]);
  const title = titleFor(focus, searchItems, locale);
  const networkTitleId = "relation-network-title-" + focus.replace(/[^a-z0-9]+/gi, "-");
  const scopeRelationItems = useMemo(() => {
    if (!scopeKeys) return [];
    const scope = new Set(scopeKeys);
    return (relations?.items ?? []).filter((relation) => {
      if (!isPersonToPersonRelation(relation)) return false;
      const source = contextEndpointKey(relation.source);
      const target = contextEndpointKey(relation.target);
      return scope.has(source) && scope.has(target);
    });
  }, [relations, scopeKeys]);
  const scopeNodeKeys = useMemo(() => {
    if (!scopeKeys) return [];
    const nodes = new Set<string>();
    for (const relation of scopeRelationItems) {
      nodes.add(contextEndpointKey(relation.source));
      nodes.add(contextEndpointKey(relation.target));
    }
    return [...nodes];
  }, [scopeKeys, scopeRelationItems]);
  const visibleScopeRelations = useMemo(() => scopeRelationItems.slice(0, neighbourLimit), [neighbourLimit, scopeRelationItems]);
  const scopePositions = useMemo(() => {
    const center = { x: 360, y: compact ? 140 : 190 };
    const radius = compact ? 104 : 145;
    return new Map(scopeNodeKeys.map((key, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, scopeNodeKeys.length)) * Math.PI * 2;
      return [key, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }];
    }));
  }, [compact, scopeNodeKeys]);
  const center = { x: 360, y: compact ? 135 : 190 };
  const radius = compact ? 92 : 145;
  const positions = useMemo(() => new Map(neighbours.map((relation, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, neighbours.length)) * Math.PI * 2;
    const other = contextEndpointKey(relation.source) === focus
      ? contextEndpointKey(relation.target)
      : contextEndpointKey(relation.source);
    return [other, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }];
  })), [center.x, center.y, focus, neighbours, radius]);

  if (scopeKeys) {
    if (scopeRelationItems.length === 0) {
      return (
        <div className="relation-network relation-network-empty-state" data-person-relations={peopleOnly ? "true" : undefined} data-relation-scope="true">
          <div className="relation-network-heading">
            <div>
              <p className="eyebrow">{locale === "zh-CN" ? "人物关系" : "Person-to-person"}</p>
              <h3>{title} · {locale === "zh-CN" ? "人物—人物关系" : "figure-to-figure relations"}</h3>
            </div>
            <span>0 {locale === "zh-CN" ? "条关系" : "relations"}</span>
          </div>
          <p className="relation-network-empty">
            {locale === "zh-CN" ? "当前城市人物之间还没有可核实的人物—人物关系；地点、事件、文本与其他接受层另列。" : "No verified figure-to-figure relation is available among this city's figures yet; places, events, texts and other reception layers remain separate."}
          </p>
        </div>
      );
    }

    return (
      <div className={"relation-network " + (compact ? "is-compact" : "")} data-person-relations={peopleOnly ? "true" : undefined} data-relation-scope="true">
        <div className="relation-network-heading">
          <div>
            <p className="eyebrow">{locale === "zh-CN" ? "人物关系" : "Person-to-person"}</p>
            <h3>{title} · {locale === "zh-CN" ? "人物—人物关系" : "figure-to-figure relations"}</h3>
          </div>
          <span>{scopeNodeKeys.length} {locale === "zh-CN" ? "位人物" : "figures"} · {scopeRelationItems.length} {locale === "zh-CN" ? "条关系" : "relations"}</span>
        </div>
        <div className="relation-network-controls" role="group" aria-label={locale === "zh-CN" ? "关系图呈现方式" : "Relationship presentation"}>
          <span>{locale === "zh-CN" ? "展开层级" : "Detail"}: {zoomLevel}</span>
          <button type="button" className={presentation === "map" ? "active" : ""} aria-pressed={presentation === "map"} onClick={() => setPresentation("map")}>{locale === "zh-CN" ? "图" : "Graph"}</button>
          <button type="button" className={presentation === "list" ? "active" : ""} aria-pressed={presentation === "list"} onClick={() => setPresentation("list")}>{locale === "zh-CN" ? "列表" : "List"}</button>
        </div>
        <p className="relation-network-note">{locale === "zh-CN" ? "只显示当前地点人物之间可核实的同时代往来、思想影响或后世接受；图例会把这些语义分开。点击节点或下方关系，可继续进入人物语境。" : "Only verified contemporaneity, intellectual influence or later-reception relations among this place's figures are shown; the legend keeps those meanings distinct. Click a node or relation to continue into a figure context."}</p>
        {presentation === "map" ? <svg className="relation-network-canvas" viewBox={"0 0 720 " + (compact ? 300 : 390)} role="group" aria-labelledby={networkTitleId}>
          <title id={networkTitleId}>{title + (locale === "zh-CN" ? " 人物关系图" : " person relation network")}</title>
          {visibleScopeRelations.map((relation) => {
            const source = scopePositions.get(contextEndpointKey(relation.source));
            const target = scopePositions.get(contextEndpointKey(relation.target));
            if (!source || !target) return null;
            return <line key={relation.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="relation-network-edge"><title>{relation.label}</title></line>;
          })}
          {scopeNodeKeys.map((nodeKey) => {
            const position = scopePositions.get(nodeKey);
            if (!position) return null;
            return (
              <g
                key={nodeKey}
                className="relation-network-node relation-kind-figure"
                transform={"translate(" + position.x + " " + position.y + ")"}
                role="button"
                tabIndex={0}
                aria-label={(locale === "zh-CN" ? "聚焦 " : "Focus ") + titleFor(nodeKey, searchItems, locale)}
                onClick={() => onFocus(nodeKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onFocus(nodeKey);
                  }
                }}
              >
                <circle r={compact ? 30 : 32} />
                <text y="4" textAnchor="middle">{shortLabel(titleFor(nodeKey, searchItems, locale))}</text>
              </g>
            );
          })}
        </svg> : null}
        <ul className="relation-network-list">
          {scopeRelationItems.map((relation) => {
            const source = contextEndpointKey(relation.source);
            const target = contextEndpointKey(relation.target);
            const date = relation.temporalAssertions.map((assertion) => assertion.displayDate).join(" · ");
            return (
              <li key={relation.id}>
                <button type="button" onClick={() => onFocus(source)}>{titleFor(source, searchItems, locale)} <span aria-hidden="true">{relationConnector(relation)}</span> {titleFor(target, searchItems, locale)}</button>
                <span>{relation.label}</span>
                <small>{date || formatEvidence(relation.evidenceLayer, locale)} · {formatConfidence(relation.confidence, locale)} · {formatRelationType(relation.relationType, locale)}</small>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (neighbours.length === 0) {
    return (
      <div className="relation-network relation-network-empty-state" data-person-relations={peopleOnly ? "true" : undefined}>
        <p className="relation-network-empty">
          {peopleOnly
            ? (locale === "zh-CN" ? "当前没有可核实的人物—人物关系；地点、事件、文本与其他接受层另列。" : "No verified figure-to-figure relation is available here yet; places, events, texts and other reception layers remain separate context layers.")
            : (locale === "zh-CN" ? "当前对象暂时没有可展开的一跳关系。" : "No one-hop relations are available for this object yet.")}
        </p>
      </div>
    );
  }

  return (
    <div className={"relation-network " + (compact ? "is-compact" : "")} data-person-relations={peopleOnly ? "true" : undefined}>
      <div className="relation-network-heading">
        <div>
          <p className="eyebrow">{peopleOnly ? (locale === "zh-CN" ? "人物关系" : "Person-to-person") : (locale === "zh-CN" ? "一层关系网" : "One-hop network")}</p>
          <h3>{peopleOnly ? (locale === "zh-CN" ? title + " 的人物—人物关系" : title + " · figure-to-figure relations") : (locale === "zh-CN" ? title + " 的关系" : title + " · relationships")}</h3>
        </div>
        <span>{neighbours.length} {locale === "zh-CN" ? "个邻接对象" : "neighbours"}</span>
      </div>
      <div className="relation-network-controls" role="group" aria-label={locale === "zh-CN" ? "关系图呈现方式" : "Relationship presentation"}>
        <span>{locale === "zh-CN" ? "展开层级" : "Detail"}: {zoomLevel}</span>
        <button type="button" className={presentation === "map" ? "active" : ""} aria-pressed={presentation === "map"} onClick={() => setPresentation("map")}>{locale === "zh-CN" ? "图" : "Graph"}</button>
        <button type="button" className={presentation === "list" ? "active" : ""} aria-pressed={presentation === "list"} onClick={() => setPresentation("list")}>{locale === "zh-CN" ? "列表" : "List"}</button>
      </div>
      {peopleOnly ? <p className="relation-network-note">{locale === "zh-CN" ? "只显示人物之间可核实的同时代往来、思想影响或后世接受；地点、事件与文本关系另列，后世接受不表示同时代会面。" : "Only verified contemporaneity, intellectual influence or later-reception relations between figures are shown here; places, events and text relations stay separate, and later reception does not imply contemporaneous contact."}</p> : null}
      {presentation === "map" ? <svg className="relation-network-canvas" viewBox={"0 0 720 " + (compact ? 280 : 390)} role="group" aria-labelledby={networkTitleId}>
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
      </svg> : null}
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
            <small>{date || formatEvidence(relation.evidenceLayer, locale)} · {formatConfidence(relation.confidence, locale)} · {formatRelationType(relation.relationType, locale)}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
