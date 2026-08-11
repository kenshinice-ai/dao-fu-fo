import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { formatConfidence, formatEntityKind, formatEvidence, formatRelationType } from "../data/labels";
import { entityPath, withLang } from "../routing";

const DEFAULT_COMPARISON = "cross-era-figures";

export function ComparePage() {
  const { locale } = useMuseumContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const comparisonSlug = searchParams.get("set") || DEFAULT_COMPARISON;
  const loader = useCallback((signal: AbortSignal) => staticData.comparison(comparisonSlug, locale, signal), [comparisonSlug, locale]);
  const { data, error } = useStaticData(loader);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  const requestedKeys = (searchParams.get("entities") ?? "").split(",").filter((key) => data.entities.some((entity) => entity.key === key));
  const selectedKeys = requestedKeys.length >= 2 ? requestedKeys : data.entities.map((entity) => entity.key);
  const selectedEntities = data.entities.filter((entity) => selectedKeys.includes(entity.key));
  const selectedKeySet = new Set(selectedKeys);

  const toggleEntity = (key: string) => {
    const next = selectedKeySet.has(key)
      ? selectedKeys.filter((candidate) => candidate !== key)
      : [...selectedKeys, key];
    if (next.length < 2) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("set", comparisonSlug);
    nextParams.set("entities", next.join(","));
    setSearchParams(nextParams);
  };

  return (
    <article className="comparison-page">
      <header className="comparison-hero page-shell">
        <div>
          <p className="eyebrow">Compare / {locale === "zh-CN" ? "实体比较" : "Entity comparison"}</p>
          <h1>{data.title}</h1>
          <p className="comparison-question">{data.question}</p>
          <p className="comparison-disclaimer">{data.disclaimer}</p>
        </div>
        <div className="comparison-selector" role="group" aria-label={locale === "zh-CN" ? "选择比较对象" : "Choose comparison objects"}>
          <p className="eyebrow">{locale === "zh-CN" ? "比较对象" : "Compare"}</p>
          {data.entities.map((entity) => (
            <button
              className={`comparison-selector-button ${selectedKeySet.has(entity.key) ? "active" : ""}`}
              type="button"
              key={entity.key}
              aria-pressed={selectedKeySet.has(entity.key)}
              onClick={() => toggleEntity(entity.key)}
            >
              <span>{entity.title}</span>
              <small>{formatEntityKind(entity.kind, locale)}</small>
            </button>
          ))}
          <small className="comparison-selector-note">
            {locale === "zh-CN" ? "至少保留两个对象；选择会写入 URL，方便复盘。" : "Keep at least two objects; the selection is encoded in the URL for review."}
          </small>
        </div>
      </header>

      <section className="comparison-entities page-shell" aria-labelledby="comparison-entities-title">
        <div className="comparison-section-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "先看对象" : "The objects"}</p>
          <h2 id="comparison-entities-title">{locale === "zh-CN" ? "同一比较框架中的不同人物" : "Different figures in one comparison frame"}</h2>
        </div>
        <div className="comparison-entity-grid">
          {selectedEntities.map((entity) => (
            <article className="comparison-entity-card" key={entity.key}>
              <div className="comparison-entity-card-topline">
                <span>{entity.tradition}</span>
                <span>{formatEvidence(entity.evidence, locale)}</span>
              </div>
              <h3><Link to={entityPath(entity.kind, entity.slug, locale)}>{entity.title}</Link></h3>
              <p>{entity.summary}</p>
              <dl>
                <div><dt>{locale === "zh-CN" ? "时间" : "Time"}</dt><dd>{entity.timeLabel}</dd></div>
                <div><dt>{locale === "zh-CN" ? "来源" : "Sources"}</dt><dd>{entity.sourceIds.length}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="comparison-matrix page-shell" aria-labelledby="comparison-matrix-title">
        <div className="comparison-section-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "九个维度" : "Nine dimensions"}</p>
          <h2 id="comparison-matrix-title">{locale === "zh-CN" ? "人物、空间、时间、言说与后世影响" : "Figures, space, time, speech and later impact"}</h2>
          <p>{locale === "zh-CN" ? "每个维度都来自 compiler 的实体、关系和来源模型；“未记录”不会被渲染成否定事实。" : "Each dimension comes from the compiler's entity, relation and source model; “not recorded” is not rendered as a negative fact."}</p>
        </div>
        <div className="comparison-axis-list">
          {data.axes.map((axis) => {
            const cells = axis.cells.filter((cell) => selectedKeySet.has(cell.entityKey));
            return (
              <section className="comparison-axis" key={axis.id} aria-labelledby={`comparison-axis-${axis.id}`}>
                <div className="comparison-axis-heading">
                  <div>
                    <p className="eyebrow">{axis.id}</p>
                    <h3 id={`comparison-axis-${axis.id}`}>{axis.label}</h3>
                  </div>
                  <p>{axis.description}</p>
                </div>
                <div className="comparison-axis-grid">
                  {cells.map((cell) => {
                    const entity = data.entities.find((candidate) => candidate.key === cell.entityKey);
                    if (!entity) return null;
                    return (
                      <article className={`comparison-cell status-${cell.status}`} key={cell.entityKey}>
                        <h4><Link to={entityPath(entity.kind, entity.slug, locale)}>{entity.title}</Link></h4>
                        <strong>{cell.value}</strong>
                        {cell.details.length > 0 ? <ul>{cell.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
                        <div className="comparison-cell-meta">
                          <span>{cell.status === "not_recorded" ? (locale === "zh-CN" ? "未在当前模型记录" : "Not recorded in this model") : formatEvidence(cell.evidenceLayer, locale)}</span>
                          {cell.confidence ? <span>{formatConfidence(cell.confidence, locale)}</span> : null}
                        </div>
                        {cell.sourceIds.length > 0 ? (
                          <div className="comparison-cell-sources">
                            {cell.sourceIds.map((sourceId) => <Link key={sourceId} to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="comparison-connections page-shell" aria-labelledby="comparison-connections-title">
        <div className="comparison-section-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "关系闭环" : "Relation closure"}</p>
          <h2 id="comparison-connections-title">{locale === "zh-CN" ? "直接关系与共同桥接节点" : "Direct relations and shared bridge nodes"}</h2>
          <p>{locale === "zh-CN" ? "这里显示人物之间的直接关系，以及至少连接两位比较对象的外部节点。" : "This shows direct relations between the figures and external nodes connected to at least two selected objects."}</p>
        </div>
        {data.directRelations.length > 0 ? (
          <ul className="comparison-connection-list">
            {data.directRelations.map((relation) => <li key={relation.id}><strong>{relation.label}</strong><span>{relation.summary}</span><small>{formatRelationType(relation.relationType, locale)} · {formatConfidence(relation.confidence, locale)} · {formatEvidence(relation.evidenceLayer, locale)}</small></li>)}
          </ul>
        ) : <p className="comparison-empty">{locale === "zh-CN" ? "当前比较集没有人物之间的直接关系；这保留了历史人物之间的差异，而不是强行制造联系。" : "This comparison set has no direct figure-to-figure relation; the difference is preserved rather than filled with a forced connection."}</p>}
        {data.bridges.length > 0 ? (
          <ul className="comparison-bridge-list">
            {data.bridges.map((bridge) => <li key={bridge.key}><strong>{bridge.title}</strong><span>{bridge.entityKeys.map((key) => data.entities.find((entity) => entity.key === key)?.title ?? key).join(" · ")}</span><small>{bridge.relationTypes.map((type) => formatRelationType(type, locale)).join(" · ")}</small></li>)}
          </ul>
        ) : <p className="comparison-empty">{locale === "zh-CN" ? "当前关系集还没有一个同时连接两位以上人物的共同外部节点；后续补充新事件、地点、文本版本后会在这里显现。" : "The current relation set has no external node shared by more than one figure; new events, places and text versions will appear here as they are added."}</p>}
      </section>

      <footer className="comparison-footer page-shell">
        <Link className="button button-secondary" to={withLang("/explore?view=graph", locale)}>{locale === "zh-CN" ? "在关系图中继续探索" : "Continue in the relation graph"}</Link>
        <Link className="button button-secondary" to={withLang("/research?audit=blocking", locale)}>{locale === "zh-CN" ? "回到来源与审核" : "Return to sources and review"}</Link>
      </footer>
    </article>
  );
}
