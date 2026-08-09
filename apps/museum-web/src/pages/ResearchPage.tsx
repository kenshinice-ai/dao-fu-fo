import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath } from "../routing";
import type { EntityKind, SearchItem } from "../types";

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
  const loader = useCallback((signal: AbortSignal) => staticData.searchIndex(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  const grouped = useMemo(() => {
    const result = new Map<keyof typeof evidenceCopy, SearchItem[]>();
    for (const item of data?.items ?? []) {
      const key = evidenceBucket(item);
      result.set(key, [...(result.get(key) ?? []), item]);
    }
    return result;
  }, [data]);

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
          {Object.entries(evidenceCopy).map(([key, copy]) => {
            const bucket = key as keyof typeof evidenceCopy;
            const items = grouped.get(bucket) ?? [];
            return (
              <section className="research-bucket" key={bucket}>
                <div className="research-bucket-heading">
                  <span>{bucket === "historical" ? "01" : bucket === "traditional" ? "02" : "03"}</span>
                  <div>
                    <p className="eyebrow">{locale === "zh-CN" ? copy.zh : copy.en}</p>
                    <p>{locale === "zh-CN" ? copy.detailZh : copy.detailEn}</p>
                  </div>
                  <strong>{items.length}</strong>
                </div>
                <ul>
                  {items.map((item) => (
                    <li key={`${item.kind}:${item.slug}`}>
                      <TraditionMark tradition={item.tradition} size="sm" />
                      <div>
                        <span>{item.kind.replace("_", " ")}</span>
                        <Link to={entityPath(item.kind as EntityKind, item.slug, locale)}>{item.title}</Link>
                        <p>{item.context}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="research-aside">
          <p className="eyebrow">{locale === "zh-CN" ? "当前版本说明" : "Current release note"}</p>
          <h2>{locale === "zh-CN" ? "原型索引，不是最终学术数据库" : "Prototype index, not a final scholarly database"}</h2>
          <p>{locale === "zh-CN" ? "当前公开原型展示的是 first-viewable prototype 的索引。完整 Alpha source 已经进入独立 compiler，但仍处于 preview，必须经过来源、双语、版权和 publishable 门禁后才会进入公共静态发布。" : "The public prototype currently shows the first-viewable prototype index. The fuller Alpha source is in a separate compiler pipeline, still marked preview, and must pass source, bilingual, rights and publishable gates before public static release."}</p>
          <dl>
            <div><dt>{locale === "zh-CN" ? "可追溯入口" : "Traceable entries"}</dt><dd>{locale === "zh-CN" ? "文本 → 版本 → 段落" : "Text → version → passage"}</dd></div>
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
