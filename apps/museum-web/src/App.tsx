import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MuseumLayout } from "./layout/MuseumLayout";
import { EntityPage } from "./pages/EntityPage";
import { ExhibitionPage } from "./pages/ExhibitionPage";
import { ExplorePage } from "./pages/ExplorePage";
import { HomePage } from "./pages/HomePage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { MuseumIndexPage } from "./pages/MuseumIndexPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SearchPage } from "./pages/SearchPage";
import { ResearchPage } from "./pages/ResearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MuseumLayout />}>
          <Route index element={<HomePage />} />
          <Route path="museum" element={<MuseumIndexPage />} />
          <Route path="museum/:exhibitionSlug" element={<ExhibitionPage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="research" element={<ResearchPage />} />
          <Route path="methodology" element={<MethodologyPage />} />
          <Route path="figures/:slug" element={<EntityPage kind="figure" />} />
          <Route path="traditions/:slug" element={<EntityPage kind="tradition" />} />
          <Route path="texts/:slug" element={<EntityPage kind="text" />} />
          <Route path="text-versions/:slug" element={<EntityPage kind="text_version" />} />
          <Route path="passages/:slug" element={<EntityPage kind="passage" />} />
          <Route path="concepts/:slug" element={<EntityPage kind="concept" />} />
          <Route path="schools/:slug" element={<EntityPage kind="school" />} />
          <Route path="institutions/:slug" element={<EntityPage kind="institution" />} />
          <Route path="practices/:slug" element={<EntityPage kind="practice" />} />
          <Route path="places/:slug" element={<EntityPage kind="place" />} />
          <Route path="events/:slug" element={<EntityPage kind="event" />} />
          <Route path="routes/:slug" element={<EntityPage kind="route" />} />
          <Route path="objects/:slug" element={<EntityPage kind="museum_object" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
