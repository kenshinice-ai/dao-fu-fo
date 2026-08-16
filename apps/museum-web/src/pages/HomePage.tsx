import { useCallback, useState } from "react";
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
  const loader = useCallback(async (signal: AbortSignal) => {
    const [overview, search] = await Promise.all([
      staticData.overview(locale, signal),
      staticData.searchIndex(locale, signal),
    ]);
    return { overview, search };
  }, [locale]);
  const [figureTradition, setFigureTradition] = useState<"all" | "daoism" | "confucianism" | "buddhism">("all");
  const [figureEra, setFigureEra] = useState("all");
  const [figureQuery, setFigureQuery] = useState("");
  const { data, error } = useStaticData(loader);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;
  const { overview, search } = data;
  const countsByTradition = new Map<string, { figures: number; texts: number; passages: number }>();
  for (const item of search.items) {
    if (!countsByTradition.has(item.tradition)) countsByTradition.set(item.tradition, { figures: 0, texts: 0, passages: 0 });
    const counts = countsByTradition.get(item.tradition)!;
    if (item.kind === "figure") counts.figures += 1;
    if (item.kind === "text") counts.texts += 1;
    if (item.kind === "passage") counts.passages += 1;
  }
  const traditions = overview.traditions.map((tradition) => ({
    ...tradition,
    counts: { ...tradition.counts, ...(countsByTradition.get(tradition.slug) ?? {}) },
  }));
  const totalFigureCount = search.items.filter((item) => item.kind === "figure").length;
  const allFigures = search.items.filter((item) => item.kind === "figure");
  const figureEntries = allFigures
    .filter((figure) => figureTradition === "all" || figure.tradition === figureTradition)
    .filter((figure) => figureEra === "all" || figureEraForYear(figure.timeRange?.startYear) === figureEra)
    .filter((figure) => {
      const query = figureQuery.trim().toLocaleLowerCase();
      return !query || `${figure.title} ${figure.context} ${figure.tradition}`.toLocaleLowerCase().includes(query);
    })
    .sort((left, right) => left.title.localeCompare(right.title, locale === "zh-CN" ? "zh-Hans" : "en"));

  return (
    <>
      <section className="home-hero home-atlas-hero">
        <h1 className="sr-only">{overview.heroTitle}</h1>
        <HomeAtlasPreview locale={locale} />
      </section>

      <section className="tradition-section section-shell" aria-labelledby="tradition-heading">
        <div className="section-heading">
          <p className="eyebrow">03 / {locale === "zh-CN" ? "传统入口" : "Tradition gateways"}</p>
          <h2 id="tradition-heading">{locale === "zh-CN" ? "从一条道路进入文明" : "Enter through one path"}</h2>
          <p>{locale === "zh-CN" ? "每个入口保留自身历史，也显示与另外两者相遇的地方。" : "Each path keeps its own history while showing where it meets the others."}</p>
        </div>
        <div className="tradition-grid">
          {traditions.map((tradition, index) => (
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
          {overview.featuredFigures.map((figure, index) => (
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

      <section className="figure-gateway-section section-shell" aria-labelledby="figure-gateway-heading" data-home-figure-directory data-home-figure-count={allFigures.length}>
        <div className="section-heading">
          <p className="eyebrow">05 / {locale === "zh-CN" ? "人物总览" : "Figure directory"}</p>
          <h2 id="figure-gateway-heading">{locale === "zh-CN" ? "从全部人物进入具体语境" : "Every figure, with a way in"}</h2>
          <p>{locale === "zh-CN" ? "这里列出当前公开搜索索引中的全部人物条目；筛选只改变浏览顺序，不改变人物档案中的证据与时间边界。" : "This directory lists every figure in the public search index; filters change browsing, not the evidence or time boundaries in each dossier."}</p>
        </div>
        <div className="figure-gateway-controls" role="group" aria-label={locale === "zh-CN" ? "人物目录筛选" : "Figure directory filters"}>
          <div className="figure-gateway-filter-group">
            <span className="control-label">{locale === "zh-CN" ? "传统" : "Tradition"}</span>
            {(["all", "daoism", "confucianism", "buddhism"] as const).map((tradition) => <button key={tradition} type="button" className={figureTradition === tradition ? "active" : ""} aria-pressed={figureTradition === tradition} onClick={() => setFigureTradition(tradition)}>{tradition === "all" ? (locale === "zh-CN" ? "全部" : "All") : tradition === "daoism" ? (locale === "zh-CN" ? "道" : "Dao") : tradition === "confucianism" ? (locale === "zh-CN" ? "儒" : "Ru") : (locale === "zh-CN" ? "佛" : "Fo")}</button>)}
          </div>
          <div className="figure-gateway-filter-group">
            <span className="control-label">{locale === "zh-CN" ? "时代" : "Era"}</span>
            {(["all", "origins", "qin-han", "wei-jin", "sui-tang", "song-yuan", "ming-qing", "modern"] as const).map((era) => <button key={era} type="button" className={figureEra === era ? "active" : ""} aria-pressed={figureEra === era} onClick={() => setFigureEra(era)}>{eraLabel(era, locale)}</button>)}
          </div>
          <label className="figure-gateway-search">
            <span className="control-label">{locale === "zh-CN" ? "搜索人物" : "Search figures"}</span>
            <input type="search" value={figureQuery} onChange={(event) => setFigureQuery(event.target.value)} placeholder={locale === "zh-CN" ? "按姓名或语境搜索" : "Search by name or context"} aria-label={locale === "zh-CN" ? "搜索人物" : "Search figures"} />
          </label>
        </div>
        <p className="figure-gateway-count" aria-live="polite">{figureEntries.length} / {allFigures.length} {locale === "zh-CN" ? "位人物" : "figures"}</p>
        <div className="figure-gateway-grid">
          {figureEntries.map((figure, index) => <Link className={`figure-gateway-card tradition-card-${figure.tradition}`} key={figure.slug} to={entityPath("figure", figure.slug, locale)}>
            <div className="figure-gateway-card-topline"><span>{String(index + 1).padStart(3, "0")}</span><span>{figure.tradition === "daoism" ? (locale === "zh-CN" ? "道" : "Dao") : figure.tradition === "confucianism" ? (locale === "zh-CN" ? "儒" : "Ru") : figure.tradition === "buddhism" ? (locale === "zh-CN" ? "佛" : "Fo") : (locale === "zh-CN" ? "交汇" : "Convergence")}</span></div>
            <h3>{figure.title}</h3>
            <p>{figure.context}</p>
            <dl><div><dt>{locale === "zh-CN" ? "年代" : "Period"}</dt><dd>{formatSearchTime(figure.timeRange, locale)}</dd></div><div><dt>{locale === "zh-CN" ? "传统" : "Tradition"}</dt><dd>{figure.tradition}</dd></div></dl>
            <span className="figure-gateway-card-link">{locale === "zh-CN" ? "打开人物档案" : "Open figure dossier"} <Icon name="arrow" /></span>
          </Link>)}
        </div>
      </section>

      <section className="featured-exhibition section-shell">
        <div className="exhibition-number" aria-hidden="true">01</div>
        <div className="featured-copy">
          <p className="eyebrow">{locale === "zh-CN" ? "首个数字展览" : "First digital exhibition"}</p>
          <h2>{overview.exhibition.title}</h2>
          <p className="featured-subtitle">{overview.exhibition.subtitle}</p>
          <blockquote>{overview.exhibition.question}</blockquote>
          <Link className="text-link" to={withLang(`/museum/${overview.exhibition.slug}`, locale)}>
            {overview.primaryAction} <Icon name="arrow" />
          </Link>
        </div>
        <div className="passage-preview">
          <span>{overview.todayLabel}</span>
          <blockquote lang="zh-Hans">{overview.todayPassage.quote}</blockquote>
          <p>{overview.todayPassage.interpretation}</p>
          <Link to={entityPath("passage", overview.todayPassage.slug, locale)}>{overview.todayPassage.source}</Link>
        </div>
      </section>

      <section className="methodology-teaser section-shell">
        <p className="eyebrow">Method / 方法</p>
        <h2>{overview.methodologyTitle}</h2>
        <p>{overview.methodologyText}</p>
        <Link className="button button-secondary" to={withLang("/methodology", locale)}>
          {locale === "zh-CN" ? "查看来源与方法" : "View sources and method"}
        </Link>
      </section>
    </>
  );
}

function eraForYear(year: number | undefined): string {
  if (year === undefined) return "undated";
  if (year < -221) return "origins";
  if (year < 220) return "qin-han";
  if (year < 581) return "wei-jin";
  if (year < 907) return "sui-tang";
  if (year < 1368) return "song-yuan";
  if (year < 1911) return "ming-qing";
  return "modern";
}

function figureEraForYear(year: number | undefined): string {
  return eraForYear(year);
}

function eraLabel(era: string, locale: Locale): string {
  const labels: Record<string, { zh: string; en: string }> = {
    all: { zh: "全部", en: "All" },
    origins: { zh: "神话与先秦", en: "Origins / Pre-Qin" },
    "qin-han": { zh: "秦汉", en: "Qin–Han" },
    "wei-jin": { zh: "魏晋南北朝", en: "Wei–Jin" },
    "sui-tang": { zh: "隋唐", en: "Sui–Tang" },
    "song-yuan": { zh: "宋元", en: "Song–Yuan" },
    "ming-qing": { zh: "明清", en: "Ming–Qing" },
    modern: { zh: "近现代", en: "Modern" },
  };
  return labels[era]?.[locale === "zh-CN" ? "zh" : "en"] ?? era;
}

function formatSearchTime(timeRange: { startYear: number; endYear?: number } | undefined, locale: Locale): string {
  if (!timeRange) return locale === "zh-CN" ? "年代待定" : "Date unresolved";
  const format = (year: number) => locale === "zh-CN" ? (year < 0 ? `前${Math.abs(year)}年` : `${year}年`) : (year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`);
  return `${format(timeRange.startYear)}${timeRange.endYear !== undefined ? `–${format(timeRange.endYear)}` : ""}`;
}
