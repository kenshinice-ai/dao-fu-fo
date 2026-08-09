import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
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
  const loader = useCallback((signal: AbortSignal) => staticData.entity(kind, slug, locale, signal), [kind, slug, locale]);
  const { data, error } = useStaticData(loader);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

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
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <Link className="button button-secondary" to={withLang("/explore", locale)}>
            {locale === "zh-CN" ? "回到探索" : "Back to Explore"}
          </Link>
        </aside>
      </div>
    </article>
  );
}
