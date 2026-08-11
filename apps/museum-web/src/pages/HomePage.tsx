import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AtlasWorkspace } from "../components/AtlasWorkspace";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { Icon } from "../components/Icon";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath, parseRouteState, serializeRouteState, withLang } from "../routing";
import type { Locale } from "../types";
import type { RouteState } from "../routing";

function HomeAtlasPreview({ locale }: { locale: Locale }) {
  const [params, setParams] = useSearchParams();
  const parsedState = parseRouteState(params);
  const state = parsedState.view === "map" ? parsedState : { ...parsedState, view: "map" as const, mapLayer: "real" as const };
  const updateState = useCallback((changes: Partial<RouteState>) => {
    const nextState = { ...state, ...changes, view: "map" as const, mapLayer: "real" as const };
    setParams(serializeRouteState(nextState));
  }, [setParams, state]);

  return (
    <AtlasWorkspace
      locale={locale}
      state={state}
      onChange={updateState}
      className="home-atlas-panel"
      compact
      heading={locale === "zh-CN" ? "交错的历史时空" : "Interwoven historical space-time"}
      description={locale === "zh-CN" ? "点击城市查看人物与事件；点击人物，沿着地点、著作、言论、关系和时间继续探索。" : "Select a city for figures and events; select a figure to follow places, works, sayings, relationships and time."}
    />
  );
}

export function HomePage() {
  const { locale } = useMuseumContext();
  const loader = useCallback((signal: AbortSignal) => staticData.overview(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  const totalFigureCount = data.traditions.reduce((total, tradition) => total + tradition.counts.figures, 0);

  return (
    <>
      <section className="home-hero home-atlas-hero">
        <h1 className="sr-only">{data.heroTitle}</h1>
        <HomeAtlasPreview locale={locale} />
      </section>

      <section className="tradition-section section-shell" aria-labelledby="tradition-heading">
        <div className="section-heading">
          <p className="eyebrow">03 / {locale === "zh-CN" ? "传统入口" : "Tradition gateways"}</p>
          <h2 id="tradition-heading">{locale === "zh-CN" ? "从一条道路进入文明" : "Enter through one path"}</h2>
          <p>{locale === "zh-CN" ? "每个入口保留自身历史，也显示与另外两者相遇的地方。" : "Each path keeps its own history while showing where it meets the others."}</p>
        </div>
        <div className="tradition-grid">
          {data.traditions.map((tradition, index) => (
            <Link
              key={tradition.slug}
              className={`tradition-card tradition-card-${tradition.slug}`}
              to={entityPath(tradition.focusEntity.kind, tradition.focusEntity.slug, locale)}
            >
              <div className="card-number">0{index + 1}</div>
              <TraditionMark tradition={tradition.slug} size="lg" />
              <p className="card-subtitle">{tradition.subtitle}</p>
              <h3>{tradition.label}</h3>
              <p>{tradition.statement}</p>
              <dl>
                <div><dt>{locale === "zh-CN" ? "人物" : "Figures"}</dt><dd>{tradition.counts.figures}</dd></div>
                <div><dt>{locale === "zh-CN" ? "经典" : "Texts"}</dt><dd>{tradition.counts.texts}</dd></div>
                <div><dt>{locale === "zh-CN" ? "原典" : "Passages"}</dt><dd>{tradition.counts.passages}</dd></div>
              </dl>
              <span className="card-link">{locale === "zh-CN" ? "进入" : "Enter"} <Icon name="arrow" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="figure-spotlight section-shell" aria-labelledby="figure-spotlight-heading">
        <div className="section-heading">
          <p className="eyebrow">04 / {locale === "zh-CN" ? "人物入口" : "Figure gateways"}</p>
          <h2 id="figure-spotlight-heading">{locale === "zh-CN" ? "人物、空间与时间" : "People, place and time"}</h2>
          <p>{locale === "zh-CN" ? "从老子、孔子与释迦牟尼等源头人物，到历代思想家、译经家、制度人物与后世接受；每个人物都回到具体地点、事件、文本和后世影响。" : "From source figures such as Laozi, Confucius and Śākyamuni to thinkers, translators, institutional figures and later reception across the centuries, each person returns to a place, event, text and later influence."}</p>
        </div>
        <div className="figure-spotlight-grid">
          {data.featuredFigures.map((figure, index) => (
            <Link
              className={`figure-spotlight-card tradition-card-${figure.tradition}`}
              key={figure.slug}
              to={entityPath(figure.kind, figure.slug, locale)}
            >
              <div className="figure-spotlight-topline">
                <span className="figure-spotlight-index">{String(index + 1).padStart(2, "0")}</span>
                <span className={`figure-spotlight-tradition tradition-${figure.tradition}`}>
                  <TraditionMark tradition={figure.tradition} size="sm" />
                  {figure.traditionLabel}
                </span>
              </div>
              <h3>{figure.title}</h3>
              <p className="figure-spotlight-role">{figure.role}</p>
              <p className="figure-spotlight-summary">{figure.summary}</p>
              <dl>
                <div><dt>{locale === "zh-CN" ? "时间" : "Time"}</dt><dd>{figure.timeLabel}</dd></div>
                <div><dt>{locale === "zh-CN" ? "地点" : "Place"}</dt><dd>{figure.placeLabel}</dd></div>
              </dl>
              <span className="figure-spotlight-link">{locale === "zh-CN" ? "查看人物档案" : "Open figure dossier"} <Icon name="arrow" /></span>
            </Link>
          ))}
        </div>
        <div className="figure-spotlight-footer">
          <span>{locale === "zh-CN" ? `当前收录 ${totalFigureCount} 位人物，三种传统；空间待核处明确保留证据边界。` : `${totalFigureCount} figures across three traditions; pending places remain explicitly marked.`}</span>
          <Link className="text-link" to={withLang("/compare?set=cross-era-figures", locale)}>
            {locale === "zh-CN" ? "进入跨时代人物比较" : "Open cross-era figure comparison"} <Icon name="arrow" />
          </Link>
        </div>
      </section>

      <section className="featured-exhibition section-shell">
        <div className="exhibition-number" aria-hidden="true">01</div>
        <div className="featured-copy">
          <p className="eyebrow">{locale === "zh-CN" ? "首个数字展览" : "First digital exhibition"}</p>
          <h2>{data.exhibition.title}</h2>
          <p className="featured-subtitle">{data.exhibition.subtitle}</p>
          <blockquote>{data.exhibition.question}</blockquote>
          <Link className="text-link" to={withLang(`/museum/${data.exhibition.slug}`, locale)}>
            {data.primaryAction} <Icon name="arrow" />
          </Link>
        </div>
        <div className="passage-preview">
          <span>{data.todayLabel}</span>
          <blockquote lang="zh-Hans">{data.todayPassage.quote}</blockquote>
          <p>{data.todayPassage.interpretation}</p>
          <Link to={entityPath("passage", data.todayPassage.slug, locale)}>{data.todayPassage.source}</Link>
        </div>
      </section>

      <section className="methodology-teaser section-shell">
        <p className="eyebrow">Method / 方法</p>
        <h2>{data.methodologyTitle}</h2>
        <p>{data.methodologyText}</p>
        <Link className="button button-secondary" to={withLang("/methodology", locale)}>
          {locale === "zh-CN" ? "查看来源与方法" : "View sources and method"}
        </Link>
      </section>
    </>
  );
}
