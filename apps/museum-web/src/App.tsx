import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes, useSearchParams } from "react-router-dom";
import { LoadingState } from "./components/LoadingState";
import { MuseumLayout } from "./layout/MuseumLayout";

const EntityPage = lazy(() => import("./pages/EntityPage").then((module) => ({ default: module.EntityPage })));
const ComparePage = lazy(() => import("./pages/ComparePage").then((module) => ({ default: module.ComparePage })));
const TextReadingPage = lazy(() => import("./pages/TextReadingPage").then((module) => ({ default: module.TextReadingPage })));
const ExhibitionPage = lazy(() => import("./pages/ExhibitionPage").then((module) => ({ default: module.ExhibitionPage })));
const ExplorePage = lazy(() => import("./pages/ExplorePage").then((module) => ({ default: module.ExplorePage })));
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage").then((module) => ({ default: module.MethodologyPage })));
const MuseumIndexPage = lazy(() => import("./pages/MuseumIndexPage").then((module) => ({ default: module.MuseumIndexPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const ResearchPage = lazy(() => import("./pages/ResearchPage").then((module) => ({ default: module.ResearchPage })));

function RouteLoading() {
  const [searchParams] = useSearchParams();
  return <LoadingState locale={searchParams.get("lang") === "en" ? "en" : "zh-CN"} />;
}

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MuseumLayout />}>
          <Route index element={lazyRoute(<HomePage />)} />
          <Route path="museum" element={lazyRoute(<MuseumIndexPage />)} />
          <Route path="museum/:exhibitionSlug" element={lazyRoute(<ExhibitionPage />)} />
          <Route path="explore" element={lazyRoute(<ExplorePage />)} />
          <Route path="compare" element={lazyRoute(<ComparePage />)} />
          <Route path="text-readings" element={lazyRoute(<TextReadingPage />)} />
          <Route path="search" element={lazyRoute(<SearchPage />)} />
          <Route path="research" element={lazyRoute(<ResearchPage />)} />
          <Route path="methodology" element={lazyRoute(<MethodologyPage />)} />
          <Route path="figures/:slug" element={lazyRoute(<EntityPage kind="figure" />)} />
          <Route path="traditions/:slug" element={lazyRoute(<EntityPage kind="tradition" />)} />
          <Route path="texts/:slug" element={lazyRoute(<EntityPage kind="text" />)} />
          <Route path="text-versions/:slug" element={lazyRoute(<EntityPage kind="text_version" />)} />
          <Route path="passages/:slug" element={lazyRoute(<EntityPage kind="passage" />)} />
          <Route path="concepts/:slug" element={lazyRoute(<EntityPage kind="concept" />)} />
          <Route path="schools/:slug" element={lazyRoute(<EntityPage kind="school" />)} />
          <Route path="institutions/:slug" element={lazyRoute(<EntityPage kind="institution" />)} />
          <Route path="practices/:slug" element={lazyRoute(<EntityPage kind="practice" />)} />
          <Route path="places/:slug" element={lazyRoute(<EntityPage kind="place" />)} />
          <Route path="events/:slug" element={lazyRoute(<EntityPage kind="event" />)} />
          <Route path="routes/:slug" element={lazyRoute(<EntityPage kind="route" />)} />
          <Route path="objects/:slug" element={lazyRoute(<EntityPage kind="museum_object" />)} />
          <Route path="*" element={lazyRoute(<NotFoundPage />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
