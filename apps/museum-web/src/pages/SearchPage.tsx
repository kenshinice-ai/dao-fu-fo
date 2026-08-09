import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { TraditionMark } from "../components/TraditionMark";
import { useMuseumContext } from "../context";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { entityPath } from "../routing";

export function SearchPage() {
  const { locale } = useMuseumContext();
  const [params, setParams] = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const loader = useCallback((signal: AbortSignal) => staticData.searchIndex(locale, signal), [locale]);
  const { data, error } = useStaticData(loader);
  const query = params.get("q")?.trim().toLocaleLowerCase() ?? "";
  const results = useMemo(
    () => data?.items.filter((item) => `${item.title} ${item.context}`.toLocaleLowerCase().includes(query)) ?? [],
    [data, query],
  );

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!data) return <LoadingState locale={locale} />;

  return (
    <section className="page-shell search-page">
      <header className="page-intro">
        <p className="eyebrow">Search / {locale === "zh-CN" ? "全馆检索" : "Museum search"}</p>
        <h1>{locale === "zh-CN" ? "从一个名字、一句原典开始" : "Begin with a name or a line of text"}</h1>
      </header>
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          const next = new URLSearchParams(params);
          if (value.trim()) next.set("q", value.trim());
          else next.delete("q");
          setParams(next);
        }}
      >
        <label htmlFor="museum-search">{locale === "zh-CN" ? "搜索人物、经典、理念和地点" : "Search figures, texts, concepts and places"}</label>
        <div>
          <Icon name="search" />
          <input id="museum-search" value={value} onChange={(event) => setValue(event.target.value)} />
          <button type="submit">{locale === "zh-CN" ? "搜索" : "Search"}</button>
        </div>
      </form>
      <div className="search-results" aria-live="polite">
        {query ? <p>{locale === "zh-CN" ? `“${query}” 的结果：${results.length}` : `${results.length} results for “${query}”`}</p> : <p>{locale === "zh-CN" ? "试试：玄奘、自然、礼、长安。" : "Try: Xuanzang, naturalness, ritual, Chang'an."}</p>}
        <ul>
          {results.map((item) => (
            <li key={`${item.kind}:${item.slug}`}>
              <TraditionMark tradition={item.tradition} size="sm" />
              <div>
                <span>{item.kind.replace("_", " ")}</span>
                <Link to={entityPath(item.kind, item.slug, locale)}>{item.title}</Link>
                <p>{item.context}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
