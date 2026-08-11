import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { formatConfidence, formatEvidence, formatRelationType } from "../data/labels";
import { entityPath, withLang } from "../routing";

const DEFAULT_READING = "three-traditions-passage-reading";

export function TextReadingPage() {
  const { locale } = useMuseumContext();
  const [searchParams] = useSearchParams();
  const readingSlug = searchParams.get("set") || DEFAULT_READING;
  const loader = useCallback((signal: AbortSignal) => staticData.textReading(readingSlug, locale, signal), [readingSlug, locale]);
  const { data, error } = useStaticData(loader);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  const sameTextVersions = data.readingMode === "same_text_versions";
  const reviewCopy = locale === "zh-CN" ? "审核证据" : "Review evidence";
  const blockingCopy = locale === "zh-CN" ? "仍阻塞" : "blocking";
  const completeCopy = locale === "zh-CN" ? "已完成" : "complete";

  return (
    <article className="text-reading-page">
      <header className="text-reading-hero page-shell">
        <div>
          <p className="eyebrow">Read / {locale === "zh-CN" ? "原典对读" : "Textual reading"}</p>
          <h1>{data.title}</h1>
          <p className="text-reading-question">{data.question}</p>
          <p className="text-reading-disclaimer">{data.disclaimer}</p>
          <p className="text-reading-mode" data-reading-mode={data.readingMode}>
            {sameTextVersions
              ? (locale === "zh-CN" ? "同一文本 · 多版本/译文对读" : "One text · multiple versions/translations")
              : (locale === "zh-CN" ? "跨文本段落对读" : "Cross-text passage reading")}
          </p>
        </div>
        <aside className="text-reading-legend">
          <p className="eyebrow">{locale === "zh-CN" ? "阅读边界" : "Reading boundary"}</p>
          <p>{locale === "zh-CN" ? "原文、版本、段落、归属和解释保持分层；来源入口随每一栏保留。" : "Wording, version, passage, attribution and interpretation remain layered; source entries stay with each column."}</p>
        </aside>
      </header>

      <section className="text-reading-columns page-shell" aria-labelledby="text-reading-columns-title">
        <div className="text-reading-section-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "三栏阅读" : "Three columns"}</p>
          <h2 id="text-reading-columns-title">{sameTextVersions
            ? (locale === "zh-CN" ? "同一经文的不同语言版本" : "Different language versions of one discourse")
            : (locale === "zh-CN" ? "先从段落回到文本与版本" : "Return from each passage to its text and version")}</h2>
          <p>{sameTextVersions
            ? (locale === "zh-CN" ? "两栏共享同一 text，但各自回到明确的 text version、定位和译者边界。" : "Both columns share one text while returning to explicit text versions, locators and translator boundaries.")
            : (locale === "zh-CN" ? "每一栏都是一个 passage 入口；同一套结构也可以承载同一文本的不同版本。" : "Each column is a passage entry; the same structure can also carry different versions of one text.")}</p>
        </div>
        <div className="text-reading-column-grid">
          {data.readings.map((reading) => (
            <article className="text-reading-card" key={reading.key}>
              <div className="text-reading-card-topline">
                <span>{reading.tradition}</span>
                <span>{formatEvidence(reading.evidence, locale)}</span>
              </div>
              <h3><Link to={entityPath("passage", reading.slug, locale)}>{reading.title}</Link></h3>
              {reading.subtitle ? <p className="text-reading-subtitle">{reading.subtitle}</p> : null}
              <dl className="text-reading-card-facts">
                <div><dt>{locale === "zh-CN" ? "文本" : "Text"}</dt><dd><Link to={entityPath("text", reading.text.slug, locale)}>{reading.text.title}</Link></dd></div>
                <div><dt>{locale === "zh-CN" ? "版本" : "Version"}</dt><dd><Link to={entityPath("text_version", reading.version.slug, locale)}>{reading.version.title}</Link></dd></div>
                <div><dt>{locale === "zh-CN" ? "定位" : "Locator"}</dt><dd>{reading.passage.locatorNormalised}</dd></div>
                <div><dt>{locale === "zh-CN" ? "文本语言" : "Language"}</dt><dd>{reading.version.languageCode}</dd></div>
              </dl>
              <blockquote className="text-reading-quote" lang={reading.version.languageCode === "pli" ? "pi" : "zh-Hans"}>{reading.passage.originalText}</blockquote>
              <p className="text-reading-punctuation">{reading.passage.punctuatedText}</p>
              <div className="text-reading-card-actions">
                <Link to={entityPath("passage", reading.slug, locale)}>{locale === "zh-CN" ? "打开段落条目" : "Open passage"}</Link>
                {reading.sourceIds.map((sourceId) => <Link key={sourceId} to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}
              </div>
              {reading.passage.variantReadings.length > 0 ? (
                <section className="text-reading-variants" aria-labelledby={`text-reading-variants-${reading.key}`}>
                  <p className="eyebrow" id={`text-reading-variants-${reading.key}`}>{locale === "zh-CN" ? "版本/译文差异" : "Version / translation note"}</p>
                  <ul>
                    {reading.passage.variantReadings.map((variant) => <li key={variant.id}>
                      <strong>{variant.label}: {variant.form}</strong>
                      <span>{variant.note}</span>
                      <small>{variant.status} · {variant.sourceIds.map((sourceId) => <Link key={sourceId} to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}</small>
                    </li>)}
                  </ul>
                </section>
              ) : null}
              {reading.reviewEvidence.length > 0 ? (
                <details className="text-reading-review">
                  <summary>{reviewCopy} · {reading.reviewEvidence.filter((item) => !item.blocking).length}/{reading.reviewEvidence.length} {completeCopy}; {reading.reviewEvidence.filter((item) => item.blocking).length} {blockingCopy}</summary>
                  <ul>
                    {reading.reviewEvidence.map((evidence) => <li key={`${evidence.subjectKind}:${evidence.subjectKey}`}>
                      <strong>{evidence.subjectKey}</strong>
                      <span>{evidence.completedChecks.length}/{evidence.requiredChecks.length} {completeCopy} · {evidence.reviewStatus}</span>
                      {evidence.checks.length > 0 ? (
                        <ul className="text-reading-review-checks">
                          {evidence.checks.map((check) => (
                            <li key={check.id}>
                              <span>{formatReviewCheck(check, locale)} · {check.reviewer}</span>
                              {check.note ? <small>{check.note}</small> : null}
                            </li>
                          ))}
                        </ul>
                      ) : <small>{locale === "zh-CN" ? "尚无 reviewer record" : "No reviewer record yet"}</small>}
                    </li>)}
                  </ul>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="text-reading-matrix page-shell" aria-labelledby="text-reading-matrix-title">
        <div className="text-reading-section-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "七个文本维度" : "Seven textual dimensions"}</p>
          <h2 id="text-reading-matrix-title">{locale === "zh-CN" ? "同样的阅读框架，不同的证据内容" : "One reading frame, different evidence"}</h2>
          <p>{locale === "zh-CN" ? "维度由 source of truth 配置，单元格由文本、版本、段落、关系和来源共同派生。" : "The dimensions come from source-of-truth configuration; cells are derived from texts, versions, passages, relations and sources."}</p>
        </div>
        <div className="text-reading-axis-list">
          {data.axes.map((axis) => (
            <section className="text-reading-axis" key={axis.id} aria-labelledby={`text-reading-axis-${axis.id}`}>
              <div className="text-reading-axis-heading">
                <div>
                  <p className="eyebrow">{axis.id}</p>
                  <h3 id={`text-reading-axis-${axis.id}`}>{axis.label}</h3>
                </div>
                <p>{axis.description}</p>
              </div>
              <div className="text-reading-axis-grid">
                {axis.cells.map((cell) => {
                  const reading = data.readings.find((candidate) => candidate.key === cell.passageKey);
                  if (!reading) return null;
                  return (
                    <article className={`text-reading-cell status-${cell.status}`} key={cell.passageKey}>
                      <h4><Link to={entityPath("passage", reading.slug, locale)}>{reading.title}</Link></h4>
                      <strong>{cell.value}</strong>
                      {cell.details.length > 0 ? <ul>{cell.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
                      <div className="text-reading-cell-meta">
                        <span>{cell.status === "not_recorded" ? (locale === "zh-CN" ? "当前模型未记录" : "Not recorded in this model") : formatEvidence(cell.evidenceLayer, locale)}</span>
                        {cell.confidence ? <span>{formatConfidence(cell.confidence, locale)}</span> : null}
                        <span>{reviewCopy}: {cell.reviewEvidence.filter((item) => !item.blocking).length}/{cell.reviewEvidence.length} {completeCopy}</span>
                      </div>
                      {cell.sourceIds.length > 0 ? <div className="text-reading-cell-sources">{cell.sourceIds.map((sourceId) => <Link key={sourceId} to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}</div> : null}
                      {cell.reviewEvidence.length > 0 ? (
                        <details className="text-reading-cell-review">
                          <summary>{reviewCopy}</summary>
                          <ul>
                            {cell.reviewEvidence.map((evidence) => <li key={`${evidence.subjectKind}:${evidence.subjectKey}`}>
                              <strong>{evidence.subjectKey}</strong>
                              <span>{evidence.completedChecks.length}/{evidence.requiredChecks.length} {completeCopy}</span>
                              {evidence.checks.length > 0 ? <small>{evidence.checks.map((check) => `${formatReviewCheck(check, locale)} · ${check.reviewer}`).join(" · ")}</small> : null}
                            </li>)}
                          </ul>
                        </details>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="text-reading-context page-shell" aria-labelledby="text-reading-context-title">
        <div className="text-reading-section-heading">
          <p className="eyebrow">{locale === "zh-CN" ? "关系与传述" : "Relations and transmission"}</p>
          <h2 id="text-reading-context-title">{locale === "zh-CN" ? "段落不是脱离网络的名句" : "A passage is not a context-free quote"}</h2>
          <p>{locale === "zh-CN" ? "这里显示 passage 与文本、版本、人物之间已有的结构化关系；它们不是把三段文字强行合并的结论。" : "These are the structured links among passages, texts, versions and figures; they do not merge the three passages into one conclusion."}</p>
        </div>
        {data.contextRelations.length > 0 ? (
          <ul className="text-reading-context-list">
            {data.contextRelations.map((relation) => <li key={relation.id}><strong>{relation.label}</strong><span>{relation.summary}</span><small>{formatRelationType(relation.relationType, locale)} · {formatConfidence(relation.confidence, locale)} · {formatEvidence(relation.evidenceLayer, locale)}</small><div>{relation.sourceIds.map((sourceId) => <Link key={sourceId} to={`/research?source=${encodeURIComponent(sourceId)}&lang=${encodeURIComponent(locale)}`}>{sourceId}</Link>)}</div></li>)}
          </ul>
        ) : <p className="text-reading-empty">{locale === "zh-CN" ? "当前对读集没有额外关系记录。" : "No additional structured relations are recorded for this reading set."}</p>}
      </section>

      <footer className="comparison-footer page-shell">
        <Link className="button button-secondary" to={withLang("/compare?set=cross-era-figures", locale)}>{locale === "zh-CN" ? "回到人物比较" : "Return to figure comparison"}</Link>
        <Link className="button button-secondary" to={withLang("/research?audit=blocking", locale)}>{locale === "zh-CN" ? "回到来源与审核" : "Return to sources and review"}</Link>
      </footer>
    </article>
  );
}

function formatReviewCheck(
  check: { checkKind: string; status: string },
  locale: "zh-CN" | "en",
): string {
  const labels: Record<string, { zh: string; en: string }> = {
    schema: { zh: "结构", en: "Schema" },
    fact: { zh: "事实", en: "Fact" },
    tradition: { zh: "传统", en: "Tradition" },
    bilingual: { zh: "双语", en: "Bilingual" },
    rights: { zh: "权利", en: "Rights" },
    accessibility: { zh: "无障碍", en: "Accessibility" },
    editorial: { zh: "策展", en: "Editorial" },
  };
  const status: Record<string, { zh: string; en: string }> = {
    pending: { zh: "待审核", en: "pending" },
    pre_reviewed: { zh: "已预审", en: "pre-reviewed" },
    passed: { zh: "已通过", en: "passed" },
    failed: { zh: "未通过", en: "failed" },
    waived: { zh: "已豁免", en: "waived" },
  };
  const label = labels[check.checkKind]?.[locale === "zh-CN" ? "zh" : "en"] ?? check.checkKind;
  const state = status[check.status]?.[locale === "zh-CN" ? "zh" : "en"] ?? check.status;
  return `${label}: ${state}`;
}
