import type { Locale } from "../types";
import { t } from "../i18n";

export function LoadingState({ locale }: { locale: Locale }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-seal" aria-hidden="true" />
      <p>{t("loading", locale)}…</p>
    </div>
  );
}

export function ErrorState({ locale, error }: { locale: Locale; error: Error }) {
  return (
    <div className="error-state" role="alert">
      <strong>{t("error", locale)}</strong>
      <span>{error.message}</span>
    </div>
  );
}
