import { useOutletContext } from "react-router-dom";
import type { Locale } from "./types";

export interface MuseumContext {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export function useMuseumContext(): MuseumContext {
  return useOutletContext<MuseumContext>();
}
