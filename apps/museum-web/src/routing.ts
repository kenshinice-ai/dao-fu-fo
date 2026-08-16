import type { EntityKind, Locale } from "./types";
export {
  DEFAULT_ROUTE_STATE,
  parseRouteState,
  serializeRouteState,
} from "@drf-museum/core";
export type {
  AtlasTab,
  ExploreView,
  GraphType,
  GraphTier,
  MapLayer,
  MapContentLayer,
  RouteState,
  TimelineMode,
  ViewMode,
  ZoomLevel,
} from "@drf-museum/core";

export function withLang(path: string, locale: Locale): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${encodeURIComponent(locale)}`;
}

export function entityPath(kind: EntityKind, slug: string, locale: Locale): string {
  const bases: Record<EntityKind, string> = {
    tradition: "traditions",
    figure: "figures",
    text: "texts",
    text_version: "text-versions",
    passage: "passages",
    concept: "concepts",
    school: "schools",
    institution: "institutions",
    practice: "practices",
    place: "places",
    event: "events",
    route: "routes",
    museum_object: "objects",
  };
  return withLang(`/${bases[kind]}/${slug}`, locale);
}
