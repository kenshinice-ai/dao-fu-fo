import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { formatEntityKind } from "../data/labels";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath } from "../routing";
import type { ContentQualityReport, ReadModelReviewQueue, ReviewCheckKind } from "@drf-museum/domain-schema";
import type { EntityKind, SearchItem, SourceIndexData, Tradition } from "../types";

type AuditMode = "blocking" | "warning" | "all";
type ReviewSubjectFilter = "all" | "entity" | "relation" | "audio";
type ReviewCheckFilter = "all" | ReviewCheckKind;

const RESEARCH_PAGE_SIZE = 60;
const reviewCheckKinds: ReviewCheckKind[] = ["schema", "fact", "tradition", "bilingual", "rights", "accessibility", "editorial"];
const researchEntityKinds: EntityKind[] = [
  "tradition", "figure", "text", "text_version", "passage", "concept", "school", "institution", "practice", "place", "event", "route", "museum_object",
];
const researchTraditions: Array<SearchItem["tradition"]> = ["daoism", "confucianism", "buddhism", "convergence"];
const reviewerRoles = [
  { id: "role:historical-reviewer", zh: "历史审核", en: "Historical reviewer" },
  { id: "role:tradition-reviewer", zh: "传统审核", en: "Tradition reviewer" },
  { id: "role:bilingual-editor", zh: "双语编辑", en: "Bilingual editor" },
  { id: "role:rights-editor", zh: "权利编辑", en: "Rights editor" },
  { id: "role:accessibility-editor", zh: "无障碍编辑", en: "Accessibility editor" },
  { id: "role:lead-curator", zh: "主策展人", en: "Lead curator" },
] as const;
type ReviewerRole = typeof reviewerRoles[number]["id"];

const evidenceCopy = {
  historical: { zh: "历史记录", en: "Historical record", detailZh: "文献、制度记录、地理和可核查年代。", detailEn: "Documents, institutions, geography and supportable dates." },
  traditional: { zh: "传统叙事", en: "Traditional account", detailZh: "经典、宗派和信众如何叙述人物与宇宙。", detailEn: "How texts, lineages and communities narrate figures and cosmos." },
  interpretation: { zh: "策展解释", en: "Curatorial interpretation", detailZh: "比较入口、翻译选择和仍待核对的研究判断。", detailEn: "Comparative entries, translation choices and open research questions." },
} as const;

function evidenceBucket(item: SearchItem): keyof typeof evidenceCopy {
  if (item.kind === "figure" || item.kind === "place") return "historical";
  if (item.kind === "passage" || item.kind === "text") return "traditional";
  return "interpretation";
}

export function ResearchPage() {
  const { locale } = useMuseumContext();
  const [params] = useSearchParams();
  const sourceFocus = params.get("source")?.trim() || undefined;
  const auditParam = params.get("audit");
  const auditMode: AuditMode = auditParam === "all" ? "all" : auditParam === "warning" ? "warning" : "blocking";
  const reviewerParam = params.get("reviewer")?.trim() || undefined;
  const reviewerFocus = isReviewerRole(reviewerParam) ? reviewerParam : undefined;
  const [entryQuery, setEntryQuery] = useState(() => params.get("q")?.trim() ?? "");
  const [entryKind, setEntryKind] = useState<EntityKind | "all">(() => {
    const value = params.get("entity")?.trim();
    return value && researchEntityKinds.includes(value as EntityKind) ? value as EntityKind : "all";
  });
  const [entryTradition, setEntryTradition] = useState<SearchItem["tradition"] | "all">(() => {
    const value = params.get("tradition")?.trim();
    return value && researchTraditions.includes(value as SearchItem["tradition"]) ? value as SearchItem["tradition"] : "all";
  });
  const [entryPage, setEntryPage] = useState(1);
  const loader = useCallback(async (signal: AbortSignal): Promise<ResearchData> => {
    const [search, sources, quality, reviewQueue] = await Promise.all([
      staticData.searchIndex(locale, signal),
      staticData.sourceIndex(locale, signal),
      staticData.qualityReport(signal),
      staticData.reviewQueue(signal),
    ]);
    return { search, sources, quality, reviewQueue };
  }, [locale]);
  const { data, error } = useStaticData(loader);
  const filteredEntries = useMemo(() => {
    const query = entryQuery.trim().toLocaleLowerCase();
    return (data?.search.items ?? []).filter((item) => {
      if (entryKind !== "all" && item.kind !== entryKind) return false;
      if (entryTradition !== "all" && item.tradition !== entryTradition) return false;
      if (!query) return true;
      return [item.title, item.context, item.slug, item.kind, item.tradition].some((value) => value.toLocaleLowerCase().includes(query));
    });
  }, [data, entryKind, entryQuery, entryTradition]);
  const entryPageCount = Math.max(1, Math.ceil(filteredEntries.length / RESEARCH_PAGE_SIZE));
  const visibleEntryItems = filteredEntries.slice((entryPage - 1) * RESEARCH_PAGE_SIZE, entryPage * RESEARCH_PAGE_SIZE);
  const filteredGrouped = useMemo(() => {
    const result = new Map<keyof typeof evidenceCopy, SearchItem[]>();
    for (const item of filteredEntries) {
      const key = evidenceBucket(item);
      result.set(key, [...(result.get(key) ?? []), item]);
    }
    return result;
  }, [filteredEntries]);
  const grouped = useMemo(() => {
    const result = new Map<keyof typeof evidenceCopy, SearchItem[]>();
    for (const item of visibleEntryItems) {
      const key = evidenceBucket(item);
      result.set(key, [...(result.get(key) ?? []), item]);
    }
    return result;
  }, [visibleEntryItems]);
  const visibleSources = useMemo(() => {
    if (!data) return [];
    if (!sourceFocus) return data.sources.items;
    return data.sources.items.filter((source) => source.id === sourceFocus);
  }, [data, sourceFocus]);

  useEffect(() => {
    if (!sourceFocus || !data) return;
    document.getElementById(sourceAnchor(sourceFocus))?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [data, sourceFocus]);

  useEffect(() => {
    if (entryPage > entryPageCount) setEntryPage(entryPageCount);
  }, [entryPage, entryPageCount]);

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  return (
    <section className="page-shell research-page">
      <header className="page-intro">
        <p className="eyebrow">Research / {locale === "zh-CN" ? "研究层" : "Research layer"}</p>
        <h1>{locale === "zh-CN" ? "让每个判断都能回到它的证据层" : "Return every claim to its evidence layer"}</h1>
        <p>{locale === "zh-CN" ? "研究层不是把所有内容写成论文，而是把来源、版本、时间声明、关系和不确定性公开给愿意继续追问的人。" : "The research layer is not a paper. It makes sources, versions, temporal claims, relations and uncertainty visible to anyone who wants to ask further questions."}</p>
      </header>

      <div className="research-layout">
        <div className="research-ledger">
          <section className="research-directory-controls" aria-labelledby="research-directory-title">
            <div className="research-directory-heading">
              <div>
                <p className="eyebrow">{locale === "zh-CN" ? "可检索目录" : "Searchable directory"}</p>
                <h2 id="research-directory-title">{locale === "zh-CN" ? "按证据层缩小研究范围" : "Narrow the research surface"}</h2>
              </div>
              <strong data-research-result-count>{filteredEntries.length}</strong>
            </div>
            <div className="research-directory-filter-grid">
              <label>
                {locale === "zh-CN" ? "搜索条目" : "Search entries"}
                <input
                  aria-label={locale === "zh-CN" ? "搜索研究条目" : "Search research entries"}
                  value={entryQuery}
                  onChange={(event) => { setEntryQuery(event.target.value); setEntryPage(1); }}
                  placeholder={locale === "zh-CN" ? "标题、上下文或 slug" : "Title, context or slug"}
                />
              </label>
              <label>
                {locale === "zh-CN" ? "实体类型" : "Entity type"}
                <select aria-label={locale === "zh-CN" ? "研究实体类型" : "Research entity type"} value={entryKind} onChange={(event) => { setEntryKind(event.target.value as EntityKind | "all"); setEntryPage(1); }}>
                  <option value="all">{locale === "zh-CN" ? "全部类型" : "All entity types"}</option>
                  {researchEntityKinds.map((kind) => <option key={kind} value={kind}>{formatEntityKind(kind, locale)}</option>)}
                </select>
              </label>
              <label>
                {locale === "zh-CN" ? "传统" : "Tradition"}
                <select aria-label={locale === "zh-CN" ? "研究传统" : "Research tradition"} value={entryTradition} onChange={(event) => { setEntryTradition(event.target.value as SearchItem["tradition"] | "all"); setEntryPage(1); }}>
                  <option value="all">{locale === "zh-CN" ? "全部传统" : "All traditions"}</option>
                  {researchTraditions.map((tradition) => <option key={tradition} value={tradition}>{formatTraditionLabel(tradition, locale)}</option>)}
                </select>
              </label>
              <button className="button button-secondary research-filter-reset" type="button" onClick={() => { setEntryQuery(""); setEntryKind("all"); setEntryTradition("all"); setEntryPage(1); }}>
                {locale === "zh-CN" ? "重置目录" : "Reset directory"}
              </button>
            </div>
            <p className="research-directory-summary" aria-live="polite">
              {locale === "zh-CN"
                ? `当前范围 ${filteredEntries.length} 项 · 显示第 ${filteredEntries.length === 0 ? 0 : (entryPage - 1) * RESEARCH_PAGE_SIZE + 1}–${Math.min(entryPage * RESEARCH_PAGE_SIZE, filteredEntries.length)} 项`
                : `${filteredEntries.length} entries in scope · showing ${filteredEntries.length === 0 ? 0 : (entryPage - 1) * RESEARCH_PAGE_SIZE + 1}–${Math.min(entryPage * RESEARCH_PAGE_SIZE, filteredEntries.length)}`}
            </p>
          </section>
          {Object.entries(evidenceCopy).map(([key, copy]) => {
            const bucket = key as keyof typeof evidenceCopy;
            const items = grouped.get(bucket) ?? [];
            const totalItems = filteredGrouped.get(bucket)?.length ?? 0;
            return (
              <section className="research-bucket" key={bucket}>
                <div className="research-bucket-heading">
                  <span>{bucket === "historical" ? "01" : bucket === "traditional" ? "02" : "03"}</span>
                  <div>
                    <p className="eyebrow">{locale === "zh-CN" ? copy.zh : copy.en}</p>
                    <p>{locale === "zh-CN" ? copy.detailZh : copy.detailEn}</p>
                  </div>
                  <strong>{totalItems}</strong>
                </div>
                <ul>
                  {items.map((item) => (
                    <li key={`${item.kind}:${item.slug}`}>
                      <TraditionMark tradition={item.tradition} size="sm" />
                      <div>
                        <span>{formatEntityKind(item.kind, locale)}</span>
                        <Link to={entityPath(item.kind as EntityKind, item.slug, locale)}>{item.title}</Link>
                        <p>{item.context}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {entryPageCount > 1 ? (
            <ResearchPagination currentPage={entryPage} pageCount={entryPageCount} locale={locale} onPage={setEntryPage} label={locale === "zh-CN" ? "研究条目分页" : "Research entry pages"} />
          ) : null}

          <section className="research-sources" aria-labelledby="source-ledger-title">
            <div className="research-sources-heading">
              <div>
                <p className="eyebrow">{locale === "zh-CN" ? "来源台账" : "Source ledger"}</p>
                <h2 id="source-ledger-title">
                  {sourceFocus
                    ? (locale === "zh-CN" ? `聚焦来源：${visibleSources[0]?.title ?? sourceFocus}` : `Focused source: ${visibleSources[0]?.title ?? sourceFocus}`)
                    : (locale === "zh-CN" ? "从条目回到来源与定位" : "Return from an entry to its source and locator")}
                </h2>
                <p>{locale === "zh-CN" ? "来源等级、定位粒度、权利状态和被引用条目数量都保持可见；“主题”定位不会伪装成精确引文。" : "Evidence grade, locator granularity, rights status and entity coverage stay visible; a topic locator is never presented as a precise citation."}</p>
              </div>
              {sourceFocus ? <Link className="source-ledger-clear" to={`/research?lang=${encodeURIComponent(locale)}`}>{locale === "zh-CN" ? "显示全部来源" : "Show all sources"}</Link> : null}
            </div>
            {visibleSources.length > 0 ? (
              <div className="source-ledger-list">
                {visibleSources.map((source) => (
                  <article className="source-ledger-card" id={sourceAnchor(source.id)} key={source.id}>
                    <div className="source-ledger-card-heading">
                      <span className={`source-grade grade-${source.evidenceGrade}`}>{source.evidenceGrade}</span>
                      <div>
                        <h3>{source.title}</h3>
                        <p>{source.role}</p>
                      </div>
                      <strong>{source.entityCount}</strong>
                    </div>
                    <dl className="source-ledger-meta">
                      <div><dt>{locale === "zh-CN" ? "定位" : "Locator"}</dt><dd>{source.locator}</dd></div>
                      <div><dt>{locale === "zh-CN" ? "粒度" : "Level"}</dt><dd>{source.locatorLevel}</dd></div>
                      <div><dt>{locale === "zh-CN" ? "引用状态" : "Citation"}</dt><dd>{source.citationStatus}</dd></div>
                      <div><dt>{locale === "zh-CN" ? "权利" : "Rights"}</dt><dd>{source.rightsStatus}</dd></div>
                    </dl>
                    {source.url ? <a className="source-ledger-link" href={source.url} rel="noreferrer" target="_blank">{locale === "zh-CN" ? "打开外部来源" : "Open external source"} ↗</a> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="research-source-empty">{locale === "zh-CN" ? "没有找到这个来源。" : "No source was found for this identifier."}</p>
            )}
          </section>

          <ResearchGovernance auditMode={auditMode} locale={locale} quality={data.quality} reviewerFocus={reviewerFocus} reviewQueue={data.reviewQueue} />
        </div>

        <aside className="research-aside">
          <p className="eyebrow">{locale === "zh-CN" ? "当前版本说明" : "Current release note"}</p>
          <h2>{locale === "zh-CN" ? "原型索引，不是最终学术数据库" : "Prototype index, not a final scholarly database"}</h2>
          <p>{locale === "zh-CN" ? "当前公开原型展示的是 first-viewable prototype 的索引。完整 Alpha source 已经进入独立 compiler，但仍处于 preview，必须经过来源、双语、版权和 publishable 门禁后才会进入公共静态发布。" : "The public prototype currently shows the first-viewable prototype index. The fuller Alpha source is in a separate compiler pipeline, still marked preview, and must pass source, bilingual, rights and publishable gates before public static release."}</p>
          <dl>
            <div><dt>{locale === "zh-CN" ? "可追溯入口" : "Traceable entries"}</dt><dd>{locale === "zh-CN" ? "文本 → 版本 → 段落" : "Text → version → passage"}</dd></div>
            <div><dt>{locale === "zh-CN" ? "来源数量" : "Sources"}</dt><dd>{data.sources.items.length}</dd></div>
            <div><dt>{locale === "zh-CN" ? "地理边界" : "Geographic boundary"}</dt><dd>{locale === "zh-CN" ? "现实地图 ≠ 神圣地理" : "Real map ≠ sacred geography"}</dd></div>
            <div><dt>{locale === "zh-CN" ? "发布状态" : "Publication state"}</dt><dd>preview → publishable</dd></div>
          </dl>
          <Link className="button button-secondary" to={`/methodology?lang=${encodeURIComponent(locale)}`}>
            {locale === "zh-CN" ? "阅读方法说明" : "Read the methodology"}
          </Link>
        </aside>
      </div>
    </section>
  );
}

interface ResearchData {
  search: { locale: "zh-CN" | "en"; items: SearchItem[] };
  sources: SourceIndexData;
  quality: ContentQualityReport;
  reviewQueue: ReadModelReviewQueue;
}

function ResearchGovernance({
  auditMode,
  locale,
  quality,
  reviewerFocus,
  reviewQueue,
}: {
  auditMode: AuditMode;
  locale: "zh-CN" | "en";
  quality: ContentQualityReport;
  reviewerFocus?: ReviewerRole;
  reviewQueue: ReadModelReviewQueue;
}) {
  const [reviewQuery, setReviewQuery] = useState("");
  const [reviewSubject, setReviewSubject] = useState<ReviewSubjectFilter>("all");
  const [reviewCheck, setReviewCheck] = useState<ReviewCheckFilter>("all");
  const [reviewPage, setReviewPage] = useState(1);
  const reviewerReviews = reviewerFocus
    ? reviewQueue.items.filter((item) => item.checks.some((check) => check.reviewer === reviewerFocus))
    : reviewQueue.items;
  const statusReviews = auditMode === "all"
    ? reviewerReviews
    : auditMode === "warning"
      ? reviewerReviews.filter((item) => !item.blocking)
      : reviewerReviews.filter((item) => item.blocking);
  const filteredReviews = statusReviews.filter((item) => {
    if (reviewSubject !== "all" && item.subjectKind !== reviewSubject) return false;
    if (reviewCheck !== "all" && ![...item.missingChecks, ...item.failedChecks].includes(reviewCheck)) return false;
    const query = reviewQuery.trim().toLocaleLowerCase();
    if (!query) return true;
    return [item.subjectKey, item.subjectKind, item.publicationState, item.reviewStatus, ...item.missingChecks, ...item.failedChecks]
      .some((value) => value.toLocaleLowerCase().includes(query));
  });
  const reviewPageCount = Math.max(1, Math.ceil(filteredReviews.length / RESEARCH_PAGE_SIZE));
  const visibleReviews = filteredReviews.slice((reviewPage - 1) * RESEARCH_PAGE_SIZE, reviewPage * RESEARCH_PAGE_SIZE);
  const blockingReviews = reviewQueue.items.filter((item) => item.blocking).length;
  const blockerBreakdown = countLabels(quality.publicBlockers.map((item) => item.code));
  const checkBreakdown = countLabels(reviewQueue.items.flatMap((item) => item.missingChecks));
  const path = (mode: AuditMode, reviewer: ReviewerRole | null = reviewerFocus ?? null) => {
    const query = new URLSearchParams({ lang: locale, audit: mode });
    if (reviewer) query.set("reviewer", reviewer);
    return `/research?${query.toString()}`;
  };
  const copy = locale === "zh-CN";

  useEffect(() => setReviewPage(1), [auditMode, reviewerFocus, reviewCheck, reviewQuery, reviewSubject]);
  useEffect(() => {
    if (reviewPage > reviewPageCount) setReviewPage(reviewPageCount);
  }, [reviewPage, reviewPageCount]);

  return (
    <section className="research-governance" aria-labelledby="research-quality-title">
      <header className="research-governance-heading">
        <div>
          <p className="eyebrow">{copy ? "质量与审核" : "Quality & review"}</p>
          <h2 id="research-quality-title">{copy ? "公开之前，先看哪些判断还没有通过" : "See what still blocks publication"}</h2>
          <p>{copy ? "这是一份只读的发布审计视图：它显示 compiler 发现的阻塞项，不把 preview 内容伪装成已经审核完成的 Public 内容。" : "This is a read-only release audit: it shows compiler-detected blockers without presenting preview content as publishable Public content."}</p>
        </div>
        <div className="research-governance-status" aria-label={copy ? "当前发布状态" : "Current publication status"}>
          <span>{quality.visibility}</span>
          <strong>{quality.publicBlockers.length}</strong>
          <small>{copy ? "质量报告阻塞项" : "quality report blockers"}</small>
        </div>
      </header>

      <div className="research-quality-grid">
        <QualityMetric label={copy ? "实体" : "Entities"} value={quality.counts.entities} note={copy ? "当前 Alpha 条目" : "Current Alpha entries"} />
        <QualityMetric label={copy ? "关系" : "Relations"} value={quality.counts.relations} note={copy ? "人物、事件、空间与后世语境" : "Figures, events, spaces and reception"} />
        <QualityMetric label={copy ? "来源" : "Sources"} value={quality.counts.sources} note={copy ? "可回到来源台账" : "Traceable in the source ledger"} />
        <QualityMetric label={copy ? "审核队列" : "Review queue"} value={blockingReviews} note={copy ? `共 ${reviewQueue.items.length} 个审核 subject` : `${reviewQueue.items.length} total review subjects`} />
      </div>

      <div className="research-audit-columns">
        <div className="research-audit-breakdown">
          <div className="research-audit-heading">
            <div>
              <p className="eyebrow">{copy ? "阻塞分类" : "Blocker categories"}</p>
              <h3>{copy ? "为什么还不能发布" : "Why it cannot ship yet"}</h3>
            </div>
            <span>{quality.warnings.length} {copy ? "条警告" : "warnings"}</span>
          </div>
          <ul>
            {blockerBreakdown.map(([label, count]) => (
              <li key={label}><span>{formatAuditLabel(label, locale)}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </div>
        <div className="research-audit-breakdown">
          <div className="research-audit-heading">
            <div>
              <p className="eyebrow">{copy ? "缺少的审核项" : "Missing checks"}</p>
              <h3>{copy ? "还需要谁来判断" : "What still needs a decision"}</h3>
            </div>
          </div>
          <ul>
            {checkBreakdown.map(([label, count]) => (
              <li key={label}><span>{formatAuditLabel(label, locale)}</span><strong>{count}</strong></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="research-review-heading">
        <div>
          <p className="eyebrow">{copy ? "逐项审核" : "Review subjects"}</p>
          <h3>{copy ? "审核队列" : "Review queue"}</h3>
          <p data-research-review-range>{copy ? `当前范围 ${filteredReviews.length} 项 · 本页显示 ${visibleReviews.length} 项${reviewerFocus ? ` · ${reviewerLabel(reviewerFocus, locale)}` : ""}；所有状态保持只读。` : `${filteredReviews.length} subjects in scope · ${visibleReviews.length} on this page${reviewerFocus ? ` · ${reviewerLabel(reviewerFocus, locale)}` : ""}; all statuses are read-only.`}</p>
        </div>
        <div className="research-review-filter-stack">
          <nav className="research-audit-filters" aria-label={copy ? "审核状态筛选" : "Review status filters"}>
            <Link className={auditMode === "blocking" ? "is-active" : ""} to={path("blocking")}>{copy ? "只看阻塞项" : "Blocking only"}</Link>
            <Link className={auditMode === "warning" ? "is-active" : ""} to={path("warning")}>{copy ? "只看警告" : "Warnings"}</Link>
            <Link className={auditMode === "all" ? "is-active" : ""} to={path("all")}>{copy ? "显示全部" : "Show all"}</Link>
          </nav>
          <nav className="research-audit-filters" aria-label={copy ? "审核角色筛选" : "Reviewer role filters"}>
            <Link className={!reviewerFocus ? "is-active" : ""} to={path(auditMode, null)}>{copy ? "全部角色" : "All roles"}</Link>
            {reviewerRoles.map((role) => (
              <Link className={reviewerFocus === role.id ? "is-active" : ""} key={role.id} to={path(auditMode, role.id)}>
                {reviewerLabel(role.id, locale)} ({reviewerCount(reviewQueue, role.id)})
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="research-review-controls">
        <label>
          {copy ? "搜索审核 subject" : "Search review subjects"}
          <input aria-label={copy ? "搜索审核 subject" : "Search review subjects"} value={reviewQuery} onChange={(event) => setReviewQuery(event.target.value)} placeholder={copy ? "subject key、状态或审核项" : "Subject key, status or check"} />
        </label>
        <label>
          {copy ? "审核类型" : "Blocker type"}
          <select aria-label={copy ? "审核类型" : "Blocker type"} value={reviewCheck} onChange={(event) => setReviewCheck(event.target.value as ReviewCheckFilter)}>
            <option value="all">{copy ? "全部审核项" : "All checks"}</option>
            {reviewCheckKinds.map((kind) => <option key={kind} value={kind}>{formatAuditLabel(kind, locale)}</option>)}
          </select>
        </label>
        <label>
          {copy ? "subject 类型" : "Subject type"}
          <select aria-label={copy ? "审核 subject 类型" : "Review subject type"} value={reviewSubject} onChange={(event) => setReviewSubject(event.target.value as ReviewSubjectFilter)}>
            <option value="all">{copy ? "全部类型" : "All subject types"}</option>
            <option value="entity">{formatAuditLabel("entity", locale)}</option>
            <option value="relation">{formatAuditLabel("relation", locale)}</option>
            <option value="audio">{formatAuditLabel("audio", locale)}</option>
          </select>
        </label>
      </div>

      <ul className="research-review-queue">
        {visibleReviews.map((item) => {
          const target = reviewEntityPath(item.subjectKind, item.subjectKey, locale);
          return (
            <li className={item.blocking ? "is-blocking" : ""} key={`${item.subjectKind}:${item.subjectKey}`}>
              <div className="research-review-subject">
                <span className="research-review-kind">{formatAuditLabel(item.subjectKind, locale)}</span>
                {target ? <Link to={target}>{item.subjectKey}</Link> : <strong>{item.subjectKey}</strong>}
                <span className="research-review-status">{formatAuditLabel(item.reviewStatus, locale)} · {item.publicationState}</span>
              </div>
              <div className="research-review-checks">
                {item.missingChecks.length > 0 ? <span>{copy ? "缺少" : "Missing"}: {item.missingChecks.map((check) => formatAuditLabel(check, locale)).join(copy ? "、" : ", ")}</span> : null}
                {item.failedChecks.length > 0 ? <span className="is-failed">{copy ? "失败" : "Failed"}: {item.failedChecks.map((check) => formatAuditLabel(check, locale)).join(copy ? "、" : ", ")}</span> : null}
                {item.missingChecks.length === 0 && item.failedChecks.length === 0 ? <span>{copy ? "已完成当前队列要求" : "Current queue requirements complete"}</span> : null}
              </div>
              {item.checks.length > 0 ? (
                <div className="research-review-checks" aria-label={copy ? "审核分派" : "Review assignments"}>
                  {item.checks.map((check) => (
                    <span key={check.id} title={check.reviewer}>
                      {formatAuditLabel(check.checkKind, locale)} · {formatAuditLabel(check.status, locale)} · {check.reviewer}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {reviewPageCount > 1 ? (
        <ResearchPagination currentPage={reviewPage} pageCount={reviewPageCount} locale={locale} onPage={setReviewPage} label={copy ? "审核队列分页" : "Review queue pages"} />
      ) : null}
    </section>
  );
}

function ResearchPagination({
  currentPage,
  pageCount,
  locale,
  onPage,
  label,
}: {
  currentPage: number;
  pageCount: number;
  locale: "zh-CN" | "en";
  onPage: (page: number) => void;
  label: string;
}) {
  return (
    <nav className="research-pagination" aria-label={label}>
      <button type="button" disabled={currentPage <= 1} onClick={() => onPage(Math.max(1, currentPage - 1))}>{locale === "zh-CN" ? "上一页" : "Previous"}</button>
      <span>{locale === "zh-CN" ? `第 ${currentPage} / ${pageCount} 页` : `Page ${currentPage} of ${pageCount}`}</span>
      <button type="button" disabled={currentPage >= pageCount} onClick={() => onPage(Math.min(pageCount, currentPage + 1))}>{locale === "zh-CN" ? "下一页" : "Next"}</button>
    </nav>
  );
}

function QualityMetric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="research-quality-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function countLabels(values: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function isReviewerRole(value: string | undefined): value is ReviewerRole {
  return Boolean(value && reviewerRoles.some((role) => role.id === value));
}

function reviewerLabel(value: ReviewerRole, locale: "zh-CN" | "en"): string {
  const role = reviewerRoles.find((candidate) => candidate.id === value);
  return role?.[locale === "zh-CN" ? "zh" : "en"] ?? value;
}

function reviewerCount(reviewQueue: ReadModelReviewQueue, reviewer: ReviewerRole): number {
  return reviewQueue.items.filter((item) => item.checks.some((check) => check.reviewer === reviewer)).length;
}

function formatTraditionLabel(value: Tradition | "convergence", locale: "zh-CN" | "en"): string {
  const labels: Record<Tradition | "convergence", { zh: string; en: string }> = {
    daoism: { zh: "道家 / 道教", en: "Daoism" },
    confucianism: { zh: "儒家", en: "Confucianism" },
    buddhism: { zh: "佛教", en: "Buddhism" },
    convergence: { zh: "交汇", en: "Convergence" },
  };
  return labels[value][locale === "zh-CN" ? "zh" : "en"];
}

function formatAuditLabel(value: string, locale: "zh-CN" | "en"): string {
  const labels: Record<string, { zh: string; en: string }> = {
    NOT_PUBLIC: { zh: "尚未公开", en: "Not public" },
    NOT_PUBLISHABLE: { zh: "尚未达到可发布状态", en: "Not publishable" },
    NO_VERIFIED_LOCATOR: { zh: "缺少已验证定位", en: "No verified locator" },
    REVIEW_CHECKS_INCOMPLETE: { zh: "审核项未完成", en: "Review checks incomplete" },
    SOURCE_RIGHTS_BLOCKED: { zh: "来源权利受限", en: "Source rights blocked" },
    OBJECT_PLACEHOLDER: { zh: "器物仍为占位记录", en: "Object placeholder" },
    SOURCE_LOCATOR_DRAFT: { zh: "来源定位仍为草稿", en: "Source locator draft" },
    entity: { zh: "实体", en: "Entity" },
    relation: { zh: "关系", en: "Relation" },
    audio: { zh: "音频", en: "Audio" },
    draft: { zh: "草稿", en: "Draft" },
    bilingual_reviewed: { zh: "已完成双语检查", en: "Bilingual reviewed" },
    fact_checked: { zh: "已完成事实检查", en: "Fact checked" },
    tradition_reviewed: { zh: "已完成传统检查", en: "Tradition reviewed" },
    rights_cleared: { zh: "已完成权利检查", en: "Rights cleared" },
    publishable: { zh: "可发布", en: "Publishable" },
    preview: { zh: "Preview", en: "Preview" },
    public: { zh: "Public", en: "Public" },
    schema: { zh: "结构", en: "Schema" },
    fact: { zh: "事实", en: "Fact" },
    tradition: { zh: "传统归属", en: "Tradition" },
    bilingual: { zh: "双语", en: "Bilingual" },
    rights: { zh: "权利", en: "Rights" },
    accessibility: { zh: "无障碍", en: "Accessibility" },
    editorial: { zh: "编辑", en: "Editorial" },
    pending: { zh: "待审核", en: "Pending" },
    pre_reviewed: { zh: "预审", en: "Pre-reviewed" },
    passed: { zh: "已通过", en: "Passed" },
    waived: { zh: "已豁免", en: "Waived" },
    failed: { zh: "未通过", en: "Failed" },
  };
  return labels[value]?.[locale === "zh-CN" ? "zh" : "en"] ?? value.replaceAll("_", " ");
}

function reviewEntityPath(subjectKind: "entity" | "relation" | "audio", subjectKey: string, locale: "zh-CN" | "en"): string | undefined {
  if (subjectKind !== "entity") return undefined;
  const separator = subjectKey.indexOf(":");
  if (separator <= 0) return undefined;
  const kind = subjectKey.slice(0, separator) as EntityKind;
  const slug = subjectKey.slice(separator + 1);
  const entityKinds: EntityKind[] = ["tradition", "figure", "text", "text_version", "passage", "concept", "school", "institution", "practice", "place", "event", "route", "museum_object"];
  return entityKinds.includes(kind) && slug ? entityPath(kind, slug, locale) : undefined;
}

function sourceAnchor(id: string): string {
  return `source-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
