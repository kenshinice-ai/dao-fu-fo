# Baseline problem table

| Surface | 390×844 | 1440×900 | Observed problem |
|---|---:|---:|---|
| Explore map, no focus | scrollHeight 2,897px; map top 1,488px | scrollHeight 24,353px; map top 1,127px; width 1,328px | Four Atlas stages render together; the map arrives after a large introductory/control stack and is followed by graph, timeline and object content. |
| Explore map + Xuanzang | scrollHeight 4,476px; map top 1,539px | scrollHeight 8,307px; map top 1,127px | Focus makes the page longer rather than making the map and evidence panel more useful in the first viewport. |
| Explore graph + Xuanzang | scrollHeight 10,263px; first map top 7,326px | scrollHeight 11,664px; first map top 4,484px | `view=graph` does not control the main stage; the user still encounters the map first. Focused graph reports 5 nodes and `data-graph-tier=group`, `data-graph-effective-tier=major`. |
| Explore timeline | scrollHeight 5,443px | scrollHeight 25,178px | `view=timeline` still renders map, graph, timeline and large lists; the timeline is not the primary surface. |
| Figure Xuanzang | scrollHeight 12,958px | scrollHeight 7,136px | Map, graph, timeline and evidence are all present in one long dossier rather than one active mode with a local inspector. |
| Home | scrollHeight 63,375px | scrollHeight 30,417px | Detailed content and the full research directory are mixed with the Atlas stages; the page is technically overflow-safe but vertically exhaustive. |

Additional baseline facts:

- At 1440px, the no-focus Explore DOM contains 4 `.atlas-stage` sections, 1 map, 1 relationship graph and 1 full timeline at the same time.
- At 1440px, the graph canvas is below the map (`top ≈ 2,073px` in the no-focus map route); in graph view the map still exists before the graph.
- At 1440px, the map's effective visual width is 1,328px inside a 1,440px viewport; at 1,920px and 2,560px it remains about 1,438px wide and leaves large horizontal margins.
- Mobile `document.scrollWidth` equals the viewport at 390px, but the lack of horizontal overflow does not solve the excessive vertical sequencing.
- The baseline screenshots and per-page JSON measurements are stored beside this table. Full-page screenshots succeeded for most routes; the very long home pages at 1,920px/2,560px and the no-focus 2,560px map use first-screen plus bottom-segment evidence with the exact full height recorded in JSON.
