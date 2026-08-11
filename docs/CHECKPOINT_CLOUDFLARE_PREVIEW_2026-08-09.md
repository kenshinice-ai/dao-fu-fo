# Cloudflare Preview Checkpoint｜2026-08-09

> 用途：供线上测试与复盘；当前为 Public RC Preview，不是 production 发布。

## Current Public RC audit checkpoint

- `release:alpha-public-rc-1` 已完成正式审核并 promotion：27 个 subject、144/144 `passed`（27 automated schema + 117 `codex:authorized-rc-reviewer` formal records）；Public artifact 为 13 entities / 14 relations / 0 audio / 0 blocker；详细边界见 [Public RC 最终审核与 Preview 复盘](./PUBLIC_RC_FINAL_AUDIT_2026-08-09.md)。
- 当前 Preview branch：`public-rc`；alias：[https://public-rc.dao-ru-fo-digital-museum.pages.dev](https://public-rc.dao-ru-fo-digital-museum.pages.dev)；unique：[https://57cc78db.dao-ru-fo-digital-museum.pages.dev](https://57cc78db.dao-ru-fo-digital-museum.pages.dev)；deployment ID：`57cc78db-1970-485d-808b-33f915a9dfc7`；commit：`cc734cab18f201a1f17f1783e04f66c2748502d8`；production 未发布。
- `npm run check` 通过；完整浏览器 43 passed / 1 skipped，Public-only 1/1，Cloudflare HTTP smoke 23/23；在线浏览器已复盘首页、展览、地图缩放/拖动、人物比较、原典阅读和玄奘条目。
- 本轮修复 Public 地图对 Preview-only route entity 的 SPA fallback JSON parse error，并已重新部署；当前地图主数据和交互正常，公开范围不包含 Preview-only route corridor。

## Latest Public RC relation-evidence checkpoint

- 本轮仍不增加人物、文本、地点或关系；只收窄既有两条人物—长安关系：司马承祯由宽泛的 `c. 713–735` 改为景云二年（约 711）入京的城市尺度锚点，并明确排除后续东都洛阳/王屋山活动；孔颖达由 `c. 630–648` 改为贞观十四年（640）长安务本坊国子学的机构—年份锚点；
- 新增专用 `source:changan-guozijian-gazetteer`，绑定陕西省地方志办公室发布的《碑林区志》PDF、精确 locator 与 `citationStatus=verified`；通用 `source:education-classics-records` 保持原待核状态，避免其余引用被连带误判；两条 relation fact check 仍为 `pending`，没有伪造 formal reviewer approval；
- 编译器回归测试新增两条 relation 时间/来源断言；clean staging 的 `npm run check`、单元测试 17/17、Playwright + axe 33/33 通过，Preview read models 为 206 files / 79 bilingual relations，数据库导入计划为 1208 statements / 30 sources / 144 reviews；
- 最新 Preview：<https://5b4129ba.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`5b4129ba-d001-4394-b16f-b23bb3f864c7`；线上 smoke 23/23 通过；线上 JSON 确认 317 blockers / 17 warnings、173/173 blocking subjects 和 30 sources；浏览器人物页确认 711/640 关系文案可见；Public RC 未 promote，production 仍未触碰。

## Latest Public RC reviewer-filter checkpoint

- 本轮 source of truth 仍不增加内容范围；Research 审核队列新增按正式 reviewer 角色筛选，筛选状态进入 URL，可直接交接和复盘；
- 既有 3 个 entity fact 仍为 `pre_reviewed`，两条人物—长安空间关系仍为 `fact=pending`；当前 144 条 review records = 27 automated schema + 25 agent pre-review + 92 formal pending；所有 `pre_reviewed` 都不计入完成审核；
- Domain schema 的 `pre_reviewed` 规则和 migration 015 不变；只有 `passed` / `waived` 才能进入 completed checks，Public RC 仍保持 27 blockers；本轮只是审核交接可见性改进，未扩大 Public RC 选择范围；
- 隔离 clean staging 的 `npm run check`、单元测试 17/17、Playwright + axe 33/33 和数据库 import plan 均通过；计划为 144 reviews、27 release-candidate subjects、0 promotions；production remains untouched；
- 最新 Preview branch：`first-public-rc`；unique URL：<https://60e89825.dao-ru-fo-digital-museum.pages.dev>；stable alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`60e89825-7a30-4d0a-bdea-04d103b1a774`；
- Online HTTP smoke：23/23 passed；online JSON confirms `qualityBlockers=317`、`reviewSubjects=173`、`blockingSubjects=173`，角色分派数量为历史 2、传统 10、双语 13、权利 27、无障碍 13、策展 27；online browser confirms the historical filter URL and 2-item result；Public RC 未发布、production 未发布。

## Previous Public RC accessibility-gate Preview deployment

- Preview branch：`first-public-rc`；stable alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；unique URL：<https://7aef36c5.dao-ru-fo-digital-museum.pages.dev>；
- Deployment ID：`7aef36c5-2329-4db1-8912-eb3582b3876e`；Wrangler `4.120.0`；本次从隔离 staging 上传，未发布 production；
- Scope boundary: no new people, texts or relations. The compiler now requires `accessibility` for all 13 selected entity subjects (10 core entities plus 3 text-version dependencies); at that checkpoint, 144 review records remained in the source of truth, with 27 automated schema passes and 117 pending role assignments. Automated axe is evidence, not an accessibility reviewer decision;
- Local gates: clean-staging `npm run check` passed; unit tests 17/17; Playwright + axe 33/33; `verify:preview-context` 206 files / 79 bilingual relations; database import plan 144 reviews / 27 release-candidate subjects; Public artifact remains empty and Public RC remains 27 blockers;
- Online verification: `./deploy/smoke-pages.sh` 23/23 passed；online JSON confirms `figure:xuanzang` lists `accessibility` as missing, the cross-text reading exposes `Accessibility: pending · role:accessibility-editor`, the three text sources remain `precise`, and production remains untouched。

## Previous Public RC source-precision Preview deployment

- Preview branch：`first-public-rc`；stable alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；unique URL：<https://7159ce73.dao-ru-fo-digital-museum.pages.dev>；
- Deployment ID：`7159ce73-70f0-4a4e-8642-8c133fd5e55b`；Wrangler `4.120.0`；本次从隔离 staging 上传，未发布 production；
- Scope boundary: no new people, texts or relations. The existing Public RC selection remains 27 subjects with 144 review records (27 automated schema passes and 117 pending role assignments, including 13 entity accessibility assignments). The review packet now fixes the first manual-review scope, source entry points, locator limits, reviewer roles and fail-closed rule;
- Source precision slice: `source:heart-sutra-edition`, `source:daodejing-edition` and `source:analects-edition` now use `locatorLevel=precise`; their verified citation status, exact locators and rights boundaries remain unchanged;
- Local gates: clean-staging `npm run check` passed; unit tests 17/17; Playwright + axe 33/33; `verify:preview-context` 206 files / 79 bilingual relations; database import plan 144 reviews / 27 release-candidate subjects; Public artifact remains empty;
- Online verification: `./deploy/smoke-pages.sh` 23/23 passed；online JSON confirms the three text sources are `precise`, quality report has 317 blockers, review queue has 173 subjects, the cross-text reading shows `pending · role:historical-reviewer`, and the same-text reading remains 2 readings / 7 axes / 8 context relations；production remains untouched。

## Previous Public RC review-assignment Preview deployment

- Preview branch：`first-public-rc`；stable alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；unique URL：<https://512bf65c.dao-ru-fo-digital-museum.pages.dev>；
- Deployment ID：`512bf65c-26f6-4309-9ca4-7d2f4eb6ba89`；Wrangler `4.120.0`；本次从隔离 staging 上传，未发布 production；
- User-visible scope: no new content scope. The first Public RC selection now carries 131 review records across 27 subjects: 27 automated schema passes and 104 pending role assignments. Text reading cards show pending role, status and note; pending is not approval;
- Local gates: `npm run check` passed; unit tests 17/17; Playwright + axe 33/33; `verify:preview-context` 206 files / 79 bilingual relations; database import plan 131 reviews / 27 release-candidate subjects; Public artifact remains empty;
- Online verification: `./deploy/smoke-pages.sh` 23/23 passed；online JSON confirms `317` quality blockers, `173` review subjects, `figure:xuanzang` has completed `schema`, and the cross-text reading exposes a pending historical-reviewer assignment；production remains untouched。

## Latest same-text version Preview deployment

- Preview branch：`first-public-rc`；stable alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；unique URL：<https://a4fcca9a.dao-ru-fo-digital-museum.pages.dev>；
- Deployment ID：`a4fcca9a-4206-4971-b174-cf489ed3a141`；Wrangler `4.120.0`；本次从隔离的 clean staging 上传，源工作树仍保留用户现有 dirty/iCloud 状态，未执行 production 发布；
- User-visible scope: the existing figure comparison and cross-text reading remain; the Preview adds `dhammacakkappavattana-version-reading`, a same-text reading of a Pāli excerpt and Thanissaro English translation. Each reading keeps its text version, locator, wording, attribution, interpretation, time, evidence/rights and reviewer evidence. `suffering / stress` is explicitly labelled a translator-wording difference, not a Pāli manuscript variant;
- Local gates: clean-staging `npm run check` passed; unit tests `17/17`; Playwright + axe `33/33`; `verify:preview-context` confirms `206` generated compiler Preview files and `79` bilingual relations; quality report is `317` blockers / `17` warnings and review queue is `173/173` blocking subjects; dist contains `221` files;
- Online verification: `./deploy/smoke-pages.sh` 23/23 passed；双语 `/data/v2/text-readings/dhammacakkappavattana-version-reading.{en,zh-CN}.json` each report `2` readings / `2` versions / `7` axes / `8` context relations；原有跨文本 JSON and same-text SPA route both returned successfully；production remains untouched。

## Latest text-reading Preview deployment

- Preview branch：`first-public-rc`；stable alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；unique URL：<https://331d0b3f.dao-ru-fo-digital-museum.pages.dev>；
- Deployment ID：`331d0b3f-efd5-44a0-bd3c-4e4a3da0da3b`；Wrangler `4.120.0`；git commit：`cc734cab18f201a1f17f1783e04f66c2748502d8`；source tree 保持 dirty，但部署来自隔离的干净 staging，未把 iCloud 冲突副本带入 Preview；
- User-visible scope: full Preview compiler read models—178 bilingual entity artifacts, 89 search items, 25 bilingual sources, 8 real map points, 63 timeline entries, 4-node/5-edge bilingual sacred-cosmos model without coordinate fields, 48 graph nodes/75 graph edges, 75 bilingual contextual relations, quality/review manifests, and the bilingual `cross-era-figures` comparison; this update adds `three-traditions-passage-reading` with one Daodejing, Analects and Dhammacakkappavattana Sutta passage, each linked to its text version and shown across seven axes: textual layer, locator, wording, attribution, interpretation, time, and evidence/rights;
- Local gates: clean-staging `npm run check` passed; unit tests `16/16` passed; Playwright + axe `32/32` passed; `verify:preview-context` confirms `200` generated compiler Preview files and `75` relations for both locales; comparison JSONs confirm `3` entities / `9` axes / `2` bridges, and text-reading JSONs confirm `3` passages / `7` axes / `25` context relations in both locales; `verify:domain-architecture` confirms six complete dossiers;
- Artifact: content version `2026.08.prototype.1`; local dist files `213`; `index.html` SHA-256 `3508b8525f8ad2bccf0e4d06084f049fd345ac9c387b1aaa4d1b6e7e9161c0fb`; app JS SHA-256 `dc432ba1518e2f625afb9c028d398213843e85925781a1d847d100a21d9b584f`; React vendor JS SHA-256 `962fcc744b729dc0f1cfab485b00f4b392b15b4edd27f54512aa72512e08de00`; CSS SHA-256 `971cdab3653820eff2496050eb39d9cc0d3db0079e704dc60b02694a6bfdfd15`; content manifest SHA-256 `edda6d13bd1da2581c8ce9c17ce6c171e32893f695fadcdcf04d9bc7f873166d`; `_headers` SHA-256 `bd9aa3f8c9089564d702509351bb58bc5d28fd4d94dc08b58a19da52560bd8b4`; `_redirects` SHA-256 `6036983e5fc00f0169c9e939b1816ed771eee00e27f2fcc517b819041460b9ef`;
- Online verification: `./deploy/smoke-pages.sh` 23/23 passed；`/text-readings?lang=en&set=three-traditions-passage-reading` 返回 SPA shell；双语文本对读 JSON 各为 3 readings / 7 axes / 25 context relations；人物比较 JSON 仍为 3 entities / 9 axes / 2 bridges；稳定 alias 同样复验通过；生产环境仍未触碰。

## Deployment

- Project: `dao-ru-fo-digital-museum`
- Production branch configured in Pages: `main`
- Preview branch: `first-public-rc`
- Stable preview alias: <https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>
- Unique deployment URL: <https://b73334f3.dao-ru-fo-digital-museum.pages.dev>
- Deployment ID: `b73334f3-8a8c-44a4-96db-724f923da486`
- Git commit: `cafc52fdbc89bffb21f5c250fd022134d80cb093`
- Wrangler: `4.120.0`
- Deploy tree: clean

## Latest shared-context Preview update

- Latest unique Preview URL: <https://63184296.dao-ru-fo-digital-museum.pages.dev>
- Stable branch alias remains: <https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>
- Deployment ID: `63184296-3706-4beb-846e-d7e95ee563d7`；build commit: `cc734cab18f201a1f17f1783e04f66c2748502d8`；deployment tree was dirty because current working changes were intentionally included for Preview review;
- User-visible update: compiler relation read model (51 bilingual relations) is available in Preview; Explore now has shareable `focus` context cards for Xuanzang, Sima Chengzhen and Kong Yingda, connecting figures, events, places, institutions and texts, with relation-driven map/timeline/graph highlights; existing map zoom, pan, reset, keyboard controls and place navigation remain available;
- Online smoke: 23/23 passed; online bilingual relation read model check: 51/51 relations reachable for each locale; online headless browser shared-context smoke passed; local browser suite: 22/22 passed including the three-person flow.
- This is still the first-viewable prototype plus the explicit relation context layer; it does not publish the full Alpha entity/source/review artifacts or Public RC content.

## Artifact

- Release stage: `first-viewable-prototype`
- Content version: `2026.08.prototype.1`
- Dist files: 37
- Dist bytes: 606182
- `index.html` SHA-256: `0856713096603e13c81b9b35c27a651921af6ca88983d5b858ad2e1f103fdac5`
- App JS SHA-256: `dd0b8434f8c891235e1368d325288531fd9303dff7874389398342f8fcd036cf`
- CSS SHA-256: `2cb8cbcda0c2ecd77912d6251d07eb5da5a621ecb60cb973eb89ed1ba493a054`
- Content manifest SHA-256: `edda6d13bd1da2581c8ce9c17ce6c171e32893f695fadcdcf04d9bc7f873166d`

## Verification

- Repository release gates: passed during `deploy/cloudflare-pages.sh preview first-public-rc`
- Online HTTP smoke: 23/23 passed
- Verified online routes: `/`, `/museum/changan-three-traditions`, `/figures/xuanzang`, `/passages/form-is-emptiness`
- Verified static splits: English profile, manifest, map GeoJSON, fingerprinted app asset
- Browser acceptance: homepage loaded; Xuanzang detail loaded; no console error/warn observed

## Boundary and next work

- The Preview serves the existing first-viewable prototype under `apps/museum-web/public/data/v2` plus the explicitly copied bilingual relation read model under `data/v2/relations`; `verify:preview-context` checks it against the compiler artifact.
- The Public RC remains `planning`; latest RC report is 27 blockers / 27 warnings.
- Do not promote Preview to production until Preview review, production release evidence and production smoke are complete.
- Continue Public RC source, rights, bilingual and review checks; only then connect the compiler Public artifact to the public release path.
