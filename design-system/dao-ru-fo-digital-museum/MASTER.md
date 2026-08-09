# 道·儒·佛文明数字博物馆｜Design System Master

> Status: Frozen for first public prototype
> Generated with `ui-ux-pro-max`, then curated for the museum domain
> Product: Museum / Gallery + Editorial knowledge experience
> Stack: React + Vite
> Density: Spacious
> Motion: Restrained, explanatory

## 1. Design direction

The interface combines:

- Editorial Grid / Magazine;
- Swiss Modernism 2.0;
- modern museum white space;
- Chinese book and stele typography;
- low-contrast paper, mineral pigment and ink textures.

Avoid:

- SaaS dashboard styling;
- pink newsletter accents from the generic generator;
- temple-tourism gold/red surfaces;
- decorative pseudo-calligraphy;
- glassmorphism;
- large card shadows;
- emojis as icons.

## 2. Golden-ratio system

The golden ratio `φ = 1.618` is used as a hierarchy tool, not as decoration.

### Layout

- Primary split: `61.8% / 38.2%`.
- Secondary split: `38.2% / 23.6% / 38.2%` when three zones are needed.
- Hero minimum height: `61.8vh`.
- Editorial media aspect ratio: `1.618 / 1`.
- Main text measure: `min(68ch, 61.8vw)`.
- Maximum content width: `1440px`.

### Type scale

Based on `√φ ≈ 1.272`:

```text
0.875rem
1rem
1.272rem
1.618rem
2.058rem
2.618rem
4.236rem
```

### Spacing

Use a Fibonacci-derived rhythm aligned to a 4px base:

```text
4 / 8 / 13 / 21 / 34 / 55 / 89 / 144px
```

## 3. Color tokens

```css
:root {
  --canvas: #f3efe5;
  --canvas-elevated: #fbf8f0;
  --ink: #202522;
  --ink-soft: #58605b;
  --line: rgba(32, 37, 34, 0.16);
  --line-strong: rgba(32, 37, 34, 0.3);
  --buddhist: #9b6428;
  --buddhist-soft: #eadcc5;
  --daoist: #2e665d;
  --daoist-soft: #d8e4df;
  --confucian: #8a4037;
  --confucian-soft: #ead8d4;
  --mythic: #675982;
  --historical: #526477;
  --gold: #b18a45;
  --focus: #1f5f91;
  --danger: #a7332f;
}
```

Rules:

- Tradition colors appear on borders, labels, nodes and small fields.
- Never use color as the only carrier of evidence or status.
- Body text contrast must meet WCAG AA.
- Gold is a curatorial accent, not a full background.

## 4. Typography

- Display: `"Noto Serif SC", "Songti SC", "STSong", Georgia, serif`.
- Body/UI: `"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`.
- English display may fall back to Georgia.
- Classical passages use serif with increased line-height.
- UI labels, years and evidence badges use sans-serif.
- No remote font is required for the first release.

## 5. Grid

- 12-column desktop grid.
- Golden split commonly maps to 7 columns + 5 columns.
- Tablet: 8 columns.
- Mobile: 4 columns and a single reading flow.
- Adaptive gutters: 21px mobile, 34px tablet, 55px desktop.
- No horizontal page scrolling.

## 6. Components

### Buttons

- Minimum target: 44×44px.
- 1px border, 8px radius.
- Primary actions use ink or tradition color, never neon.
- Feedback duration: 180–260ms.
- Hover must not shift layout bounds.

### Cards

- Prefer borders and spacing over shadows.
- Radius: 10–14px.
- Featured cards may use one restrained shadow.
- Content cards use an editorial top rule and visible type labels.

### Entity labels

- Museum-label structure: accession/type → title → date → explanation.
- Evidence and tradition labels remain visible without opening detail.

### Passage cards

- Original text first.
- Interpretation second.
- Source locator always visible.
- Never generate an unsourced “quote poster”.

## 7. Motion

- Standard transitions: 180–280ms.
- Large exhibition transitions: max 600ms.
- Motion explains spatial, temporal or relational change.
- No continuous ambient motion in the default experience.
- Respect `prefers-reduced-motion`.

## 8. Accessibility

- Skip link.
- Sequential heading hierarchy.
- Full keyboard navigation.
- Visible focus.
- Map, graph and timeline require accessible list alternatives.
- All controls have text or `aria-label`.
- Meaningful media requires bilingual alt text.
- 200% zoom must remain usable.

## 9. Responsive

- 390px: single column, full-screen detail sheet, bottom-safe spacing.
- 768px: stacked editorial regions.
- 1024px: compact golden split.
- 1440px: full 7/5 golden grid.
- Sticky navigation must reserve its own space.

## 10. Pre-delivery

- No emojis as structural icons.
- No raw hex values in components.
- No hover-only information.
- No content hidden behind sticky UI.
- Test 390/768/1024/1440.
- Test keyboard and reduced motion.
- Test both languages.
- Confirm build uses split static artifacts and no localhost API.
