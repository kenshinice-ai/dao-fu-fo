import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import type { Locale } from "../types";

export function BackToTopButton({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!visible) return null;
  return (
    <button
      className="back-to-top"
      type="button"
      aria-label={locale === "zh-CN" ? "回到顶部" : "Back to top"}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
    >
      <Icon name="up" />
      <span>{locale === "zh-CN" ? "顶部" : "Top"}</span>
    </button>
  );
}
