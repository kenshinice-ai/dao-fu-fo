interface Props {
  name: "arrow" | "museum" | "map" | "timeline" | "graph" | "book" | "search" | "close" | "compass" | "up";
  size?: number;
}

export function Icon({ name, size = 20 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "arrow") return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  if (name === "museum") return <svg {...common}><path d="m3 10 9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" /></svg>;
  if (name === "map") return <svg {...common}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" /></svg>;
  if (name === "timeline") return <svg {...common}><path d="M4 6h16M4 12h10M4 18h16" /><circle cx="17" cy="12" r="2" /></svg>;
  if (name === "graph") return <svg {...common}><circle cx="5" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m7.2 10.9 8.5-3.8M7.2 13.1l8.5 3.8" /></svg>;
  if (name === "compass") return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /><path d="M12 3.5v1.5M12 19v1.5M3.5 12H5M19 12h1.5" /></svg>;
  if (name === "book") return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Zm16 0A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
  if (name === "close") return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  if (name === "up") return <svg {...common}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
  return null;
}
