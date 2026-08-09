import type { Tradition } from "../types";

const glyphs: Record<Tradition | "convergence", string> = {
  buddhism: "佛",
  daoism: "道",
  confucianism: "儒",
  convergence: "合",
};

export function TraditionMark({
  tradition,
  size = "md",
}: {
  tradition: Tradition | "convergence";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`tradition-mark tradition-${tradition} tradition-mark-${size}`} aria-hidden="true">
      {glyphs[tradition]}
    </span>
  );
}
