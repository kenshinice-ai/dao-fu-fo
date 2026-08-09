import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath, withLang } from "../routing";

export function ExhibitionPage() {
  const { exhibitionSlug = "changan-three-traditions" } = useParams();
  const { locale } = useMuseumContext();
  const [activeSection, setActiveSection] = useState("");
  const loader = useCallback(
    (signal: AbortSignal) => staticData.exhibition(exhibitionSlug, locale, signal),
    [exhibitionSlug, locale],
  );
  const { data, error } = useStaticData(loader);

  const sectionIds = useMemo(() => data?.sections.map((section) => `section-${section.slug}`) ?? [], [data]);

  useEffect(() => {
    if (!data) return;
    setActiveSection(data.sections[0]?.slug ?? "");
    const elements = sectionIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id.replace("section-", ""));
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.15, 0.5] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [data, sectionIds]);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  return (
    <article className="exhibition-page">
      <header className="exhibition-hero page-shell">
        <div>
          <p className="eyebrow">Exhibition 01 / {locale === "zh-CN" ? "隋唐" : "Sui–Tang"}</p>
          <h1>{data.title}</h1>
          <p className="exhibition-subtitle">{data.subtitle}</p>
        </div>
        <div className="curatorial-question">
          <span>{locale === "zh-CN" ? "策展问题" : "Curatorial question"}</span>
          <blockquote>{data.curatorialQuestion}</blockquote>
          <p>{data.opening}</p>
          <div>
            <span>{data.quickMinutes} min · {locale === "zh-CN" ? "快速参观" : "quick"}</span>
            <span>{data.fullMinutes} min · {locale === "zh-CN" ? "完整参观" : "full visit"}</span>
          </div>
        </div>
      </header>

      <div className="exhibition-layout page-shell">
        <aside className="exhibition-rail" aria-label={locale === "zh-CN" ? "展览章节" : "Exhibition chapters"}>
          <span className="rail-label">{locale === "zh-CN" ? "参观路径" : "Visit route"}</span>
          <ol>
            {data.sections.map((section) => (
              <li key={section.slug} className={activeSection === section.slug ? "active" : ""}>
                <a href={`#section-${section.slug}`}>
                  <span>0{section.sequence}</span>
                  <strong>{section.title}</strong>
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <div className="exhibition-narrative">
          {data.sections.map((section) => (
            <section
              id={`section-${section.slug}`}
              key={section.slug}
              className={`exhibition-section section-${section.tradition}`}
              tabIndex={-1}
            >
              <div className="section-marker">
                <span>0{section.sequence}</span>
                <TraditionMark tradition={section.tradition} />
              </div>
              <div className="section-copy">
                <p className="eyebrow">{section.kicker}</p>
                <h2>{section.title}</h2>
                <blockquote className="section-question">{section.question}</blockquote>
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

                <figure className="object-label">
                  <figcaption>{section.object.label}</figcaption>
                  <h3>{section.object.title}</h3>
                  <span>{section.object.meta}</span>
                  <p>{section.object.description}</p>
                </figure>

                {section.passage ? (
                  <div className="passage-card">
                    <span>{locale === "zh-CN" ? "原典" : "Primary text"}</span>
                    <blockquote lang="zh-Hans">{section.passage.quote}</blockquote>
                    <p>{section.passage.interpretation}</p>
                    <Link to={entityPath("passage", section.passage.slug, locale)}>
                      {section.passage.source} <Icon name="arrow" />
                    </Link>
                  </div>
                ) : null}

                <Link
                  className="explore-jump"
                  to={withLang(`/explore?view=${section.explore.mode}&focus=${section.explore.focus}`, locale)}
                >
                  <span>
                    <Icon name={section.explore.mode === "map" ? "map" : section.explore.mode === "timeline" ? "timeline" : "graph"} />
                    {section.explore.label}
                  </span>
                  <Icon name="arrow" />
                </Link>
              </div>
            </section>
          ))}

          <section className="exhibition-closing">
            <p className="eyebrow">{locale === "zh-CN" ? "离场思考" : "Exit reflection"}</p>
            <blockquote>{data.closingReflection}</blockquote>
            <div>
              <Link className="button button-primary" to={withLang("/explore", locale)}>
                {locale === "zh-CN" ? "继续自由探索" : "Continue exploring"}
                <Icon name="arrow" />
              </Link>
              <Link className="button button-secondary" to={withLang("/methodology", locale)}>
                {locale === "zh-CN" ? "查看来源方法" : "View methodology"}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
