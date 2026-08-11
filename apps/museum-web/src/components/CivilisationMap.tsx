import { useEffect, useMemo, useRef, useState } from "react";
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
import { RelationNetwork } from "./RelationNetwork";
import { entityPath } from "../routing";
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
  onFocus?: (focus: string) => void;
  className?: string;
}

const TRADITION_COLORS: Record<Tradition | "convergence", string> = {
  daoism: "#2f706b",
  confucianism: "#a45449",
  buddhism: "#a9782f",
  convergence: "#5e625d",
};

const INITIAL_CENTER: LatLngExpression = [32.2, 99.8];
const INITIAL_ZOOM = 3.8;

function featureKey(feature: MuseumMapData["features"][number]): string {
  return `place:${feature.properties.slug}`;
}

function routeWaypoints(route: EntityData, features: Map<string, MuseumMapData["features"][number]>): LatLngExpression[] {
  const profile = route.profile ?? {};
  const waypointSlugs = Array.isArray(profile.waypointSlugs)
    ? profile.waypointSlugs.filter((slug): slug is string => typeof slug === "string")
    : [];
  return waypointSlugs.flatMap((slug) => {
    const feature = features.get(slug);
    if (!feature) return [];
    const [longitude, latitude] = feature.geometry.coordinates;
    return [[latitude, longitude] as LatLngExpression];
  });
}

function routeWaypointFeatures(route: EntityData, features: Map<string, MuseumMapData["features"][number]>): MuseumMapData["features"] {
  const profile = route.profile ?? {};
  const waypointSlugs = Array.isArray(profile.waypointSlugs)
    ? profile.waypointSlugs.filter((slug): slug is string => typeof slug === "string")
    : [];
  return waypointSlugs.flatMap((slug) => {
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
  className = "",
}: CivilisationMapProps) {
  const connectedKeys = useMemo(() => connectedContextKeys(relations, focus), [focus, relations]);
  const figurePlaces = useMemo(
    () => focus?.startsWith("figure:") ? figurePlaceContexts(relations, focus).sort((a, b) => (relationStartYear(a.relation) ?? Number.MAX_SAFE_INTEGER) - (relationStartYear(b.relation) ?? Number.MAX_SAFE_INTEGER)) : [],
    [focus, relations],
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
    if (focus?.startsWith("figure:")) {
      const figureSlug = focus.slice("figure:".length);
      for (const route of routes) {
        if (route.slug.includes(figureSlug)) keys.add("route:" + route.slug);
      }
    }
    return keys;
  }, [focus, relations, routes]);
  const routeEntries = useMemo(() => routes.map((route) => ({
    route,
    points: routeWaypoints(route, featuresBySlug),
    waypointFeatures: routeWaypointFeatures(route, featuresBySlug),
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
  const visibleFeatures = traditionFeatures;
  const relatedPlaceSlugs = useMemo(
    () => [...mapContextKeys].filter((key) => key.startsWith("place:")).map((key) => key.slice("place:".length)),
    [mapContextKeys],
  );
  const focusMapState = focus?.startsWith("figure:")
    ? relatedPlaceSlugs.some((slug) => featuresBySlug.has(slug)) ? "mapped" : "position-pending"
    : undefined;
  const visibleRoutes = useMemo(() => routeEntries
    .filter(({ points }) => points.length > 1 && points.some((point) => {
      const [latitude, longitude] = point as [number, number];
      return visibleFeatures.some((feature) => feature.geometry.coordinates[0] === longitude && feature.geometry.coordinates[1] === latitude);
    })), [routeEntries, visibleFeatures]);
  const trajectoryStops = useMemo(() => {
    const selectedRoute = visibleRoutes.find(({ route }) => selectedRouteKeys.has("route:" + route.slug));
    if (selectedRoute) return selectedRoute.waypointFeatures;
    return figurePlaces
      .map((place) => featuresBySlug.get(place.placeKey.slice("place:".length)))
      .filter((feature): feature is MuseumMapData["features"][number] => Boolean(feature));
  }, [featuresBySlug, figurePlaces, selectedRouteKeys, visibleRoutes]);
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
  const focusEventFigures = useMemo(
    () => focus?.startsWith("event:") ? eventFigureContexts(relations, focus) : [],
    [focus, relations],
  );
  const contextTitle = (key: string) => searchItems.find((item) => item.kind + ":" + item.slug === key)?.title
    ?? key.split(":").slice(1).join(":").replaceAll("-", " ");
  const bounds = useMemo(() => mapBounds(visibleFeatures), [visibleFeatures]);
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

        {focus?.startsWith("figure:") ? trajectoryStops.map((feature, index) => (
          <CircleMarker
            key={"trajectory-" + feature.id}
            center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            radius={7}
            pathOptions={{
              color: "#b17f2d",
              fillColor: "#fbf8f0",
              fillOpacity: 1,
              weight: 3,
            }}
            eventHandlers={{ click: () => onFocus?.(featureKey(feature)) }}
          >
            <Tooltip direction="top" offset={[0, -7]} opacity={0.98}>
              {(index + 1) + ". " + feature.properties.title}
            </Tooltip>
          </CircleMarker>
        )) : null}

        {visibleFeatures.map((feature) => {
          const key = featureKey(feature);
          const selected = focus === key;
          const connected = Boolean(focus && matchesContextFocus([key], focus, mapContextKeys));
          const color = TRADITION_COLORS[feature.properties.tradition];
          const radius = feature.properties.slug === "changan" || feature.properties.slug === "luoyang" ? 11 : 8;
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
                className: selected ? "is-selected" : undefined,
              }}
              eventHandlers={{ click: () => onFocus?.(key) }}
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
      {focusPlace ? (
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
                    <button type="button" onClick={() => onFocus?.(person.figureKey)}>{contextTitle(person.figureKey)}</button>
                    <span>{person.relation.label}</span>
                    <small>
                      {person.connection === "direct"
                        ? (locale === "zh-CN" ? "直接地点关系" : "Direct place relation")
                        : (locale === "zh-CN" ? "通过事件关联" : "Connected through an event")}
                      {" · "}{person.relation.evidenceLayer}{" · "}{person.relation.confidence}
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
                    <button type="button" onClick={() => onFocus?.(event.eventKey)}>{contextTitle(event.eventKey)}</button>
                    <span>{event.relation.label}</span>
                    <small>{event.relation.evidenceLayer} · {event.relation.confidence}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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
                      <button type="button" onClick={() => onFocus?.(place.placeKey)}>{contextTitle(place.placeKey)}</button>
                      <span>{place.relation.label}</span>
                      <small>{place.relation.evidenceLayer} · {place.relation.confidence}</small>
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
                      <small>{person.relation.evidenceLayer} · {person.relation.confidence}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="map-context-empty">{locale === "zh-CN" ? "当前事件还没有人物关系。" : "No figure relations are available for this event yet."}</p>}
            </section>
          </div>
          <RelationNetwork locale={locale} focus={focus} relations={relations} searchItems={searchItems} onFocus={(key) => onFocus?.(key)} compact />
        </section>
      ) : focus?.startsWith("figure:") ? (
        <section className="map-context-panel" data-figure-trajectory aria-labelledby="figure-map-context-title">
          <div className="map-context-heading">
            <div>
              <p className="eyebrow">{locale === "zh-CN" ? "人物轨迹" : "Figure trajectory"}</p>
              <h2 id="figure-map-context-title">{contextTitle(focus)}</h2>
            </div>
            <span>{trajectoryStops.length} {locale === "zh-CN" ? "个空间节点" : "spatial stops"}</span>
          </div>
          <ol className="map-trajectory-list">
            {trajectoryStops.map((feature, index) => (
              <li key={feature.id}>
                <button type="button" onClick={() => onFocus?.(featureKey(feature))}>{index + 1}. {feature.properties.title}</button>
                <span>{feature.properties.placeReality} · {feature.properties.coordinateConfidence}</span>
              </li>
            ))}
          </ol>
          <RelationNetwork locale={locale} focus={focus} relations={relations} searchItems={searchItems} onFocus={(key) => onFocus?.(key)} compact />
        </section>
      ) : (
        <p className="map-context-hint">
          {locale === "zh-CN"
            ? "点击城市查看对应人物；点击人物后，地图会显示其空间节点与一层关系网。"
            : "Select a city to see its figures; select a figure to reveal spatial stops and one-hop relationships."}
        </p>
      )}
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
      <nav className="civilisation-map-node-index" aria-label={locale === "zh-CN" ? "地图地点索引" : "Map place index"}>
        {visibleFeatures.map((feature) => (
          <span className="civilisation-map-node-index-item" key={feature.properties.slug}>
            <button
              data-map-focus="true"
              type="button"
              onClick={() => onFocus?.(featureKey(feature))}
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
      </nav>
      {routes.length > 0 ? (
        <section className="map-route-ledger" aria-labelledby="map-route-ledger-title">
          <p className="eyebrow">{locale === "zh-CN" ? "路线廊道" : "Route corridors"}</p>
          <h3 id="map-route-ledger-title">{locale === "zh-CN" ? "由路线实体派生的空间连接" : "Spatial links derived from route entities"}</h3>
          <ul>
            {routes.map((route) => (
              <li key={route.slug}>
                <Link to={entityPath("route", route.slug, locale)}>{route.title}</Link>
                <span>{route.timeLabel}</span>
                <p>{route.shortSummary}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
