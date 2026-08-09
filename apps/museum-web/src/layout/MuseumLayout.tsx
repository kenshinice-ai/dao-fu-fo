import { useCallback, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { staticData } from "../data/staticData";
import { useStaticData } from "../data/useStaticData";
import { t } from "../i18n";
import type { Locale } from "../types";
import { Icon } from "../components/Icon";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { withLang } from "../routing";

export function MuseumLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locale: Locale = searchParams.get("lang") === "en" ? "en" : "zh-CN";
  const loadProfile = useCallback((signal: AbortSignal) => staticData.profile(locale, signal), [locale]);
  const { data: profile, error } = useStaticData(loadProfile);
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (!profile) return;
    document.documentElement.lang = locale;
    document.title = profile.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", profile.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", profile.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", profile.description);
  }, [locale, profile]);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const setLocale = (next: Locale) => {
    const updated = new URLSearchParams(searchParams);
    updated.set("lang", next);
    setSearchParams(updated, { replace: true });
  };

  if (error) return <ErrorState locale={locale} error={error} />;
  if (!profile) return <LoadingState locale={locale} />;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {locale === "zh-CN" ? "跳到主要内容" : "Skip to main content"}
      </a>
      <header className="museum-header">
        <Link className="brand-lockup" to={withLang("/", locale)} aria-label={profile.title}>
          <span className="brand-seal" aria-hidden="true">三</span>
          <span>
            <strong>{profile.shortTitle}</strong>
            <small>{locale === "zh-CN" ? "文明数字博物馆" : "Digital Museum"}</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label={locale === "zh-CN" ? "主要导航" : "Primary navigation"}>
          <NavLink to={withLang("/museum", locale)}>{t("museum", locale)}</NavLink>
          <NavLink to={withLang("/explore", locale)}>{t("explore", locale)}</NavLink>
          <NavLink to={withLang("/research", locale)}>{t("research", locale)}</NavLink>
          <NavLink to={withLang("/methodology", locale)}>{t("methodology", locale)}</NavLink>
        </nav>

        <div className="header-actions">
          <Link className="icon-button" to={withLang("/search", locale)} aria-label={t("search", locale)}>
            <Icon name="search" />
          </Link>
          <button
            className="language-switch"
            type="button"
            onClick={() => setLocale(locale === "zh-CN" ? "en" : "zh-CN")}
            aria-label={locale === "zh-CN" ? "Switch to English" : "切换到中文"}
          >
            {t("switchLanguage", locale)}
          </button>
        </div>
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet context={{ locale, setLocale }} />
      </main>

      <footer className="museum-footer">
        <div>
          <span className="footer-mark">道 · 儒 · 佛</span>
          <p>{profile.description}</p>
        </div>
        <div className="footer-meta">
          <Link to={withLang("/methodology", locale)}>{t("sources", locale)}</Link>
          <span>{profile.contentVersion}</span>
        </div>
      </footer>
    </div>
  );
}
