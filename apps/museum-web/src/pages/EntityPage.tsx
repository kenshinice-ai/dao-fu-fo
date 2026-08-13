import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { isPersonToPersonRelation, relationConnector } from "../data/contextProjection";
import { formatConfidence, formatEntityKind, formatEventKind, formatEventScope, formatEvidence, formatEvidenceLine, formatFigureClass, formatHistoricity, formatInteractionMode, formatRelationType } from "../data/labels";
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
  const relatedItems = data.related.filter((item) => {
    const relatedKey = `${item.kind}:${item.slug}`;
    return !connectedRelations.some((relation) => {
      const sourceKey = `${relation.source.kind}:${relation.source.slug}`;
      const targetKey = `${relation.target.kind}:${relation.target.slug}`;
      return (sourceKey === relatedKey || targetKey === relatedKey) && relation.label === item.relation;
    });
  });
  const searchMap = new Map(contextData.search.items.map((item) => [`${item.kind}:${item.slug}`, item.title]));
  const birthplaceRelations = data.kind === "figure"
    ? connectedRelations.filter((relation) => {
        if (relation.relationType !== "born_in") return false;
        const sourceKey = `${relation.source.kind}:${relation.source.slug}`;
        const targetKey = `${relation.target.kind}:${relation.target.slug}`;
        return (sourceKey === currentKey && relation.target.kind === "place")
          || (targetKey === currentKey && relation.source.kind === "place");
      })
    : [];

  return (
    <article className={`entity-page entity-${data.kind}`}>
      <header className="entity-hero page-shell">
        <div className="entity-heading">
          <TraditionMark tradition={data.tradition} size="lg" />
          <p className="eyebrow">{formatEntityKind(data.kind, locale)} / {formatEvidence(data.evidence, locale)}</p>
          <h1>{data.title}</h1>
          {data.subtitle ? <p className="entity-subtitle">{data.subtitle}</p> : null}
          <p className="entity-summary">{data.shortSummary}</p>
        </div>
        <dl className="entity-facts">
          <div><dt>{locale === "zh-CN" ? "年代" : "Period"}</dt><dd>{data.timeLabel}</dd></div>
          {data.kind === "event" && profileText(data.profile, "eventKind") ? <div><dt>{locale === "zh-CN" ? "事件性质" : "Event nature"}</dt><dd>{formatEventKind(profileText(data.profile, "eventKind"), locale)}{profileText(data.profile, "eventScope") ? ` · ${formatEventScope(profileText(data.profile, "eventScope"), locale)}` : ""}</dd></div> : null}
          {data.kind === "figure" && profileText(data.profile, "historicity") ? <div><dt>{locale === "zh-CN" ? "历史地位" : "Historicity"}</dt><dd>{formatHistoricity(profileText(data.profile, "historicity"), locale)}</dd></div> : null}
          {data.kind === "figure" && profileText(data.profile, "figureClass") ? <div><dt>{locale === "zh-CN" ? "人物类别" : "Figure class"}</dt><dd>{formatFigureClass(profileText(data.profile, "figureClass"), locale)}</dd></div> : null}
          {birthplaceRelations.length > 0 ? (
            <div>
              <dt>{locale === "zh-CN" ? "出生地" : "Birthplace"}</dt>
              <dd>
                {birthplaceRelations.map((relation, index) => {
                  const place = relation.source.kind === "place" ? relation.source : relation.target;
                  return (
                    <span key={relation.id}>
                      {index > 0 ? ", " : null}
                      <Link to={entityPath("place", place.slug, locale)}>{searchMap.get(`place:${place.slug}`) ?? place.slug.replaceAll("-", " ")}</Link>
                    </span>
                  );
                })}
              </dd>
            </div>
          ) : null}
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
          {relatedItems.length > 0 ? (
            <section>
              <h2>{locale === "zh-CN" ? "继续探索" : "Continue exploring"}</h2>
              <ul className="related-list">
                {relatedItems.map((item) => (
                  <li key={`${item.kind}:${item.slug}`}>
                    <span>{item.relation}</span>
                    <Link to={entityPath(item.kind, item.slug, locale)}>{item.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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
            <Link className="button button-secondary" to={withLang(`/explore?view=map&tab=relations&focus=${encodeURIComponent(currentKey)}`, locale)}>
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
  const personRelations = entity.kind === "figure" ? relations.filter(isPersonToPersonRelation) : [];
  const contextRelations = entity.kind === "figure" ? relations.filter((relation) => !isPersonToPersonRelation(relation)) : relations;
  return (
    <>
      {entity.kind === "figure" ? (
        <section className="entity-network entity-person-network" data-person-relations aria-labelledby="entity-person-relations-title">
          <div className="entity-network-heading">
            <p className="eyebrow">{locale === "zh-CN" ? "人物关系" : "Person-to-person"}</p>
            <h2 id="entity-person-relations-title">{locale === "zh-CN" ? "人物—人物关系层" : "Figure-to-figure relation layer"}</h2>
            <p>{locale === "zh-CN" ? "同时代往来、思想影响与后世接受分层显示；后世接受不表示两位人物同时代交往。地点、事件与文本关系另列。" : "Contemporaneity, intellectual influence and later reception are shown as distinct layers; later reception does not imply contemporaneous contact. Places, events and text relations stay separate."}</p>
          </div>
          <RelationList locale={locale} entity={entity} relations={personRelations} searchMap={searchMap} emptyText={locale === "zh-CN" ? "当前没有可核实的人物—人物关系。" : "No verified figure-to-figure relation is available for this figure yet."} />
        </section>
      ) : null}
      <section className="entity-network" aria-labelledby="entity-network-title">
        <div className="entity-network-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "关联语境" : "Context network"}</p>
          <h2 id="entity-network-title">{entity.kind === "figure" ? (locale === "zh-CN" ? "地点、事件、文本与后世影响" : "Places, events, texts and later reception") : (locale === "zh-CN" ? "人物、事件、地点与关系语境" : "Figures, events, places and context")}</h2>
          <p>{locale === "zh-CN" ? "每条关系都保留方向、时间限定、证据层和来源入口；它不是没有语义的连线。" : "Each relation keeps direction, temporal qualifiers, evidence layer and source entry; it is not a semantic-free line."}</p>
        </div>
        <RelationList locale={locale} entity={entity} relations={contextRelations} searchMap={searchMap} emptyText={locale === "zh-CN" ? "当前条目还没有可展示的关联语境。" : "No context relations are available for this entry yet."} />
      </section>
    </>
  );
}

function RelationList({
  locale,
  entity,
  relations,
  searchMap,
  emptyText,
}: {
  locale: "zh-CN" | "en";
  entity: Awaited<ReturnType<typeof staticData.entity>>;
  relations: ReadModelRelationIndex["items"];
  searchMap: Map<string, string>;
  emptyText: string;
}) {
  const currentKey = `${entity.kind}:${entity.slug}`;
  if (relations.length === 0) return <p className="entity-network-empty">{emptyText}</p>;
  return (
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
              <strong>{sourceKey === currentKey ? entity.title : otherTitle} <span aria-hidden="true">{relationConnector(relation)}</span> {sourceKey === currentKey ? otherTitle : entity.title}</strong>
              <span className="relation-confidence">{formatRelationType(relation.relationType, locale)} · {formatEvidenceLine(relation.evidenceLayer, relation.confidence, locale)}</span>
            </div>
            <p>{relation.summary}</p>
            {time ? <small className="relation-time">{time}</small> : null}
            {relation.qualifiers.interactionMode || qualifierLabels.length > 0 ? <div className="relation-qualifiers">
              {relation.qualifiers.interactionMode ? <span>{formatInteractionMode(relation.qualifiers.interactionMode, locale)}</span> : null}
              {qualifierLabels.map((label) => <span key={label}>{label.replaceAll("_", " ")}</span>)}
            </div> : null}
            <div className="entity-network-actions">
              <Link to={entityPath(other.kind, other.slug, locale)}>{locale === "zh-CN" ? "打开对象" : "Open object"}</Link>
              {relation.sourceIds.map((sourceId) => <Link key={sourceId} to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
