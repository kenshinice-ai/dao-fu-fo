import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { Icon } from "../components/Icon";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath, withLang } from "../routing";

export function HomePage() {
  const { locale } = useMuseumContext();
  const loader = useCallback((signal: AbortSignal) => staticData.overview(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">{data.eyebrow}</p>
          <h1>{data.heroTitle}</h1>
          <p className="hero-lead">{data.heroLead}</p>
          <div className="hero-actions">
            <Link className="button button-primary" to={withLang(`/museum/${data.exhibition.slug}`, locale)}>
              {data.primaryAction}
              <Icon name="arrow" />
            </Link>
            <Link className="button button-secondary" to={withLang("/explore", locale)}>
              {data.secondaryAction}
            </Link>
          </div>
          <div className="hero-index" aria-label={locale === "zh-CN" ? "当前展览信息" : "Current exhibition details"}>
            <span>01</span>
            <strong>{data.exhibition.title}</strong>
            <small>{data.exhibition.sections} / {data.exhibition.minutes} min</small>
          </div>
        </div>

        <div className="civilisation-rivers" aria-label={locale === "zh-CN" ? "道儒佛三条文明河流" : "Three civilisational currents"}>
          <svg viewBox="0 0 620 760" role="img">
            <title>{locale === "zh-CN" ? "道儒佛在历史中相遇的抽象图" : "Abstract diagram of three traditions meeting through history"}</title>
            <defs>
              <linearGradient id="paperGlow" x1="0" x2="1">
                <stop offset="0" stopColor="#fbf8f0" />
                <stop offset="1" stopColor="#e8e0d0" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="620" height="760" rx="28" fill="url(#paperGlow)" />
            <path className="river river-daoist" d="M90 30C140 155 360 130 326 275S154 410 228 542 465 611 530 730" />
            <path className="river river-confucian" d="M310 20C260 158 118 203 196 330s286 97 229 240-179 112-213 176" />
            <path className="river river-buddhist" d="M530 24C500 160 394 206 446 332s-30 220-200 405" />
            <circle cx="326" cy="275" r="74" className="river-confluence" />
            <text x="326" y="268" textAnchor="middle">{locale === "zh-CN" ? "长安" : "Chang'an"}</text>
            <text x="326" y="298" textAnchor="middle" className="river-year">650</text>
            <g className="river-label river-label-daoist"><circle cx="96" cy="72" r="24" /><text x="96" y="80" textAnchor="middle">道</text></g>
            <g className="river-label river-label-confucian"><circle cx="310" cy="62" r="24" /><text x="310" y="70" textAnchor="middle">儒</text></g>
            <g className="river-label river-label-buddhist"><circle cx="524" cy="68" r="24" /><text x="524" y="76" textAnchor="middle">佛</text></g>
          </svg>
          <div className="rivers-caption">
            <span>{locale === "zh-CN" ? "三条传统，不是三座孤岛" : "Three traditions, not three islands"}</span>
            <small>{locale === "zh-CN" ? "时间 · 地理 · 经典 · 人物" : "Time · place · texts · figures"}</small>
          </div>
        </div>
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
