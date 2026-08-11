import type { Locale } from "./types";

const UI = {
  museum: ["展览", "Museum"],
  explore: ["地图", "Atlas"],
  methodology: ["介绍", "About"],
  research: ["研究", "Research"],
  enterMuseum: ["进入展览", "Enter exhibition"],
  exploreCivilisation: ["探索文明", "Explore civilisation"],
  switchLanguage: ["English", "中文"],
  quickTour: ["快速参观", "Quick tour"],
  fullTour: ["完整参观", "Full visit"],
  sources: ["来源与证据", "Sources & evidence"],
  related: ["继续探索", "Continue exploring"],
  map: ["历史地图", "Historical map"],
  timeline: ["时间轴", "Timeline"],
  graph: ["关系图", "Relations"],
  listView: ["文字列表", "Text list"],
  loading: ["正在开启展厅", "Opening the gallery"],
  error: ["内容暂时无法读取", "Content could not be loaded"],
  home: ["首页", "Home"],
  close: ["关闭", "Close"],
  back: ["返回", "Back"],
  search: ["搜索", "Search"],
  searchPlaceholder: ["搜索人物、经典、理念……", "Search figures, texts, concepts…"],
  evidence: ["证据层", "Evidence"],
  period: ["年代", "Period"],
  detail: ["查看详情", "View detail"],
} as const;

export type UIKey = keyof typeof UI;

export function t(key: UIKey, locale: Locale): string {
  const value = UI[key];
  return locale === "zh-CN" ? value[0] : value[1];
}
