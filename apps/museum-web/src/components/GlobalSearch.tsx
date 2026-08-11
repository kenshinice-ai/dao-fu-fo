import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { formatEntityKind } from "../data/labels";
import type { Locale, SearchItem } from "../types";

interface GlobalSearchProps {
  locale: Locale;
}

function tabForItem(item: SearchItem): string {
  if (item.kind === "figure") return "figures";
  if (item.kind === "event") return "events";
  if (item.kind === "place") return "places";
  if (item.kind === "route") return "routes";
  if (item.kind === "text") return "texts";
  if (item.kind === "passage") return "sayings";
  return "figures";
}

export function GlobalSearch({ locale }: GlobalSearchProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const loader = useMemo(() => (signal: AbortSignal) => open ? staticData.searchIndex(locale, signal) : Promise.resolve({ locale, items: [] }), [locale, open]);
  const { data } = useStaticData(loader);
  const normalisedQuery = query.trim().toLocaleLowerCase();
  const results = useMemo(() => {
    if (!data || !normalisedQuery) return [];
    return data.items
      .filter((item) => `${item.title} ${item.context} ${item.kind}`.toLocaleLowerCase().includes(normalisedQuery))
      .slice(0, 8);
  }, [data, normalisedQuery]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectResult = (item: SearchItem) => {
    const key = `${item.kind}:${item.slug}`;
    navigate(`/explore?lang=${encodeURIComponent(locale)}&view=map&tab=${tabForItem(item)}&focus=${encodeURIComponent(key)}&detail=${encodeURIComponent(key)}&q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="global-search" ref={rootRef}>
      <button className="icon-button" type="button" aria-label={locale === "zh-CN" ? "打开全馆搜索" : "Open museum search"} aria-expanded={open} aria-controls="global-search-panel" onClick={() => setOpen((value) => !value)}>
        <Icon name="search" />
      </button>
      {open ? (
        <div className="global-search-panel" id="global-search-panel">
          <label className="sr-only" htmlFor="global-search-input">{locale === "zh-CN" ? "搜索人物、事件、地点、著作" : "Search figures, events, places and works"}</label>
          <div className="global-search-input-wrap">
            <Icon name="search" />
            <input
              ref={inputRef}
              id="global-search-input"
              role="combobox"
              aria-expanded={normalisedQuery.length > 0}
              aria-controls="global-search-results"
              aria-autocomplete="list"
              value={query}
              placeholder={locale === "zh-CN" ? "搜索人物、事件、地点……" : "Search figures, events, places…"}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              onKeyDown={(event) => {
                if (!results.length) return;
                if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(results.length - 1, index + 1)); }
                if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
                if (event.key === "Enter") { event.preventDefault(); selectResult(results[activeIndex]); }
              }}
            />
          </div>
          {normalisedQuery ? (
            <ul className="global-search-results" id="global-search-results" role="listbox" aria-label={locale === "zh-CN" ? "搜索结果" : "Search results"}>
              {results.map((item, index) => (
                <li key={`${item.kind}:${item.slug}`} role="option" aria-selected={index === activeIndex}>
                  <button type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => selectResult(item)}>
                    <span className="global-search-kind">{formatEntityKind(item.kind, locale)}</span>
                    <strong>{item.title}</strong>
                    <small>{item.context}</small>
                  </button>
                </li>
              ))}
              {results.length === 0 ? <li className="global-search-empty">{locale === "zh-CN" ? "没有匹配对象；试试人物、地点或著作名称。" : "No matching entity; try a figure, place or work."}</li> : null}
            </ul>
          ) : <p className="global-search-hint">{locale === "zh-CN" ? "输入关键词，结果会直接打开地图工作区中的对象详情。" : "Type a keyword to open an entity in the shared atlas drawer."}</p>}
          <button className="global-search-full-link" type="button" onClick={() => navigate(`/search?lang=${encodeURIComponent(locale)}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`)}>
            {locale === "zh-CN" ? "打开完整检索页" : "Open full search"} <Icon name="arrow" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
