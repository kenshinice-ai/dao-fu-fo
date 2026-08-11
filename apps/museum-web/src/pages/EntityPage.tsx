import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath, withLang } from "../routing";
import type { EntityKind } from "../types";

export function EntityPage({ kind }: { kind: EntityKind }) {
  const { slug = "" } = useParams();
  const { locale } = useMuseumContext();
  const loader = useCallback(async (signal: AbortSignal): Promise<{ entity: Awaited<ReturnType<typeof staticData.entity>>; relations: ReadModelRelationIndex; search: Awaited<ReturnType<typeof staticData.searchIndex>> }> => {
    const [entity, relations, search] = await Promise.all([
      staticData.entity(kind, slug, locale, signal),
      staticData.relations(locale, signal),
      staticData.searchIndex(locale, signal),
    ]);
    return { entity, relations, search };
  }, [kind, slug, locale]);
  const { data: contextData, error } = useStaticData(loader);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!contextData) return <LoadingState locale={locale} />;

  const data = contextData.entity;
  const currentKey = `${data.kind}:${data.slug}`;
  const connectedRelations = contextData.relations.items.filter((relation) => {
    const sourceKey = `${relation.source.kind}:${relation.source.slug}`;
    const targetKey = `${relation.target.kind}:${relation.target.slug}`;
    return sourceKey === currentKey || targetKey === currentKey;
  });
  const searchMap = new Map(contextData.search.items.map((item) => [`${item.kind}:${item.slug}`, item.title]));

  return (
    <article className={`entity-page entity-${data.kind}`}>
      <header className="entity-hero page-shell">
        <div className="entity-heading">
          <TraditionMark tradition={data.tradition} size="lg" />
          <p className="eyebrow">{data.kind.replace("_", " ")} / {data.evidence}</p>
          <h1>{data.title}</h1>
          {data.subtitle ? <p className="entity-subtitle">{data.subtitle}</p> : null}
          <p className="entity-summary">{data.shortSummary}</p>
        </div>
        <dl className="entity-facts">
          <div><dt>{locale === "zh-CN" ? "年代" : "Period"}</dt><dd>{data.timeLabel}</dd></div>
          {data.kind === "figure" && profileText(data.profile, "historicity") ? <div><dt>{locale === "zh-CN" ? "历史地位" : "Historicity"}</dt><dd>{profileText(data.profile, "historicity")}</dd></div> : null}
          {data.kind === "figure" && profileText(data.profile, "figureClass") ? <div><dt>{locale === "zh-CN" ? "人物类别" : "Figure class"}</dt><dd>{profileText(data.profile, "figureClass")}</dd></div> : null}
          {data.keyFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
        </dl>
      </header>

      <div className="entity-body page-shell">
        <div className="entity-narrative">
          {data.curatorialDescription.map((paragraph, index) => (
            <p className={index === 0 ? "lead-paragraph" : ""} key={paragraph}>{paragraph}</p>
          ))}
          {data.quote ? (
            <figure className="entity-quote">
              <blockquote lang="zh-Hans">{data.quote.original}</blockquote>
              <p>{data.quote.interpretation}</p>
              <figcaption>{data.quote.locator}</figcaption>
            </figure>
          ) : null}
          <section className="research-note">
            <p className="eyebrow">Research / {locale === "zh-CN" ? "研究说明" : "Research note"}</p>
            <p>{data.researchNote}</p>
          </section>
          <EntityRelations locale={locale} entity={data} relations={connectedRelations} searchMap={searchMap} />
        </div>

        <aside className="entity-evidence">
          <section>
            <h2>{locale === "zh-CN" ? "继续探索" : "Continue exploring"}</h2>
            <ul className="related-list">
              {data.related.map((item) => (
                <li key={`${item.kind}:${item.slug}`}>
                  <span>{item.relation}</span>
                  <Link to={entityPath(item.kind, item.slug, locale)}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>{locale === "zh-CN" ? "来源与证据" : "Sources & evidence"}</h2>
            <ol className="source-list">
              {data.sources.map((source) => (
                <li key={`${source.title}:${source.locator}`}>
                  <span className={`source-grade grade-${source.grade}`}>{source.grade}</span>
                  <div>
                    {source.url ? <a href={source.url} rel="noreferrer" target="_blank">{source.title}</a> : <strong>{source.title}</strong>}
                    <span>{source.locator}</span>
                    <small>{source.role}</small>
                    <Link className="source-ledger-jump" to={`/research?source=${encodeURIComponent(source.id)}&lang=${encodeURIComponent(locale)}`}>{locale === "zh-CN" ? "在研究层查看" : "View in Research"}</Link>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <div className="entity-actions">
            {data.kind === "figure" && ["laozi", "confucius", "sakyamuni"].includes(data.slug) ? (
              <Link className="button button-primary" to={withLang(`/compare?set=cross-era-figures&entities=${encodeURIComponent("figure:laozi,figure:confucius,figure:sakyamuni")}`, locale)}>
                {locale === "zh-CN" ? "进入跨时代人物比较" : "Open cross-era figure comparison"}
              </Link>
            ) : null}
            {data.kind === "passage" && ["humans-follow-earth", "return-to-ritual", "turning-of-dharma-wheel"].includes(data.slug) ? (
              <Link className="button button-primary" to={withLang("/text-readings?set=three-traditions-passage-reading", locale)}>
                {locale === "zh-CN" ? "进入三传统原典对读" : "Open three-tradition passage reading"}
              </Link>
            ) : null}
            <Link className="button button-secondary" to={withLang(`/explore?view=graph&focus=${encodeURIComponent(currentKey)}`, locale)}>
              {locale === "zh-CN" ? "在关系图中展开" : "Open relation context"}
            </Link>
            <Link className="button button-secondary" to={withLang("/explore", locale)}>
              {locale === "zh-CN" ? "回到探索" : "Back to Explore"}
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}

function profileText(profile: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = profile?.[key];
  return typeof value === "string" ? value.replaceAll("_", " ") : undefined;
}

function EntityRelations({
  locale,
  entity,
  relations,
  searchMap,
}: {
  locale: "zh-CN" | "en";
  entity: Awaited<ReturnType<typeof staticData.entity>>;
  relations: ReadModelRelationIndex["items"];
  searchMap: Map<string, string>;
}) {
  const currentKey = `${entity.kind}:${entity.slug}`;
  return (
    <section className="entity-network" aria-labelledby="entity-network-title">
      <div className="entity-network-heading">
        <p className="eyebrow">{locale === "zh-CN" ? "关系网络" : "Relation network"}</p>
        <h2 id="entity-network-title">{locale === "zh-CN" ? "人物、事件、地点与后世接收" : "Figures, events, places and later reception"}</h2>
        <p>{locale === "zh-CN" ? "每条关系都保留方向、时间限定、证据层和来源入口；它不是没有语义的连线。" : "Each relation keeps direction, temporal qualifiers, evidence layer and source entry; it is not a semantic-free line."}</p>
      </div>
      {relations.length > 0 ? (
        <ul className="entity-network-list">
          {relations.map((relation) => {
            const sourceKey = `${relation.source.kind}:${relation.source.slug}`;
            const targetKey = `${relation.target.kind}:${relation.target.slug}`;
            const other = sourceKey === currentKey ? relation.target : relation.source;
            const otherKey = `${other.kind}:${other.slug}`;
            const otherTitle = searchMap.get(otherKey) ?? other.slug.replaceAll("-", " ");
            const time = relation.temporalAssertions.map((assertion) => `${assertion.predicate}: ${assertion.displayDate}`).join(" · ");
            const qualifierLabels = [relation.qualifiers.spatialRole, relation.qualifiers.historicity, relation.qualifiers.attributionStatus, relation.qualifiers.receptionMode].filter((value): value is NonNullable<typeof value> => Boolean(value));
            return (
              <li key={relation.id}>
                <div className="entity-network-card-heading">
                  <span className="relation-type-label">{relation.label}</span>
                  <strong>{sourceKey === currentKey ? entity.title : otherTitle} → {sourceKey === currentKey ? otherTitle : entity.title}</strong>
                  <span className="relation-confidence">{relation.relationType.replaceAll("_", " ")} · {relation.confidence} · {relation.evidenceLayer.replaceAll("_", " ")}</span>
                </div>
                <p>{relation.summary}</p>
                {time ? <small className="relation-time">{time}</small> : null}
                {qualifierLabels.length > 0 ? <div className="relation-qualifiers">{qualifierLabels.map((label) => <span key={label}>{label.replaceAll("_", " ")}</span>)}</div> : null}
                <div className="entity-network-actions">
                  <Link to={entityPath(other.kind, other.slug, locale)}>{locale === "zh-CN" ? "打开对象" : "Open object"}</Link>
                  {relation.sourceIds.map((sourceId) => <Link key={sourceId} to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="entity-network-empty">{locale === "zh-CN" ? "当前条目还没有可展示的一跳关系。" : "No one-hop relations are available for this entry yet."}</p>
      )}
    </section>
  );
}
