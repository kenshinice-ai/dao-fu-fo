# Atlas structure refactor — after evidence

Captured from the local production-shaped Vite build on 2026-08-16 at 390×844, 768×1024, 1440×900, 1920×1080 and 2560×1440.

## Acceptance snapshot

| Check | Result |
| --- | --- |
| 1440 first map canvas top | 330px (target ≤360px) |
| 1920 Atlas width | 1862px (target ≥1800px) |
| 2560 Atlas width | 2400px (target ≈2400px) |
| Explore desktop stages | 1 visible stage per route (map, graph or timeline) |
| Map + Xuanzang at 1440 | map 648px + trajectory panel 648px, same height |
| Graph all | 152 nodes, 148 edges, `effectiveTier=all`, focus visible, no map/object panel |
| Timeline at 2560 | 2300px document height (target ≤2300px) |
| Mobile horizontal overflow | none across all 30 responsive captures |
| Home directory | 152 cards retained; search verified at `Xuanzang → 3 / 152` |
| Map context mini graph | removed from map context; relation detail remains available in the object/dossier flows |

## Before → after document height

Values are from `before/metrics.json` and the final `metrics.json` in this directory.

| Route / viewport | Before | After |
| --- | ---: | ---: |
| Map, no focus · 390×844 | 2897px | 2373px |
| Map + Xuanzang · 390×844 | 4476px | 2843px |
| Graph + Xuanzang · 390×844 | 10263px | 2878px |
| Timeline · 390×844 | 5443px | 3000px |
| Figure Xuanzang · 390×844 | 12958px | 12903px |
| Home directory · 390×844 | 63375px | 59870px |
| Map, no focus · 1440×900 | 24353px | 1819px |
| Map + Xuanzang · 1440×900 | 8307px | 1839px |
| Graph + Xuanzang · 1440×900 | 11664px | 1917px |
| Timeline · 1440×900 | 25178px | 2182px |
| Figure Xuanzang · 1440×900 | 7136px | 7081px |
| Home directory · 1440×900 | 30417px | 20833px |
| Map + Xuanzang · 1920×1080 | 8473px | 2011px |
| Graph + Xuanzang · 1920×1080 | 11802px | 1964px |
| Timeline · 1920×1080 | 25303px | 2288px |
| Map + Xuanzang · 2560×1440 | 8489px | 2011px |
| Graph + Xuanzang · 2560×1440 | 11846px | 2059px |
| Timeline · 2560×1440 | 25276px | 2300px |

## Evidence files

- `metrics.json`: final metrics for all 30 route/viewport combinations.
- `graph-all-metrics.json`: explicit full-population graph acceptance at 390×844 and 1440×900.
- `*-viewport.png`: final viewport screenshots for all 30 route/viewport combinations, plus graph-all captures.
- `../before/`: read-only baseline observations, problem table, metrics and screenshots.
