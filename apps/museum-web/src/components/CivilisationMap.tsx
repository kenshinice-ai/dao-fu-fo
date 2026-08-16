import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ReadModelRelationIndex } from "@drf-museum/domain-schema";
import {
  connectedContextKeys,
  contextEndpointKey,
  eventFigureContexts,
  eventPlaceContexts,
  figurePlaceContexts,
  matchesContextFocus,
  placeEventContexts,
  placeFigureContexts,
  relationStartYear,
} from "../data/contextProjection";
import { deriveFigureTrajectory } from "../data/figureTrajectory";
import type { FigureTrajectoryWaypoint } from "../data/figureTrajectory";
import { RelationNetwork } from "./RelationNetwork";
import { entityPath } from "../routing";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { formatEvidenceLine } from "../data/labels";
import type { MapContentLayer, ZoomLevel } from "../routing";
import type { EntityData, Locale, MuseumMapData, SearchItem, Tradition } from "../types";

interface CivilisationMapProps {
  data: MuseumMapData;
  routes: EntityData[];
  locale: Locale;
  traditions: Tradition[];
  from?: number;
  to?: number;
  focus?: string;
  relations?: ReadModelRelationIndex;
  searchItems?: SearchItem[];
  onFocus?: (focus: string, scope?: string | null) => void;
  mapLayers?: MapContentLayer[];
  zoomLevel?: ZoomLevel;
  onMapLayersChange?: (layers: MapContentLayer[]) => void;
  className?: string;
  showContext?: boolean;
  showIndex?: boolean;
  showRouteLedger?: boolean;
}

const TRADITION_COLORS: Record<Tradition | "convergence", string> = {
  daoism: "#2f706b",
  confucianism: "#a45449",
  buddhism: "#a9782f",
  convergence: "#5e625d",
};

const INITIAL_CENTER: LatLngExpression = [32.2, 99.8];
const INITIAL_ZOOM = 3.8;
const DEFAULT_MAP_LAYERS: MapContentLayer[] = ["places", "routes", "trajectories", "memory"];

function featureKey(feature: MuseumMapData["features"][number]): string {
  return `place:${feature.properties.slug}`;
}

function routeWaypointSlugs(route: EntityData): string[] {
  const profile = route.profile ?? {};
  return Array.isArray(profile.waypointSlugs)
    ? profile.waypointSlugs.filter((slug): slug is string => typeof slug === "string")
    : [];
}

function routeWaypoints(route: EntityData, features: Map<string, MuseumMapData["features"][number]>): LatLngExpression[] {
  return routeWaypointSlugs(route).flatMap((slug) => {
    const feature = features.get(slug);
    if (!feature) return [];
    const [longitude, latitude] = feature.geometry.coordinates;
    return [[latitude, longitude] as LatLngExpression];
  });
}

function routeWaypointFeatures(route: EntityData, features: Map<string, MuseumMapData["features"][number]>): MuseumMapData["features"] {
  return routeWaypointSlugs(route).flatMap((slug) => {
    const feature = features.get(slug);
    return feature ? [feature] : [];
  });
}

function mapBounds(features: MuseumMapData["features"]): LatLngBoundsExpression | null {
  if (features.length === 0) return null;
  const latitudes = features.map((feature) => feature.geometry.coordinates[1]);
  const longitudes = features.map((feature) => feature.geometry.coordinates[0]);
  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ];
}

function matchesTimeRange(feature: MuseumMapData["features"][number], from?: number, to?: number): boolean {
  if (from === undefined && to === undefined) return true;
  const range = feature.properties.temporalRange;
  if (!range) return true;
  const rangeEnd = range.endYear ?? range.startYear;
  if (from !== undefined && rangeEnd < from) return false;
  if (to !== undefined && range.startYear > to) return false;
  return true;
}

function isUncertainCoordinate(value: string): boolean {
  return /pending|approx|uncertain|unknown|待核|推定|传统|symbolic/i.test(value);
}

function mapLayerLabel(layer: MapContentLayer, locale: Locale): string {
  if (layer === "places") return locale === "zh-CN" ? "地点" : "Places";
  if (layer === "routes") return locale === "zh-CN" ? "路线" : "Routes";
  if (layer === "memory") return locale === "zh-CN" ? "后世记忆" : "Later memory";
  return locale === "zh-CN" ? "人物轨迹" : "Figure trajectories";
}

function MapViewport({
  bounds,
  target,
}: {
  bounds: LatLngBoundsExpression | null;
  target?: MuseumMapData["features"][number];
}) {
  const map = useMap();
  const previousTarget = useRef<string | undefined>(undefined);
  const previousBounds = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (target) {
      const key = target.properties.slug;
      if (previousTarget.current !== key) {
        const [longitude, latitude] = target.geometry.coordinates;
        map.flyTo([latitude, longitude], 6, { duration: 0.5 });
        previousTarget.current = key;
      }
      return;
    }
    // A place popup belongs to the place selection. When the visitor moves to
    // a figure/event context, close the old Leaflet popup so it cannot claim
    // to be the current object after the URL has changed.
    map.closePopup();
    previousTarget.current = undefined;
    if (!bounds) return;
    const key = JSON.stringify(bounds);
    if (previousBounds.current === key) return;
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 5 });
    previousBounds.current = key;
  }, [bounds, map, target]);

  return null;
}

function MapToolbar({ bounds, locale }: { bounds: LatLngBoundsExpression | null; locale: Locale }) {
  const map = useMap();
  return (
    <div className="civilisation-map-toolbar" aria-label={locale === "zh-CN" ? "地图控制" : "Map controls"}>
      <button type="button" onClick={() => map.zoomIn()} aria-label={locale === "zh-CN" ? "放大地图" : "Zoom in"}>+</button>
      <button type="button" onClick={() => map.zoomOut()} aria-label={locale === "zh-CN" ? "缩小地图" : "Zoom out"}>−</button>
      <button
        type="button"
        onClick={() => bounds && map.fitBounds(bounds, { padding: [32, 32], maxZoom: 5 })}
        disabled={!bounds}
      >
        {locale === "zh-CN" ? "全境" : "Fit"}
      </button>
      <MapStatus locale={locale} />
    </div>
  );
}

function MapStatus({ locale }: { locale: Locale }) {
  const map = useMap();
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    const mapApi = map as unknown as {
      getZoom: () => number;
      getCenter: () => { lat: number; lng: number };
    };
    const update = () => {
      const nextZoom = Math.round(mapApi.getZoom());
      const center = mapApi.getCenter();
      setZoom(nextZoom);
      const root = document.getElementById("historical-map");
      root?.setAttribute("data-map-zoom", String(nextZoom));
      root?.setAttribute("data-map-center", `${center.lat.toFixed(3)},${center.lng.toFixed(3)}`);
    };
    update();
    map.on("zoomend moveend", update);
    return () => {
      map.off("zoomend moveend", update);
    };
  }, [map]);

  return <strong className="civilisation-map-zoom" aria-live="polite">{locale === "zh-CN" ? `缩放 ${zoom || "—"}` : `Zoom ${zoom || "—"}`}</strong>;
}

function MapLayerControl({ locale, layers, onChange }: { locale: Locale; layers: MapContentLayer[]; onChange?: (layers: MapContentLayer[]) => void }) {
  const available: MapContentLayer[] = ["places", "routes", "trajectories", "memory"];
  return (
    <fieldset className="civilisation-map-layers">
      <legend>{locale === "zh-CN" ? "地图图层" : "Map layers"}</legend>
      {available.map((layer) => {
        const checked = layers.includes(layer);
        return (
          <label key={layer}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange?.(checked ? layers.filter((item) => item !== layer) : [...layers, layer])}
            />
            <span>{mapLayerLabel(layer, locale)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function CivilisationMap({
  data,
  routes,
  locale,
  traditions,
  from,
  to,
  focus,
  relations,
  searchItems = [],
  onFocus,
  mapLayers = DEFAULT_MAP_LAYERS,
  zoomLevel = "region",
  onMapLayersChange,
  className = "",
  showContext = true,
  showIndex = true,
  showRouteLedger = true,
}: CivilisationMapProps) {
  const focusedFigureSlug = focus?.startsWith("figure:") ? focus.slice("figure:".length) : undefined;
  const loadFocusedFigure = useCallback(
    (signal: AbortSignal) => showContext && focusedFigureSlug ? staticData.entity("figure", focusedFigureSlug, locale, signal) : Promise.resolve(null),
    [focusedFigureSlug, locale, showContext],
  );
  const { data: focusedFigure } = useStaticData(loadFocusedFigure);
  const [trajectoryIndex, setTrajectoryIndex] = useState(0);
  const connectedKeys = useMemo(() => connectedContextKeys(relations, focus), [focus, relations]);
  const figurePlaces = useMemo(
    () => focus?.startsWith("figure:") ? figurePlaceContexts(relations, focus).sort((a, b) => (relationStartYear(a.relation) ?? Number.MAX_SAFE_INTEGER) - (relationStartYear(b.relation) ?? Number.MAX_SAFE_INTEGER)) : [],
    [focus, relations],
  );
  const figureTrajectory = useMemo(
    () => focus?.startsWith("figure:")
      ? deriveFigureTrajectory({
        figureKey: focus,
        relations: relations?.items ?? [],
        places: data.features,
        routes,
        searchItems,
      })
      : undefined,
    [data.features, focus, relations?.items, routes, searchItems],
  );
  const focusEventPlaces = useMemo(
    () => focus?.startsWith("event:") ? eventPlaceContexts(relations, focus) : [],
    [focus, relations],
  );
  const traditionFeatures = useMemo(() => data.features.filter((feature) =>
    (feature.properties.tradition === "convergence" || traditions.includes(feature.properties.tradition)) && matchesTimeRange(feature, from, to),
  ), [data.features, from, to, traditions]);
  const featuresBySlug = useMemo(() => new Map(data.features.map((feature) => [feature.properties.slug, feature])), [data.features]);
  const selectedRouteKeys = useMemo(() => {
    const keys = new Set(
      relations?.items
        .filter((relation) => focus && (contextEndpointKey(relation.source) === focus || contextEndpointKey(relation.target) === focus))
        .flatMap((relation) => {
          const endpoint = relation.source.kind === "route" ? relation.source : relation.target.kind === "route" ? relation.target : undefined;
          return endpoint ? ["route:" + endpoint.slug] : [];
        }) ?? [],
    );
    for (const routeKey of figureTrajectory?.routeKeys ?? []) keys.add(routeKey);
    if (focus?.startsWith("figure:")) {
      const figureSlug = focus.slice("figure:".length);
      for (const route of routes) {
        if (route.slug.includes(figureSlug)) keys.add("route:" + route.slug);
      }
    }
    return keys;
  }, [figureTrajectory?.routeKeys, focus, relations, routes]);
  const routeEntries = useMemo(() => routes.map((route) => ({
    route,
    points: routeWaypoints(route, featuresBySlug),
    waypointFeatures: routeWaypointFeatures(route, featuresBySlug),
    pendingWaypointSlugs: routeWaypointSlugs(route).filter((slug) => !featuresBySlug.has(slug)),
  })), [featuresBySlug, routes]);
  const mapContextKeys = useMemo(() => {
    const keys = new Set(connectedKeys);
    for (const place of figurePlaces) keys.add(place.placeKey);
    for (const place of focusEventPlaces) keys.add(place.placeKey);
    for (const entry of routeEntries) {
      if (selectedRouteKeys.has("route:" + entry.route.slug)) {
        for (const feature of entry.waypointFeatures) keys.add(featureKey(feature));
      }
    }
    return keys;
  }, [connectedKeys, figurePlaces, focusEventPlaces, routeEntries, selectedRouteKeys]);
  // Keep the full real-place index visible after a selection. This makes a focused
  // city a dossier state, not a filter that hides the next city the visitor may choose.
  // At the era level, retain the curated anchor cities as an intentional density
  // layer; the region/figure/all levels progressively reveal the full index.
  const visiblePlaceFeatures = useMemo(() => {
    if (zoomLevel !== "era") return traditionFeatures;
    const anchorSlugs = new Set(["changan", "luoyang", "dunhuang", "sarnath", "mount-wutai", "kongtong"]);
    const anchors = traditionFeatures.filter((feature) => anchorSlugs.has(feature.properties.slug));
    return anchors.length > 0 ? anchors : traditionFeatures.slice(0, Math.max(1, Math.ceil(traditionFeatures.length / 3)));
  }, [traditionFeatures, zoomLevel]);
  const visibleFeatures = mapLayers.includes("places") ? visiblePlaceFeatures : [];
  const figurePlaceSlugs = useMemo(
    () => figureTrajectory?.mapped.map((waypoint) => waypoint.placeSlug) ?? figurePlaces.map((place) => place.placeKey.slice("place:".length)),
    [figurePlaces, figureTrajectory?.mapped],
  );
  const focusMapState = focus?.startsWith("figure:")
    ? figurePlaceSlugs.some((slug) => featuresBySlug.has(slug)) ? "mapped" : figurePlaceSlugs.length > 0 ? "position-pending" : undefined
    : undefined;
  const visibleRoutes = useMemo(() => mapLayers.includes("routes") ? routeEntries
    .filter(({ points }) => points.length > 1 && points.some((point) => {
      const [latitude, longitude] = point as [number, number];
      return visibleFeatures.some((feature) => feature.geometry.coordinates[0] === longitude && feature.geometry.coordinates[1] === latitude);
    })) : [], [mapLayers, routeEntries, visibleFeatures]);
  const trajectoryStops = useMemo<FigureTrajectoryWaypoint[]>(() => {
    if (!mapLayers.includes("trajectories")) return [];
    return figureTrajectory?.mapped ?? [];
  }, [figureTrajectory?.mapped, mapLayers]);
  const memoryStops = useMemo(
    () => figureTrajectory?.memory.filter((waypoint) => mapLayers.includes("memory") && waypoint.coordinates) ?? [],
    [figureTrajectory?.memory, mapLayers],
  );
  const pendingFigurePlaces = useMemo(
    () => figureTrajectory?.unresolved ?? [],
    [figureTrajectory?.unresolved],
  );
  useEffect(() => {
    setTrajectoryIndex((index) => Math.min(index, Math.max(0, trajectoryStops.length - 1)));
  }, [trajectoryStops.length]);
  const focusPlace = focus?.startsWith("place:")
    ? featuresBySlug.get(focus.slice("place:".length))
    : undefined;
  const placePeople = useMemo(
    () => focusPlace ? placeFigureContexts(relations, featureKey(focusPlace)) : [],
    [focusPlace, relations],
  );
  const placeEvents = useMemo(
    () => focusPlace ? placeEventContexts(relations, featureKey(focusPlace)) : [],
    [focusPlace, relations],
  );
  const placeFigureKeys = useMemo(() => placePeople.map((person) => person.figureKey), [placePeople]);
  const focusEventFigures = useMemo(
    () => focus?.startsWith("event:") ? eventFigureContexts(relations, focus) : [],
    [focus, relations],
  );
  const contextTitle = (key: string) => searchItems.find((item) => item.kind + ":" + item.slug === key)?.title
    ?? key.split(":").slice(1).join(":").replaceAll("-", " ");
  const trajectoryFeatures = useMemo(
    () => trajectoryStops
      .map((waypoint) => featuresBySlug.get(waypoint.placeSlug))
      .filter((feature): feature is MuseumMapData["features"][number] => Boolean(feature)),
    [featuresBySlug, trajectoryStops],
  );
  const bounds = useMemo(
    () => focus?.startsWith("figure:") && trajectoryFeatures.length > 0 ? mapBounds(trajectoryFeatures) : mapBounds(visibleFeatures),
    [focus, trajectoryFeatures, visibleFeatures],
  );
  const target = useMemo(() => {
    if (focus?.startsWith("place:")) return featuresBySlug.get(focus.slice("place:".length));
    if (focus?.startsWith("event:")) {
      const placeKey = focusEventPlaces[0]?.placeKey;
      return placeKey ? featuresBySlug.get(placeKey.slice("place:".length)) : undefined;
    }
    return undefined;
  }, [featuresBySlug, focus, focusEventPlaces]);

  return (
    <div
      id="historical-map"
      className={`civilisation-map ${className}`.trim()}
      data-map-focus-state={focusMapState}
      data-map-zoom-level={zoomLevel}
      data-map-visible-places={visibleFeatures.length}
      data-map-visible-routes={visibleRoutes.length}
      data-map-visible-trajectories={trajectoryStops.length}
      data-map-visible-memory={memoryStops.length}
    >
      <MapContainer
        className="civilisation-map-leaflet"
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        doubleClickZoom
        keyboard
        worldCopyJump
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <MapViewport bounds={bounds} target={target} />
        <MapToolbar bounds={bounds} locale={locale} />

        {visibleRoutes.map(({ route, points }) => {
          const selected = selectedRouteKeys.has("route:" + route.slug);
          return (
            <Polyline
              key={route.slug}
              positions={points}
              pathOptions={{
                color: selected ? "#b17f2d" : TRADITION_COLORS.convergence,
                weight: selected ? 5 : 3,
                opacity: selected ? 0.95 : 0.72,
                dashArray: route.profile?.certainty === "documented" ? undefined : "8 8",
                className: selected ? "is-selected-route" : undefined,
              }}
            >
              <Tooltip sticky>{route.title}{selected ? (locale === "zh-CN" ? " · 当前人物轨迹" : " · selected figure trajectory") : ""}</Tooltip>
            </Polyline>
          );
        })}

        {focus?.startsWith("figure:") ? trajectoryStops.map((waypoint, index) => {
          if (!waypoint.coordinates) return null;
          const [longitude, latitude] = waypoint.coordinates;
          return (
          <CircleMarker
            key={"trajectory-" + waypoint.id}
            center={[latitude, longitude]}
            radius={7}
            pathOptions={{
              color: "#b17f2d",
              fillColor: "#fbf8f0",
              fillOpacity: 1,
              weight: 3,
            }}
            eventHandlers={{ click: () => onFocus?.(waypoint.placeKey, null) }}
          >
            <Tooltip direction="top" offset={[0, -7]} opacity={0.98}>
              {(index + 1) + ". " + waypoint.placeTitle + (waypoint.reconstructed ? (locale === "zh-CN" ? " · 路线重建" : " · reconstructed route") : "")}
            </Tooltip>
          </CircleMarker>
          );
        }) : null}

        {focus?.startsWith("figure:") ? memoryStops.map((waypoint) => {
          if (!waypoint.coordinates) return null;
          const [longitude, latitude] = waypoint.coordinates;
          return (
            <CircleMarker
              key={"memory-" + waypoint.id}
              center={[latitude, longitude]}
              radius={8}
              pathOptions={{ color: "#745b82", fillColor: "#f8f1fb", fillOpacity: 0.9, weight: 2, dashArray: "3 4" }}
              eventHandlers={{ click: () => onFocus?.(waypoint.placeKey, null) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.98}>
                {waypoint.placeTitle + (locale === "zh-CN" ? " · 后世记忆" : " · later memory")}
              </Tooltip>
            </CircleMarker>
          );
        }) : null}

        {visibleFeatures.map((feature) => {
          const key = featureKey(feature);
          const selected = focus === key;
          const connected = Boolean(focus && matchesContextFocus([key], focus, mapContextKeys));
          const color = TRADITION_COLORS[feature.properties.tradition];
          const radius = feature.properties.slug === "changan" || feature.properties.slug === "luoyang" ? 11 : 8;
          const uncertain = isUncertainCoordinate(feature.properties.coordinateConfidence);
          return (
            <CircleMarker
              key={feature.id}
              center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
              radius={selected ? radius + 4 : radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: selected ? 0.95 : connected || !focus ? 0.78 : 0.26,
                weight: selected ? 4 : 2,
                dashArray: uncertain ? "4 4" : undefined,
                className: selected ? "is-selected" : undefined,
              }}
              eventHandlers={{ click: () => onFocus?.(key, null) }}
            >
              <Tooltip direction="top" offset={[0, -radius]} opacity={0.95}>
                {feature.properties.title}
              </Tooltip>
              <Popup>
                <div className="civilisation-map-popup">
                  <strong>{feature.properties.title}</strong>
                  <span>{feature.properties.placeReality} · {feature.properties.coordinateConfidence}</span>
                  <p>{feature.properties.summary}</p>
                  <Link to={entityPath("place", feature.properties.slug, locale)}>
                    {locale === "zh-CN" ? "打开地点档案" : "Open place dossier"}
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <MapLayerControl locale={locale} layers={mapLayers} onChange={onMapLayersChange} />
      <details className="civilisation-map-legend" open>
        <summary>{locale === "zh-CN" ? "图例与不确定性" : "Legend and uncertainty"}</summary>
        <ul>
          <li><span className="map-legend-swatch map-legend-place" aria-hidden="true" />{locale === "zh-CN" ? "现实地点" : "Real place"}</li>
          <li><span className="map-legend-swatch map-legend-route" aria-hidden="true" />{locale === "zh-CN" ? "路线或空间连接" : "Route or spatial connection"}</li>
          <li><span className="map-legend-swatch map-legend-trajectory" aria-hidden="true" />{locale === "zh-CN" ? "人物轨迹节点" : "Figure trajectory stop"}</li>
          <li><span className="map-legend-swatch map-legend-memory" aria-hidden="true" />{locale === "zh-CN" ? "后世记忆地点（不等于历史行迹）" : "Later memory site (not a historical stop)"}</li>
          <li><span className="map-legend-swatch map-legend-uncertain" aria-hidden="true" />{locale === "zh-CN" ? "虚线／半透明：位置或路线待核" : "Dashed or translucent: unresolved position or route"}</li>
        </ul>
      </details>
      {mapLayers.length === 0 ? <p className="civilisation-map-layer-empty">{locale === "zh-CN" ? "已隐藏全部地图图层；请从图层控制中重新打开。" : "All map layers are hidden; reopen one in the layer control."}</p> : null}
      {showContext ? (focusPlace ? (
        <section className="map-context-panel" data-city-people aria-labelledby="map-context-title">
          <div className="map-context-heading">
            <div>
              <p className="eyebrow">{locale === "zh-CN" ? "城市人物" : "Figures in this place"}</p>
              <h2 id="map-context-title">{focusPlace.properties.title}</h2>
            </div>
            <span>
              {placePeople.length} {locale === "zh-CN" ? "位关联人物" : "figures connected"}
              {placeEvents.length > 0 ? ` · ${placeEvents.length} ${locale === "zh-CN" ? "个事件" : "events"}` : ""}
            </span>
          </div>
          {placePeople.length > 0 ? (
            <ul className="map-context-figure-list">
              {placePeople.map((person) => (
                <li key={person.figureKey}>
                  <div>
                    <button type="button" onClick={() => onFocus?.(person.figureKey, null)}>{contextTitle(person.figureKey)}</button>
                    <span>{person.relation.label}</span>
                    <small>
                      {person.connection === "direct"
                        ? (locale === "zh-CN" ? "直接地点关系" : "Direct place relation")
                        : (locale === "zh-CN" ? "通过事件关联" : "Connected through an event")}
                      {" · "}{formatEvidenceLine(person.relation.evidenceLayer, person.relation.confidence, locale)}
                    </small>
                  </div>
                  <Link to={entityPath("figure", person.figureKey.slice("figure:".length), locale)}>
                    {locale === "zh-CN" ? "档案" : "Dossier"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="map-context-empty">{locale === "zh-CN" ? "当前地点还没有可展开的人物关系。" : "No figure context is available for this place yet."}</p>
          )}
          {placeEvents.length > 0 ? (
            <section className="map-context-subsection" data-city-events aria-labelledby="map-context-events-title">
              <div className="map-context-subsection-heading">
                <p className="eyebrow">{locale === "zh-CN" ? "城市事件" : "Events in this place"}</p>
                <h3 id="map-context-events-title">{locale === "zh-CN" ? "从地点进入时间轴" : "Move from place to timeline"}</h3>
              </div>
              <ul className="map-context-event-list">
                {placeEvents.map((event) => (
                  <li key={event.eventKey}>
                    <button type="button" onClick={() => onFocus?.(event.eventKey, null)}>{contextTitle(event.eventKey)}</button>
                    <span>{event.relation.label}</span>
                    <small>{formatEvidenceLine(event.relation.evidenceLayer, event.relation.confidence, locale)}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <RelationNetwork
            locale={locale}
            focus={featureKey(focusPlace)}
            relations={relations}
            searchItems={searchItems}
            onFocus={(key) => onFocus?.(key, null)}
            compact
            peopleOnly
            scopeKeys={placeFigureKeys}
            zoomLevel={zoomLevel}
          />
        </section>
      ) : focus?.startsWith("event:") ? (
        <section className="map-context-panel" data-event-context aria-labelledby="event-map-context-title">
          <div className="map-context-heading">
            <div>
              <p className="eyebrow">{locale === "zh-CN" ? "事件空间" : "Event context"}</p>
              <h2 id="event-map-context-title">{contextTitle(focus)}</h2>
            </div>
            <span>{focusEventPlaces.length} {locale === "zh-CN" ? "个地点" : "places"} · {focusEventFigures.length} {locale === "zh-CN" ? "位人物" : "figures"}</span>
          </div>
          <div className="map-context-subsections">
            <section className="map-context-subsection" aria-labelledby="event-map-places-title">
              <p className="eyebrow">{locale === "zh-CN" ? "地点" : "Places"}</p>
              <h3 id="event-map-places-title">{locale === "zh-CN" ? "事件发生在哪里" : "Where the event is located"}</h3>
              {focusEventPlaces.length > 0 ? (
                <ul className="map-context-event-list">
                  {focusEventPlaces.map((place) => (
                    <li key={place.placeKey}>
                      <button type="button" onClick={() => onFocus?.(place.placeKey, null)}>{contextTitle(place.placeKey)}</button>
                      <span>{place.relation.label}</span>
                      <small>{formatEvidenceLine(place.relation.evidenceLayer, place.relation.confidence, locale)}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="map-context-empty">{locale === "zh-CN" ? "当前事件还没有现实地点锚点。" : "This event has no real-place anchor yet."}</p>}
            </section>
            <section className="map-context-subsection" aria-labelledby="event-map-figures-title">
              <p className="eyebrow">{locale === "zh-CN" ? "人物" : "Figures"}</p>
              <h3 id="event-map-figures-title">{locale === "zh-CN" ? "谁参与或关联此事件" : "Who participates or connects here"}</h3>
              {focusEventFigures.length > 0 ? (
                <ul className="map-context-event-list">
                  {focusEventFigures.map((person) => (
                    <li key={person.figureKey}>
                      <button type="button" onClick={() => onFocus?.(person.figureKey)}>{contextTitle(person.figureKey)}</button>
                      <span>{person.relation.label}</span>
                      <small>{formatEvidenceLine(person.relation.evidenceLayer, person.relation.confidence, locale)}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="map-context-empty">{locale === "zh-CN" ? "当前事件还没有人物关系。" : "No figure relations are available for this event yet."}</p>}
            </section>
          </div>
          <RelationNetwork locale={locale} focus={focus} relations={relations} searchItems={searchItems} onFocus={(key) => onFocus?.(key)} compact zoomLevel={zoomLevel} />
        </section>
      ) : focus?.startsWith("figure:") ? (
        <section className="map-context-panel" data-figure-trajectory aria-labelledby="figure-map-context-title">
          <div className="map-context-heading">
            <div>
              <p className="eyebrow">{locale === "zh-CN" ? "人物轨迹" : "Figure trajectory"}</p>
              <h2 id="figure-map-context-title">{contextTitle(focus)}</h2>
            </div>
            <span>
              {trajectoryStops.length} {locale === "zh-CN" ? "个可定位节点" : "mapped stops"}
              {pendingFigurePlaces.length > 0 ? ` · ${pendingFigurePlaces.length} ${locale === "zh-CN" ? "个地点待核" : "pending places"}` : ""}
              {figureTrajectory?.routeKeys.length ? ` · ${figureTrajectory.routeKeys.length} ${locale === "zh-CN" ? "条路线证据" : "route evidence"}` : ""}
            </span>
          </div>
          {focusedFigure ? (
            <section className="figure-context-card" data-figure-context data-figure-context-kind={focusedFigure.quote ? "quote" : "theory"} aria-labelledby="figure-context-card-title">
              <div className="figure-context-card-heading">
                <div>
                  <p className="eyebrow">{focusedFigure.quote ? (locale === "zh-CN" ? "名言入口" : "Saying entry") : (locale === "zh-CN" ? "思想入口" : "Theory lens")}</p>
                  <h3 id="figure-context-card-title">{focusedFigure.quote ? (locale === "zh-CN" ? "在传述中听见一句话" : "A voice carried through transmission") : focusedFigure.subtitle}</h3>
                </div>
                <span>{focusedFigure.timeLabel}</span>
              </div>
              {focusedFigure.quote ? (
                <figure>
                  <blockquote lang={locale === "zh-CN" ? "zh-Hans" : undefined}>{focusedFigure.quote.original}</blockquote>
                  <p>{focusedFigure.quote.interpretation}</p>
                  <figcaption>{focusedFigure.quote.locator}</figcaption>
                </figure>
              ) : (
                <p className="figure-context-card-theory">{focusedFigure.shortSummary}</p>
              )}
              <div className="figure-context-card-footer">
                <span>{locale === "zh-CN" ? "人物、言说与时代语境保持分层" : "Person, speech and period remain layered"}</span>
                <Link to={entityPath("figure", focusedFigure.slug, locale)}>{locale === "zh-CN" ? "打开人物档案" : "Open figure dossier"}</Link>
              </div>
            </section>
          ) : null}
          {trajectoryStops.length > 0 ? (
            <div className="map-trajectory-controls" aria-label={locale === "zh-CN" ? "按顺序查看人物轨迹" : "Step through figure trajectory"}>
              <span>{locale === "zh-CN" ? `第 ${trajectoryIndex + 1} / ${trajectoryStops.length} 个节点` : `Stop ${trajectoryIndex + 1} of ${trajectoryStops.length}`}</span>
              <div>
                <button type="button" disabled={trajectoryIndex <= 0} onClick={() => { const next = Math.max(0, trajectoryIndex - 1); setTrajectoryIndex(next); onFocus?.(trajectoryStops[next].placeKey, null); }}>{locale === "zh-CN" ? "上一步" : "Previous stop"}</button>
                <button type="button" disabled={trajectoryIndex >= trajectoryStops.length - 1} onClick={() => { const next = Math.min(trajectoryStops.length - 1, trajectoryIndex + 1); setTrajectoryIndex(next); onFocus?.(trajectoryStops[next].placeKey, null); }}>{locale === "zh-CN" ? "下一步" : "Next stop"}</button>
              </div>
            </div>
          ) : null}
          <ol className="map-trajectory-list">
            {trajectoryStops.map((feature, index) => (
              <li key={feature.id} data-trajectory-role={feature.role} data-trajectory-reconstructed={feature.reconstructed ? "true" : "false"}>
                <button type="button" onClick={() => onFocus?.(feature.placeKey, null)}>{index + 1}. {feature.placeTitle}</button>
                <span>{feature.role === "route" ? (locale === "zh-CN" ? "路线区域锚点" : "Route anchor") : feature.role === "event" ? (locale === "zh-CN" ? "事件地点" : "Event place") : feature.role === "birth" ? (locale === "zh-CN" ? "出生地" : "Birthplace") : (locale === "zh-CN" ? "活动／经过" : "Activity / travel")} · {feature.reconstructed ? (locale === "zh-CN" ? "重建" : "Reconstructed") : (locale === "zh-CN" ? "关系投影" : "Relational projection")}</span>
                <small>{feature.time?.displayDate ?? (locale === "zh-CN" ? "年代未定" : "Date unresolved")} · {formatEvidenceLine(feature.evidenceLayer, feature.confidence, locale)}</small>
              </li>
            ))}
          </ol>
          {figureTrajectory?.memory.length ? (
            <section className="map-context-subsection figure-memory-panel" data-figure-memory aria-labelledby="figure-memory-title">
              <p className="eyebrow">{locale === "zh-CN" ? "后世记忆层" : "Later memory layer"}</p>
              <h3 id="figure-memory-title">{locale === "zh-CN" ? "记忆地点不等于人物行迹" : "Memory sites are not historical stops"}</h3>
              <ul className="map-trajectory-list">
                {figureTrajectory.memory.map((waypoint) => (
                  <li key={waypoint.id} data-memory-place={waypoint.placeSlug}>
                    <button type="button" onClick={() => onFocus?.(waypoint.placeKey, null)}>{waypoint.placeTitle}</button>
                    <span>{waypoint.label}</span>
                    <small>{waypoint.time?.displayDate ?? (locale === "zh-CN" ? "后世记忆；年代未定" : "Later memory; date unresolved")} · {formatEvidenceLine(waypoint.evidenceLayer, waypoint.confidence, locale)}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {pendingFigurePlaces.length > 0 ? (
            <section className="map-context-subsection map-pending-place-list" data-map-pending-places aria-labelledby="map-pending-place-title">
              <p className="eyebrow">{locale === "zh-CN" ? "未落到现实坐标的关联地点" : "Related places without a map coordinate"}</p>
              <h3 id="map-pending-place-title">{locale === "zh-CN" ? "保留关系，不伪造位置" : "Keep the relation, do not fabricate a point"}</h3>
              <ul className="map-trajectory-list">
                {pendingFigurePlaces.map((place) => (
                  <li key={place.id}>
                    <div>
                      <strong>{place.placeTitle}</strong>
                      <span>{place.label}</span>
                      <small>{locale === "zh-CN" ? "地点实体存在，但当前没有可绘制的现实坐标" : "The place entity exists, but no drawable real-world coordinate is published yet"}{" · "}{formatEvidenceLine(place.evidenceLayer, place.confidence, locale)}</small>
                    </div>
                    <Link to={entityPath("place", place.placeSlug, locale)}>{locale === "zh-CN" ? "地点档案" : "Dossier"}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <RelationNetwork locale={locale} focus={focus} relations={relations} searchItems={searchItems} onFocus={(key) => onFocus?.(key)} compact peopleOnly zoomLevel={zoomLevel} />
        </section>
      ) : (
        <p className="map-context-hint">
          {locale === "zh-CN"
            ? "点击城市查看对应人物；点击人物后，地图会显示其空间节点与一层关系网。"
            : "Select a city to see its figures; select a figure to reveal spatial stops and one-hop relationships."}
        </p>
      )) : null}
      <div className="civilisation-map-caption" aria-live="polite">
        <span>{locale === "zh-CN" ? "历史地理 · 现实坐标" : "Historical geography · real coordinates"}</span>
        <span>{visibleFeatures.length} {locale === "zh-CN" ? "个地点" : "places"} · {visibleRoutes.length} {locale === "zh-CN" ? "条路线" : "routes"}{from !== undefined || to !== undefined ? ` · ${from ?? "…"}–${to ?? "…"}` : ""}</span>
      </div>
      {focusMapState === "position-pending" ? (
        <p className="civilisation-map-position-note" data-map-position-status>
          {locale === "zh-CN"
            ? "当前人物尚无可直接落到现实坐标的已发布地点；地图保留现有地理范围，位置待核不会被伪造为坐标。"
            : "This figure has no published place that can be placed on real coordinates yet; the available geography remains visible and no pending position is fabricated."}
        </p>
      ) : null}
      {showIndex ? <nav className="civilisation-map-node-index" aria-label={locale === "zh-CN" ? "地图地点索引" : "Map place index"}>
        {visibleFeatures.map((feature) => (
          <span className="civilisation-map-node-index-item" key={feature.properties.slug}>
            <button
              data-map-focus="true"
              type="button"
              onClick={() => onFocus?.(featureKey(feature), null)}
            >
              {locale === "zh-CN" ? "聚焦地点：" : "Focus place: "}{feature.properties.title}
            </button>
            <Link
              data-map-node="true"
              to={entityPath("place", feature.properties.slug, locale)}
            >
              {locale === "zh-CN" ? "打开地点：" : "Open place: "}{feature.properties.title}
            </Link>
          </span>
          ))}
      </nav> : null}
      {showRouteLedger && routes.length > 0 ? (
        <section className="map-route-ledger" aria-labelledby="map-route-ledger-title">
          <p className="eyebrow">{locale === "zh-CN" ? "路线廊道" : "Route corridors"}</p>
          <h3 id="map-route-ledger-title">{locale === "zh-CN" ? "由路线实体派生的空间连接" : "Spatial links derived from route entities"}</h3>
          <ul>
            {routeEntries.map(({ route, pendingWaypointSlugs }) => (
              <li key={route.slug}>
                <Link to={entityPath("route", route.slug, locale)}>{route.title}</Link>
                <span>{route.timeLabel}</span>
                <p>{route.shortSummary}</p>
                {pendingWaypointSlugs.length > 0 ? <small>{locale === "zh-CN" ? `另有 ${pendingWaypointSlugs.length} 个路线节点待坐标核定。` : `${pendingWaypointSlugs.length} route waypoint${pendingWaypointSlugs.length === 1 ? "" : "s"} still need coordinate review.`}</small> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
