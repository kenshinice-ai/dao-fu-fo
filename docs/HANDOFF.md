# 道·儒·佛文明数字博物馆｜项目交接文档

> 维护纪律：每个可独立说明的实现、修复、验证或发布阶段完成后立即更新。
> 最后更新：2026-08-13
> 当前阶段：首批 100 人物内容闭环已提交并同步 Cloudflare production，等待用户复盘确认后再继续扩容

## 2026-08-13｜首批 100 人物—地点—事件—关系内容闭环（当前）

- 用户已明确授权从 60 位扩展到首批约 100 位人物；本轮新增 40 位人物、40 个事件、20 个地点，并将总量对齐为：人物 100、事件 105、地点 60、路线 4、关系 471、来源 81、音频 3；Full Alpha 仍为 `preview` visibility，不等同 Public RC 或正式学术发布；
- 新增人物按儒家/先秦与经学 14、道教 10、佛教 16 分组；每位人物都有双语 identity/summary/research note、figure class、historicity、时间断言、来源和地点入口；魏伯阳、许逊使用 `traditional_sage` + `traditional_date` + `remembered_in`，没有被伪画成历史路线；
- 每位新增人物均闭合 `figure → participated_in → event → occurred_at → place`，另有 `figure → active_in/remembered_in/born_in/travelled_through → place`；每位新增人物至少与一位已有数据库人物建立 `contemporary_with`、`received_by` 或 `influenced` 关系，避免新增人物成为孤立名单；孔子—班固、慧能—黄梅和全部新增人物交叉关系均已纳入统一 `relations.json`；
- 关系、地图、时间轴和对象面板继续沿用 Bible Atlas / previous project 的单一 canonical focus：实体点击只改变共享焦点，所有面板从同一关系集合反向派生；传统记忆关系不进入现实到访投影，事件地点通过 `participated_in → occurred_at` 生成；本轮修复时间轴事件节点优先写入 `focus=event:*`，不再被地点 context 抢占；首页人物/传统统计改为从当前 search read model 动态派生，不再显示旧的 60 人基线；
- 新增 `scripts/verify-first-100-batch.mjs` 与 `npm run verify:first-100`，作为批次级 Handoff 门禁，检查批次数量、总量、时间、来源、关系端点、地点引用和新增人物—既有人物连接；
- 本地已通过：`npm run check` 全量门禁；`npm run build:content`（328 entities / 471 relations / 81 sources）、`npm run verify:content`、`npm run verify:alignment`（source/read-model entities 328/328，database 331（三传统字典实体为额外 3 项）；relations 471/471/471，warnings 0）、`npm run verify:domain-architecture`、`npm run verify:database-bundle`、`npm run verify:preview-context`、`npm run verify:first-100`；完整 Playwright + axe 为 **62 passed / 1 skipped**（唯一 skipped 为 Public RC 专用用例）；
- 当前不继续增加人物或地点，先等待用户对首批人物选择、史实关系、坐标尺度和页面联动复盘确认；下一次扩容必须沿用同一闭环和门禁；`ee3d0cb feat: expand full alpha atlas to first 100 figures` 已 push 到 `origin/main`。
- Cloudflare production 已同步 Full Alpha：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；本次 unique deployment <https://dbca74c2.dao-ru-fo-digital-museum.pages.dev>；deployment ID `dbca74c2-4791-439c-8c9f-594697b11495`；Environment `Production`；branch `main`；source marker `ee3d0cb`（`ee3d0cb41556dbfdc0081c3a82bfabd08d15312b`）；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；dist 705 files；production 上传使用 clean worktree 与 `--commit-dirty=false`。
- post-deploy HTTP smoke：unique 地址与默认地址均 **25/25**；首页 HTML/CSP/安全响应头、SPA deep links、manifest、英文 profile、地图 GeoJSON、时间轴 JSON 和 immutable hashed asset 均通过；线上浏览器确认 Qufu → Confucius 为单一 `focus=figure:confucius`、Figures 21 项，Relations URL 与面板同步为 46 条关系；本 handoff 更新为 docs-only follow-up，不重新上传应用。

## 2026-08-12｜Bible Atlas 单实体状态链与扩展研究图谱 production handoff（当前）

- 本轮重新对照线上 Bible Atlas、本地 `The Bible Atlas` 与 `previous project` 的 `ExploreState`、`AtlasMap`、`EntityDrawer` 和 URL 序列化实现，确认核心约束是“每次实体点击只留下一个规范实体，面板类型随实体同步，地图/时间轴/关系从该实体反向派生”；据此移除地点 → 人物、地点关系节点 → 人物时遗留的第二 `scope`，地点焦点归入 Places、人物归入 Figures、事件归入 Events、路线归入 Routes；关系卡点击人物会离开 Relations，不再出现 URL 指向人物而界面仍停在关系面板的混合状态；
- 修复 route-state 的 parse / serialize round-trip：无显式 tab 的深链接按 `focus` 类型选择面板；当用户选择的面板不同于焦点推导面板时，即使是默认 Figures，也显式保留 `tab=figures`，避免序列化删参后被重新解析回 Places；新增 core 单元回归和地图地点 → 人物、关系 → 人物、龟兹 → 玄奘、那烂陀 → 义净、事件 → 地点/人物、路线节点等 Playwright 回归；
- Full Alpha 内容扩展与空间对齐同步进入本批：人物 60、事件 65、地点 40、路线 4、关系 299、来源 70、音频 3；新增义净海上求法区域骨架，并补齐玄奘长安—敦煌—龟兹—那烂陀路线节点；真实地图为 35 个地点。`verify:alignment` 确认 source/read-model 实体 228/228、关系 299/299、database bundle 231 entities / 299 relations、warnings 0；
- 本地门禁：`npm run check` 全量通过；core 11/11、compiler 5/5、web 9/9；完整 Playwright + axe 为 **61 passed / 1 skipped**（唯一 skipped 为 Public RC 专用用例）；diff-check、`git diff --check`、Full Alpha build、数据库 import plan、静态发布验证均通过；Vite >500 kB bundle 提示仍为非阻断既有提示；应用 release commit：`444d34b fix: align atlas navigation and research graph`（`444d34be9a3a4d1bd6adb6adf106688460552266`）；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；本次 unique deployment <https://1c08d5bb.dao-ru-fo-digital-museum.pages.dev>；deployment ID `1c08d5bb-4f9e-4d2b-acf1-926d7e37b24c`；Environment `Production`；branch `main`；source marker `444d34b`；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传使用 clean worktree 与 `--commit-dirty=false`；上一成功 production deployment `8d0b6109-401d-4edb-b9f4-fb33b11260dc` 保留为回滚定位；
- post-deploy HTTP smoke：默认地址与 unique 地址均 **25/25**；首页 HTML/CSP/安全响应头、SPA deep links、manifest、英文 profile、地图 GeoJSON、时间轴 JSON 和 immutable hashed asset 均通过；线上浏览器确认 Qufu 初始为 Places，点击 Confucius 后 URL 为 `focus=figure:confucius`、Figures 激活且无 `scope`；全局 Relations 的 Dao'an → Huiyuan 卡点击后切为 `focus=figure:dao-an` 且清除 relation tab；unique 地址 Kucha → Xuanzang 同样进入单一人物焦点并无 scope 泄漏；
- Full Alpha 的 `preview` visibility 与 684 个 public blockers 继续表示研究内容审核状态，不等于 Cloudflare Preview branch、Public RC 或正式学术发布；仓库当前没有配置 Git remote，因此 commit 已落在本地 iCloud 工作区但没有远端 push 目标；本 handoff 为 docs-only follow-up，不重新上传应用、不改变已部署 source marker。

## 2026-08-11｜地图→人物→关系语境对齐修复 production handoff（当前）

- 本轮修复地图地点 → 人物 → 关系面板的完整状态链路：地点/事件 dossier 内选人物时保留显式 `scope`，切换新地点时清除旧 scope；人物聚焦的 Relations tab 只显示触及当前人物的现实人物关系；地点/事件 scope 下进一步限制为该语境内的现实人物关系；返回入口同时恢复正确 tab 并清理 scope；地图从地点切到人物/事件时关闭旧 Leaflet popup，避免 URL、面板和地图弹窗指向不同对象；`influenced` 与 `contemporary_with` 分别显示方向箭头和双向连接符；
- 本轮新增 place-to-person scope、空关系结果、返回地点、关系方向和旧 popup 清理回归覆盖；应用 release commit：`a0fa639 fix: keep atlas focus scope and relation context aligned`（`a0fa639158200f430440075f97ac416ee27d5396`）；
- 本地门禁：production 脚本完整 `npm run check` 通过；Web unit 9/9；完整 Full Alpha Playwright 为 **57 passed / 1 skipped**（唯一 skipped 为 Public RC 专用用例）；typecheck、Full Alpha build、`verify:content`、`verify:alignment` 和静态发布验证通过；Vite >500 kB bundle 提示仍为非阻断既有提示；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；本次 unique deployment <https://8d0b6109.dao-ru-fo-digital-museum.pages.dev>；deployment ID `8d0b6109-401d-4edb-b9f4-fb33b11260dc`；Environment `Production`；branch `main`；source marker `a0fa639`；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传使用 `--commit-dirty=false`；
- post-deploy HTTP smoke：默认地址与 unique 地址均 **25/25**；首页 HTML/CSP/安全响应头、SPA deep links、manifest、英文 profile、地图 GeoJSON、时间轴 JSON 和 immutable hashed asset 均通过；上一成功 production deployment `f9d4861e-d366-48b4-999a-3d3604a3140c` 保留为回滚定位；
- 线上浏览器关键路径：Qufu 页面点击 Confucius 后 URL 保持 `focus=figure:confucius&scope=place:qufu`，Figures scope 为 1；切换 Relations 后显示 `Qufu · Person relations in this place · 0`、无关系卡；返回后恢复 `focus=place:qufu`，清除 `scope` 与 `tab`，Qufu 人物入口恢复；线上控制台 error/warn 为 0；
- Full Alpha 的 `preview` visibility 与 410 个 public blockers 仍代表内容审核状态，不等于 Public RC 或正式学术发布；本 handoff 文档为 docs-only follow-up，不重新上传应用、不改变已部署应用 source marker。

## 2026-08-11｜人物关系、地点对应与数据库对齐修复 production handoff（当前）

- 本轮针对人物关系和地点对应的逻辑错配完成全量审计：地图人物地点只接受 `active_in`、`travelled_through`、`born_in`、`located_in`；人物—事件—地点只通过 `participated_in → occurred_at` 投影；`remembered_in`、`influenced` 等记忆/接受/影响关系继续保留在关系网络，但不再伪装成现实到访或地图停靠点；出生地详情兼容关系端点双向表达；路线由完整 search/read model 动态加载，不再写死两条；
- 新增 [verify-content-alignment.mjs](../scripts/verify-content-alignment.mjs)，逐项核对 source entities、双语 read model、search index、relations、database import bundle、稳定 UUID、时间断言、路线 manifest 和地图坐标；源实体 159 / read-model 159 / relations 191 均对齐，数据库 162 个实体中额外 3 个为三传统字典实体，数据库关系端点无悬空；
- 当前 Full Alpha 内容边界：159 个实体（人物 32、事件 37、地点 28、路线 3、文本 16、文本版本 8、概念 6、机构 6、博物馆对象 9、段落 14）、191 条关系、64 个来源、3 条音频；21 个现实地图地点；410 个 public blockers 仍是内容审核状态；
- 本地门禁：`npm run check`、Full Alpha Vite build、`DRF_WEB_DEPLOYMENT_MODE=full-alpha npm run verify:static` 均通过；Full Alpha Playwright 为 **56 passed / 1 skipped**（57 tests，唯一 skipped 为 Public RC 专用用例）；新增坐标待核用例、人物关系、路线数量和 axe 回归均通过；Vite >500 kB bundle 提示仍为非阻断既有提示；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；本次 unique deployment <https://f9d4861e.dao-ru-fo-digital-museum.pages.dev>；deployment ID `f9d4861e-d366-48b4-999a-3d3604a3140c`；Environment `Production`；branch `main`；source marker `9ab2297`（`9ab2297e3fe0043729fe45427e5b271d995d55f4`）；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传使用 `--commit-dirty=false`；
- post-deploy HTTP smoke：默认地址与 unique 地址均 **25/25**；检查首页 HTML/CSP/安全响应头、SPA deep links、manifest、英文 profile、地图 GeoJSON、时间轴 JSON 和 immutable hashed asset 均通过；线上 deployment list 已确认 `9ab2297` 为当前 production，上一成功 deployment `dcc5936e-f2c7-4855-9348-6e73a23b19c8` 保留为回滚定位；
- 已知数据提醒：龟兹实体存在，但当前没有可绘制现实坐标；玄奘路线包含该待核节点。UI 保留关系并明确标记 pending，不生成伪坐标；这不是运行时失败；
- 本 handoff 文档为 docs-only follow-up，不重新上传应用、不改变已部署应用 source marker；当前 production 进入线上复盘节点，下一轮只处理用户复盘反馈或经授权的坐标/内容审核。

## 2026-08-11｜P0/P1/P2 atlas 探索体验优化 production handoff（当前）

- 本轮执行参考站与 `previous project` 清单中的全部 P0/P1/P2：统一 URL 状态（搜索、地图图层、LOD、焦点、详情）、渐进式对象/关系列表、地图—时间轴—关系图共用四级 LOD、地图图层/图例/不确定性表达、时间轴密度与范围控制、关系图文本兜底、全局搜索、详情相邻浏览与意义摘要、证据 formatter、现场数据说明、时间轴播放、人物轨迹步进、移动端单视图和 read-model 请求缓存；实现集中在 `AtlasWorkspace.tsx`、`CivilisationMap.tsx`、`RelationNetwork.tsx`、`GlobalSearch.tsx`、`labels.ts`、`route-state.ts` 与 `styles.css`；release commit：`bd4d247 feat: add atlas exploration controls and progressive context`；
- 本地门禁：`npm run check` 全量通过；core 8/8、compiler 5/5、web 7/7；完整 Playwright + axe 为 **55 passed / 1 skipped**（唯一 skipped 为 Public RC 专用用例）；`git diff --check` 与静态发布校验通过；Vite 的 >500 kB bundle 提示仍为非阻断既有提示；
- 内容边界：Full Alpha 为 159 个实体（人物 32、事件 37、地点 28、路线 3、文本 16、文本版本 8、概念 6、机构 6、博物馆对象 9、段落 14）、191 条关系、64 个来源、3 条音频；410 个 public blockers 仍是内容审核状态；Public RC2 独立保持 34 entities / 41 relations / 0 audio / 0 blocker；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；本次 unique deployment <https://dcc5936e.dao-ru-fo-digital-museum.pages.dev>；deployment ID `dcc5936e-f2c7-4855-9348-6e73a23b19c8`；Environment `Production`；branch `main`；source marker `bd4d247`（`bd4d247e4ba583bbfb0cf5ec1c17a86c680b71ce`）；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传使用 `--commit-dirty=false`；
- post-deploy HTTP smoke：默认地址与 unique 地址均 **25/25**；检查首页 HTML/CSP/安全响应头、SPA deep links、manifest、英文 profile、地图 GeoJSON、时间轴 JSON 和 immutable hashed asset 均通过；上一成功 production deployment `472d4e52-c135-4c13-aa46-a7bfebe6cab1` 作为回滚定位；
- 线上浏览器复核：中文首页显示 21 个地点、2 条路线、131 个时间事件和 32 位人物；英文全局搜索“玄奘”进入 `focus=figure:xuanzang&detail=figure:xuanzang` 并打开详情抽屉，意义摘要与“有文献依据”可见；390px 英文 Explore 页面 `body.scrollWidth=390`，切换 Objects 后地图与时间轴隐藏、对象面板保留；console error/warn 为空；
- 本 handoff 文档为 docs-only follow-up，不重新上传应用、不改变已部署 source marker；当前 production 进入可线上复盘节点，下一轮只处理用户复盘反馈或经授权的内容扩充。

## 2026-08-11｜城市语境保持与时代语境卡 release handoff（上一阶段）

- 修复“长安 → 人物”后回到全部人物清单的状态边界：路由状态新增可分享的 `scope`，人物 `focus` 与城市 `scope` 分开保存；从长安人物或城市关系节点进入人物时使用 `focus=figure:*&scope=place:changan`，右侧继续显示 13 位长安关联人物；面板提供“回到长安”恢复入口；清除焦点会同时清除 scope；地图 marker、事件和轨迹节点会显式清除旧城市 scope，避免把旧语境带到新对象；
- 城市关系图继续严格只投影现实人物—现实人物的 `influenced` / `contemporary_with`，并在城市 scope 下联动；线上已验证长安人物列表、城市关系节点、人物轨迹和人物面板均保持同一城市语境；
- 点击时代预设后新增“时代语境 / Era resonance”卡：9 个时代入口均有中英文标题、引文、归属、时代说明和通往既有段落档案的入口；这些引文是文本共鸣与阅读入口，不宣称段落一定在该时代窗口内写成，卡片保留来源/传承层提示；
- 应用改动集中在 `route-state.ts`、`AtlasWorkspace.tsx`、`CivilisationMap.tsx`、`eraContexts.ts`、`styles.css` 与 Playwright 回归；release commit：`5a73e77 fix: preserve atlas city context and add era resonance`；
- 本地门禁：`npm run check` 全量通过；workspace unit tests 为 core 8/8、compiler 5/5、web 7/7；完整 Playwright + axe 为 **55 passed / 1 skipped**（56 tests，唯一 skipped 为 Public RC 专用用例）；typecheck、`git diff --check`、diff-check 与 UI/UX Pro Max UX 检查均通过；
- 内容边界：Full Alpha 仍为 159 个实体（人物 32、事件 37、地点 28、路线 3、文本 16、文本版本 8、概念 6、机构 6、博物馆对象 9、段落 14）、191 条关系、64 个来源、3 条音频；410 个 public blockers 仍是内容审核状态；Public RC2 独立保持 34 entities / 41 relations / 0 audio / 0 blocker；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；本次 unique deployment <https://472d4e52.dao-ru-fo-digital-museum.pages.dev>；deployment ID `472d4e52-c135-4c13-aa46-a7bfebe6cab1`；Environment `Production`；branch `main`；source marker `5a73e77`（`5a73e77b2df52c4c25a8e69af33d5d4bb8e01657`）；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传使用 `--commit-dirty=false`；
- post-deploy HTTP smoke：默认地址与 unique 地址均 **25/25**；线上浏览器复核确认长安人物保持 13 项、人物回退保持城市 scope、城市关系节点保持城市 scope、隋唐时代卡显示《心经》共鸣并链接 `/passages/form-is-emptiness?lang=en`；
- 本次 handoff 文档以 docs-only follow-up commit 补录，不重新上传应用、不改变已部署应用 source marker；当前停在可线上复盘节点，下一轮只处理用户复盘反馈或经授权的内容扩充。

## 2026-08-11｜时间轴—城市人物—人物关系联动 release handoff（当前）

- 深度对照 `previous project` 的 `TimelineRibbon`、`RelationGraph`、`EntityDrawer` 和共享 URL 状态实现，落实本轮三个交互要求：地图工作台保留原事件表格，并在其上增加可点击的横向历史时间轴；时间轴节点覆盖当前筛选范围的前后段，不再只取最早 24 项；点击节点会回写 `focus`、切换对象标签并让地图/面板同步进入当前语境；
- 城市焦点现在会精确同步右侧人物与事件列表：例如长安线上显示 13 位关联人物、8 个事件，并在面板中明确显示“Chang'an · Connected figures · 13”；地图仍保留全地点索引，事件焦点后切回“地点”不会丢失城市切换能力，符合 previous project 的“选中是 dossier，不是永久过滤器”经验；
- 地图下方新增城市 scoped 人物关系图：只从当前地点关联人物中投影 `influenced` / `contemporary_with` 两类现实人物关系，长安当前显示一行（张遂）—司马承祯 1 条关系；节点、关系表项均可点击并进入人物轨迹、名言/思想卡和一跳现实人物关系，不把地点、事件、著作或后世接受混入人物—人物关系；
- 本轮应用改动集中在 `AtlasWorkspace.tsx`、`CivilisationMap.tsx`、`RelationNetwork.tsx`、`styles.css`，并新增对应 Playwright 回归；内容 read model 未被改写，Full Alpha 仍为 159 个实体（人物 32、事件 37、地点 28、路线 3、文本 16、文本版本 8、概念 6、机构 6、对象 9、段落 14）、191 条关系、64 个来源、3 条音频；
- 本地门禁：`npm run check` 全量通过；workspace unit tests 为 core 8/8、compiler 5/5、web 7/7；完整 Playwright + axe 为 **55 passed / 1 skipped**（56 tests，唯一 skipped 为 Public RC 专用用例）；`git diff --check`、diff-check、Web typecheck 均通过；production Full Alpha preflight、静态验证、迁移和架构门禁通过；Vite bundle >500 kB 仍是既有非阻断提示；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；当前 unique deployment <https://ebbd7c00.dao-ru-fo-digital-museum.pages.dev>；deployment ID `ebbd7c00-7613-49cf-b0c2-9e0c8089d091`；Environment `Production`；branch `main`；source marker `0b5ac13`（`0b5ac1302add49bb922bcb589fc36334ef6e3e5d`）；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传使用 `--commit-dirty=false`；
- post-deploy HTTP smoke：默认地址与 unique 地址均 **25/25**；线上浏览器验收确认时间轴 24 个覆盖采样节点、事件卡片保留、长安人物/事件同步、城市 scoped 关系图、关系节点进入人物轨迹与名言卡、长安→洛阳连续切换均正常；默认地址作为当前唯一线上复盘基准，unique 地址只作为发布证据与回滚定位；
- Public RC2 继续独立保持 34 entities / 41 relations / 0 audio / 0 blocker；Full Alpha 的 `preview` visibility、410 个 public blockers 仍是内容审核状态，不是运行时错误，也不等于 Public RC 或正式学术发布；
- release commit：`0b5ac13 feat: sync atlas timeline city and relations`；本 handoff 文档随后以 docs-only commit 补录，不重新上传应用、不改变已部署应用 source marker；本轮停在“可线上复盘的交互闭环”，不扩大下一批内容范围。

## 2026-08-11｜首页全屏地图主画布 release handoff（上一阶段）

- 按线上标注完成首页构图修正：移除左侧整块大标题/宣传 hero，只保留无障碍的隐藏 `h1`；首页从导航下方直接进入共享 `AtlasWorkspace`，地图工作台横向铺满可用画布并接近首屏高度；
- 工作台标题由“先从地图进入”统一改为“交错的历史时空”（English: `Interwoven historical space-time`）；地图、人物/事件/地点/路线/著作/言论/关系标签、时间轴、详情 drawer 和深链接逻辑不变；
- 首页与 `/explore?view=map` 仍共用同一 `AtlasWorkspace` / `CivilisationMap`；线上实点：地点详情抽屉可打开并关闭，关系标签显示 4 条现实人物关系，旧 `.home-atlas-hero .hero-copy` 节点为 0；
- 本地门禁：`npm run check` 全量通过；本轮完整 Playwright + axe 为 **54 passed / 1 skipped**（55 tests，唯一 skipped 为 Public RC 专用用例）；首页布局针对性回归 2/2；`git diff --check` 通过；Full Alpha production preflight 静态验证为 `2026.08.alpha.1`；Vite bundle >500 kB 仍是既有非阻断提示；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；当前 unique deployment <https://aad40b40.dao-ru-fo-digital-museum.pages.dev>；deployment ID `aad40b40-a015-49fe-90a7-35e88812ac5d`；Environment `Production`；branch `main`；source marker `409c16c`（`409c16cd25ceac60c518f491f7ce61de1e7a56af`）；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传使用 `--commit-dirty=false`；
- post-deploy HTTP smoke：默认地址与 unique 地址均 **25/25**；线上浏览器确认首页标题、全宽地图、地点详情与现实人物关系入口正常；默认地址作为当前唯一线上复盘基准，unique 地址只作为发布证据与回滚定位；
- Full Alpha 当前仍为 159 个实体（人物 32、事件 37、地点 28、路线 3、文本 16、文本版本 8、概念 6、机构 6、对象 9、段落 14）、191 条关系、64 个来源、3 条音频；Public RC2 保持 34 entities / 41 relations / 0 audio / 0 blocker；410 public blockers 仍是内容审核状态，不是运行时错误；
- release commit：`409c16c feat: make homepage atlas full-bleed`；本 handoff 文档随后以 docs-only commit 补录，不重新上传应用、不改变已部署 source marker；本轮到此暂停，不扩大人物/地点/事件内容范围。

## 2026-08-11｜人物关系审计、出生地核实与语境卡 release handoff（上一阶段）

- 本轮按“人物关系只指现实人物与现实人物”的语义重新审计：人物关系工作台只展示两个 `figure` 之间的 `influenced` 与 `contemporary_with`；`received_by`、`deified_as`、`comparative_parallel` 等接受史、神格化或比较关系保留在独立的关联语境层，不再混入人物—人物关系列表；地图人物聚焦、Explore 人物聚焦与人物 dossier 均使用同一投影规则；
- 新增 `born_in` 关系类型与 migration 016，并将出生地作为可追溯的地点事实单独呈现：孔子 → 曲阜、释迦牟尼 → 蓝毗尼、鸠摩罗什 → 龟兹；曲阜与蓝毗尼加入现实地图坐标锚点，地点关系保留 approximate / historical 语义，不把传统叙事或神圣空间伪装成精确现代坐标；曲阜与蓝毗尼的地点核实分别关联 UNESCO 世界遗产条目；
- 新增优雅的 figure context card：在地图人物聚焦时展示“名言入口 / 思想入口”、原文、解释、出处定位与 dossier 入口；老子、孔子、释迦牟尼已补入带谨慎 provenance 的名言/理论上下文；人物页新增出生地事实，并把“现实人物—人物关系”和“地点、事件、经典及后世接受”等语境分成两个区块；
- Full Alpha compiler read model 当前为 159 个实体（人物 32、事件 37、地点 28、路线 3、文本 16、文本版本 8、概念 6、机构 6、对象 9、段落 14）、191 条关系、64 个来源、3 条音频；本轮新增 2 个出生地实体、3 条出生地关系，并同步更新首页/地图/人物 dossier 的 read model；
- 本地门禁：`npm run check` 全量通过；workspace unit tests 分组为 core 8/8、compiler 5/5、web 7/7；`DRF_WEB_DEPLOYMENT_MODE=full-alpha npm run test:e2e` 为 53 passed / 1 skipped（唯一 skipped 为 Public RC 专用用例）；`git diff --check` 与 diff-check skill 均无问题；Full Alpha Vite build、静态验证、迁移与架构验证通过；bundle >500 kB 仍只是既有非阻断提示；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；缓存修复后的 unique deployment <https://2dd03422.dao-ru-fo-digital-museum.pages.dev>；deployment ID `2dd03422-f035-4b59-a5ec-9e69b14a55d4`；Environment `Production`；branch `main`；source marker `2ad5b2e`（`2ad5b2eb129383ad4f39decad53252561f4b7d86`）；Wrangler `4.120.1`；manifest `2026.08.alpha.1 / alpha / preview`；上传时为 clean `main`，并使用 `--commit-dirty=false`；上一版 `5ff72060-4c75-4ff4-b376-5e8736ac1c54` 保留为回滚证据；
- 本轮缓存修复：`/data/v2/*` 响应改为 `max-age=0, must-revalidate`，Web read-model fetch 使用 `cache: no-store`；这解决了旧浏览器在发布后继续显示 19 个地点而不是最新 21 个地点的问题；
- post-deploy HTTP/JSON smoke：unique 与默认地址均 25/25；两者均确认 HTTP 200、CSP/安全响应头、SPA 深链、manifest identity、map/timeline/profile、强制重新验证响应头与 immutable asset；默认地址 fresh-tab 浏览器验收确认首页 32 位人物、21 个现实地点/2 条路线、曲阜与蓝毗尼可见，孔子名言卡、孔子出生地 dossier、道安—慧远现实人物关系、曲阜 → 蓝毗尼城市连续切换均正常；线上浏览器日志为 0；
- Public RC2 继续独立保持 34 entities / 41 relations / 0 audio / 0 blocker；本轮新增内容全部属于 Full Alpha `preview`，不会因为直发 production 而被误称为 Public RC 或正式学术发布；Research 中的 410 public blockers / 353 review subjects 是内容审核状态，不是运行时错误；
- release commits：`85ab927 feat: refine person relations and birthplace context` + `2ad5b2e fix: prevent stale production read models`；本 handoff 文档将在本次线上回归完成后单独补录提交，不改变已上传应用产物的 source marker；

## 2026-08-11｜人物—城市—事件关系扩展与连续切换 release handoff（上一阶段）

- 本轮按用户确认的地图核心方向继续扩展 Full Alpha：新增 6 位人物（道安、慧远、陶弘景、梁武帝、一行、朱熹）、5 个现实地点（襄阳、庐山、茅山、建康、武夷山）、6 个事件和 29 条人物—地点—事件—人物关系；新人物全部进入双语 authoring、来源、时间、地点或事件关系链，没有增加孤立人物卡；
- 内容边界保持可审计：道安—慧远以师承/影响表达，慧远—鸠摩罗什以同时代交流表达，陶弘景—梁武帝以书信/咨询表达，一行—司马承祯以同时代并置表达，朱熹—慧远以庐山跨时代比较表达；关系 qualifiers 明确写出“不等同于直接会面/长期同处/完整路线”；神话/神圣人物仍不写入现实经纬度；
- Full Alpha compiler read model 当前为 157 个实体（人物 32、事件 37、地点 26、路线 3、文本 16、文本版本 8、概念 6、机构 6、对象 9、段落 14）、188 条关系、62 个来源、3 条音频；真实地图新增 5 个坐标锚点，地图地点索引保持全部可见；质量报告为 404 个 public blockers，review queue 为 348 个 subject，其中 273 个 blocking；这些是研究内容审核状态，不是程序错误，也不等于 Public RC；
- 地图交互已按 Bible Atlas 的连续探索模式微调：选中城市不再过滤掉其他城市，地点索引和地图 marker 仍可继续切换；城市 dossier 同时列人物和事件；点击事件可进入事件地点、事件人物和一跳关系网，再切回任意地点；事件首个现实地点用于地图定位，URL `focus=place:* / event:* / figure:*` 可恢复；
- 首页人物入口已从 26 张同步为 32 张中英文卡片，道/儒/佛人物计数为 13/6/13；首页与 Explore 共用真实地图和关系数据，新增人物可从人物索引、共享 context picker、地图地点和事件面板进入；
- ui-ux-pro-max skill 已从 canonical GitHub `nextlevelbuilder/ui-ux-pro-max-skill` 安装到本机，并实际用于本轮 map dossier、连续切换、44px 触控目标、SVG 关系图语义、移动端两栏折叠和键盘/屏幕阅读器检查；没有复制 reference project 的品牌、seed 或内容；
- 本地门禁：`npm run check` 全量通过；workspace unit tests 19/19；Playwright + axe 全套回归通过（52 tests，Public RC 专用用例保持 skip）；preview context verified 为 344 文件 / 188 条双语关系；database bundle verified 为 160 entities / 188 relations；Full Alpha Vite build 与 `DRF_WEB_DEPLOYMENT_MODE=full-alpha npm run verify:static` 通过；bundle >500 kB 仅为既有非阻断警告；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；本轮 unique deployment 地址 <https://c6330738.dao-ru-fo-digital-museum.pages.dev>；deployment ID `c6330738-b9e9-451b-abc9-99f0f5a99b58`；Environment `Production`；branch `main`；source marker `86c100f`（`86c100ff7e7473decbed74ddc5a96c3fc0328858`）；Wrangler `4.120.0`；manifest `2026.08.alpha.1 / alpha / preview`；production 上传时为 clean `main`、`--commit-dirty=false`；上一版 `f6692404-283d-4497-8354-52978cb6f2a1` 保留为回滚证据；unique URL 只作为发布证据，不取代默认地址；
- post-deploy：最终默认地址首页 clean-tab smoke 已确认中英文新增人物可见、首页 manifest 为 `2026.08.alpha.1`；默认地址地图完成“长安 → 洛阳”连续切换，洛阳 dossier 保留人物与事件，事件可进入事件上下文并返回地点；unique 地址进一步确认朱熹 → 慧远关系聚焦可恢复；线上浏览器 console error 为 0；
- Public RC2 继续独立保持 34 entities / 41 relations / 0 audio / 0 blocker；本轮新增内容全部是 Full Alpha `preview`，不会借 production 上传把研究预览内容伪装成 Public RC；
- 工作树纪律：本轮只保留与上述闭环直接相关的代码、authoring、read-model 首页入口、测试和 handoff；未 reset/checkout，未把 iCloud 生成的同内容数字后缀副本纳入提交；

## 2026-08-11｜城市—人物—轨迹—时间轴—关系网互动闭环 production handoff（上一阶段）

- 本轮按用户明确授权把当前完整工作树创建 release commit 并 fast-forward 合并到 `main`：主 release 为 `95cd75b`（`release: interactive historical atlas production`），随后补入 `80dbf2d`（地图回归/对比度修复）和 `aaa450b`（timeline SVG 无障碍语义修复）；当前 `main` 工作树在 handoff 前保持干净；
- 目标闭环已实际验证：点击长安展开 11 位人物，点击洛阳展开 5 位人物；从长安人物列表点击玄奘进入 `focus=figure:xuanzang`，地图与面板显示 3 个空间节点；点击时间轴节点“玄奘出发长安”进入 `focus=event:xuanzang-departs-changan` 并反向显示地图；点击人物关系网节点可回到城市或其他关系对象；刷新 figure focus URL 后轨迹场景恢复；
- 互动实现集中在 `CivilisationMap.tsx`、`RelationNetwork.tsx`、`contextProjection.ts`、`ExplorePage.tsx`、`HomePage.tsx` 和共享 `staticData` map/search loader；关系投影区分 direct place relation 与 event bridge，不把共享城市误写成未经证实的直接人物地点关系；玄奘路线按已有 route waypoint 数据高亮，不新增未审核史实；
- 当前 Full Alpha read model 为 140 个实体（人物 26、事件 31、地点 21、路线 3、文本 16、文本版本 8、概念 6、机构 6、对象 9、段落 14）、159 条关系、54 个来源、3 条音频；真实地图为 14 个地点索引 / 2 条路线；Alpha quality report 仍为 352 个 public blockers，Public RC2 独立保持 34 entities / 41 relations / 0 audio / 0 blocker；
- 本地门禁：production preflight 的 `npm run check` 通过；unit tests 19/19；最终 Playwright + axe 为 51 tests、50 passed / 1 skipped（唯一 skipped 为 Public RC 专用测试）；地图缩放、拖动回归、城市人物展开、时间轴反向定位、关系网和 390px/axe 均通过；Full Alpha Vite build 与 `verify:static` 通过；bundle >500 kB 仅为既有非阻断警告；
- 本轮修复并纳入最终 production：关系网加入后旧 E2E 文本断言收紧到关系列表；地图拖动测试改为命中 Leaflet 实际 viewport；地图地点索引按钮改用满足 WCAG AA 的深色文本；timeline SVG 从 `role=img` 调整为可包含交互节点的 `role=group`，保留键盘 Enter/Space 和点击反向定位；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；最终 unique 地址 <https://f6692404.dao-ru-fo-digital-museum.pages.dev>；deployment ID `f6692404-283d-4497-8354-52978cb6f2a1`；Environment `Production`；branch `main`；source marker `aaa450b`；Wrangler `4.120.0`；manifest `2026.08.alpha.1 / alpha / preview`；按 production-only 纪律使用 `CF_PAGES_PRODUCTION_VISIBILITY=preview`，本次为 clean main 上传，未使用 dirty deploy；上一版 `b06e7ff7-8d13-4895-85bb-2176394f94eb` 保留为回滚证据；
- post-deploy：最终 unique/default HTTP/JSON smoke 均 25/25；线上浏览器确认长安 11 人、洛阳 5 人、玄奘 3 spatial stops、关系网聚焦、刷新 URL 恢复和时间轴节点反向地图均正常；最终线上默认地址作为当前唯一复盘基准；
- handoff 后暂停扩大内容范围。下一步只处理线上复盘反馈、事实/来源/权利/可访问性审核，或经用户再次授权进入下一批人物/地点/事件；不把 Full Alpha 的 preview visibility 误称为 Public RC 或正式学术发布；
- 工作树纪律：本次产品改动已提交并合并到 `main`；本段 handoff 文档属于发布证据补录，后续 commit 不改变已上传的应用产物 source marker `aaa450b`；没有 reset/checkout，也没有把 iCloud 生成的同内容 ` 2` 副本纳入提交；

## 2026-08-11｜A1+A2 全历史人物与 symbolic cosmos 批次 production handoff（上一阶段）

- 本轮按用户授权执行 A1 + A2：A1 加入庄子、孟子、张道陵、葛洪、阿育王、龙树、鸠摩罗什、法显 8 位可审计历史/传统人物；A2 加入盘古、女娲、伏羲、黄帝、西王母、太上老君 6 位神话/神圣人物。每位新增人物均连接时间、地点或 symbolic cosmos、事件、文本/传承、关系与来源；没有只增加孤立人物卡；
- 人物身份严格分层：`historical_person`、`traditional_sage`、`sacred_figure`、`mythic_persona` 不合并；老子与太上老君通过 `deified_as` 保持层级关系；神话/神圣人物不写入现实经纬度，现实地图与 symbolic cosmos 分开；历史时间、传统时间和接受史时间不互相覆盖；
- Full Alpha compiler read model 当前为 140 个实体（人物 26、事件 31、地点 21、路线 3、文本 16、文本版本 8、概念 6、机构 6、对象 9、段落 14）、159 条关系、54 个来源、3 条音频；全历史现实地图显示 14 个地点索引，symbolic cosmos 为 16 个节点（3 个传统、7 个人物、5 个空间、1 个中心）和 12 条边；
- 内容治理状态保持透明：Alpha quality report 为 352 个 public blockers；review queue 为 302 个 subject，其中 227 个 blocking、75 个 non-blocking。以上是研究内容审核队列，不是程序错误，也不表示 Public RC 已批准；Public RC2 仍独立保持 34 entities / 41 relations / 0 audio / 0 blocker；
- 本地 release gates：production 脚本内置的 `npm run check` 全量通过；unit tests 17/17；Full Alpha Playwright + axe 为 49 tests、48 passed / 1 skipped（唯一 skipped 为 Public RC 专用测试）；`verify:content`、`verify:matrix`、`verify:domain-architecture`、`verify:generated`、`verify:preview-context`、`verify:static` 均通过；Vite Full Alpha build 通过；
- 本轮修复并纳入 production：Cosmos 数据加载时 Hook 顺序导致的空白页；地图扩充后旧的单节点时间窗口断言；interactive SVG 错误声明为 `role=img` 造成 axe nested-interactive；修复后全量浏览器回归通过；
- Cloudflare production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；最新 unique 地址 <https://23c99acc.dao-ru-fo-digital-museum.pages.dev>；deployment ID `23c99acc-a45d-48d3-92fd-8d7b4a69438a`；Environment `Production`；branch `main`；source marker `cc734ca`；Wrangler `4.120.0`；manifest `2026.08.alpha.1 / alpha / preview`；按 production-only 纪律使用 `CF_PAGES_PRODUCTION_VISIBILITY=preview` + `ALLOW_DIRTY_DEPLOY=1`；上一版 `c4ae1eb6-61a0-42cc-9e17-94323fa197cb` 保留为回滚证据；
- post-deploy：unique/default HTTP/JSON smoke 均 25/25；两地址首页、manifest、overview、Cosmos、relations 的 SHA-256 完全一致；线上浏览器确认首页 26 位人物、真实地图 14 个地点/2 条路线、地图缩放入口、Cosmos 3/7/5/12 节点与边、Pangu focus、庄子 dossier 均可用，console error/warn 为 0；production 是当前唯一线上复盘基准；
- 本轮 handoff 后暂停扩大内容范围。下一步只处理线上复盘反馈、事实/来源/权利/可访问性审核，或经用户再次授权进入下一批人物/地点/事件；不把 Full Alpha 的 preview visibility 误称为 Public RC 或正式学术发布；
- 工作树纪律：未创建新的 Git commit，未 reset/checkout，保留用户既有 dirty-worktree 改动；本次 production 上传通过显式 `ALLOW_DIRTY_DEPLOY=1` 完成，`cc734ca` 仅作为 Cloudflare source marker，不代表本轮全部改动已提交。

## 2026-08-11｜全历史 overview 读模型、地图时间联动与 production 修复（上一阶段）

- 已把 Web 的 canonical 读取从仅隋唐切片调整为全历史 `overview`：`staticData.map/mapContext/timeline` 优先读取 `maps/real/overview`、`timeline/overview`，旧 `suitang` 保留为兼容回退；当前全历史时间轴范围为 `-600—1200`、84 条事件，隋唐兼容切片为 `581—907`、63 条事件；没有新增历史事实，只是把现有 Alpha 时间断言完整投影出来；
- 现实地图地点现在带有由已有时间断言推导的 `temporalRange`，地图与时间轴共享 URL 时间窗口；线上 `from=-600&to=-500` 只显示已有资料支持的 Sarnath（1 个地点），不把后世地点提前显示；当前仍是 8 个有明确现实坐标的地点、2 条路线、12 位人物入口；龟兹与终南山等 `position_pending` 地点没有擅自加坐标；
- 现有 12 位人物的地图入口现在明确区分 `mapped` 与 `position-pending`：已有直接现实地点关系的人物聚焦到已发布地点；没有可直接落到现实坐标的已发布地点时，地图保留现有地理范围并显示“位置待核”，不再静默伪装成已定位；本次只补交互语义和回归测试，没有新增人物、地点或史实；
- 共享语境选择器已从硬编码人物改为读取 search read model 的全部人物；当前 12 位人物都能进入统一关系工作台，未来获准加入的人物无需再次修改选择器；
- 在线浏览器复盘发现底图初版被 CSP 的 `img-src` 拦截，已将 `https://*.basemaps.cartocdn.com` 纳入 `apps/museum-web/public/_headers`；修复后线上实际加载 18 张底图瓦片，控制台错误为 0；这是部署配置修复，不涉及人物、地点或历史断言扩充；
- 当前 production：默认地址 <https://dao-ru-fo-digital-museum.pages.dev>；最新 unique 地址 <https://c4ae1eb6.dao-ru-fo-digital-museum.pages.dev>；deployment ID `c4ae1eb6-61a0-42cc-9e17-94323fa197cb`；Environment `Production`；branch `main`；source/commit marker `cc734ca`；Wrangler `4.120.0`；manifest `2026.08.alpha.1 / alpha / preview`；本次仍按 production-only + `CF_PAGES_PRODUCTION_VISIBILITY=preview` + `ALLOW_DIRTY_DEPLOY=1` 发布，Alpha 内容的 preview visibility 语义保持不变；上一版 `52168681` 为可回溯版本；
- 发布证据：`npm run check` 全量 release gates 通过；本地 Playwright + axe 为 49 tests、48 passed / 1 skipped；unique 与 default Cloudflare HTTP/JSON smoke 均为 25/25；线上浏览器确认首页 12 位人物入口、`mapped/position-pending` 状态、全人物共享语境选择器、全历史时间轴、地图时间窗口和底图瓦片均正常；
- 当前内容事实基线：91 个实体、12 位人物、10 个地点、17 个事件、2 条路线、90 条关系、38 个来源、3 条音频；质量报告仍为 205 blockers / 17 warnings / 184 review subjects（109 blocking）。production 是线上唯一复盘基准，authoring JSON/compiler 是可追溯修改源；
- **本轮暂停点**：不继续扩大人物、神话位置、现实记忆地点或接受史内容。下一批内容必须先由用户确认人物分层、传统人物与神格化身份的关系、现实地点的尺度（exact/city/region/memory/symbolic）和时间类型（historical/traditional/reception）；在这些判断未确认前，不向地图写入新坐标或新史实。具体判断包见 [下一批内容审核闸门](./NEXT_CONTENT_REVIEW_GATE_2026-08-11.md)。

## 2026-08-11｜地图首屏垂直切片与 production handoff（上一阶段）

- 已把 previous project 的真实地图交互能力适配为本项目独立组件 `apps/museum-web/src/components/CivilisationMap.tsx`：Leaflet 真实底图、滚轮/双击/拖动/键盘地图、缩放、全境、地点 popup、地点 dossier、路线 polyline、路线账本和可访问地点索引均已接入；未复制 previous project 的品牌、seed、profile 或 fictional-map 语义；
- 首页已改为 map-first：Hero 右侧直接加载真实地图，下方紧接当前 12 位人物的“地图 / 档案”入口；人物索引仍来自 overview read model，不在本轮新增人物事实；
- `/explore?view=map` 与首页使用同一个 `staticData.mapContext` 加载器和 `CivilisationMap`，共享已有 context focus：人物 focus 会按现有关系投影地点；地图 root 暴露当前 zoom/center 供浏览器回归，位置索引和 route ledger 保留可访问的文本入口；
- 当前空间数据边界仍是已有 8 个现实地图点、2 条路线和 90 条关系；这只是完整历史时空地图的交互骨架，不把当前隋唐 read model 冒充为最终全历史内容。下一批人物、神话位置、现实记忆地点和时间层仍必须按下方战略清单逐项审校；
- `staticData` 已新增共享 `mapContext`，Leaflet 依赖已写入 `apps/museum-web/package.json`：`leaflet`、`react-leaflet`、`supercluster` 及对应类型；当前构建体积新增 Leaflet chunk，后续地图数据扩展前需再做 bundle/性能预算；
- 本地门禁：`npm run check` 全部通过（compiler、schema、内容质量、数据库 bundle、static build）；Web unit 4/4；地图/首页/人物 focus targeted E2E 4/4；完整 Playwright + axe 在 `--retries=1` 下为 44 passed / 1 skipped；
- 本轮已按 [Cloudflare production-only 发布纪律](./DEPLOYMENT.md#0-当前发布纪律2026-08-11-起) 直发 Cloudflare production，并在同一批次补做全历史首页文案同步：default <https://dao-ru-fo-digital-museum.pages.dev>；最新 unique <https://e0e235b0.dao-ru-fo-digital-museum.pages.dev>；deployment ID `e0e235b0-abea-4be2-bcfc-8bf0a91cc127`；branch `main`；commit marker `cc734ca`；Wrangler `4.120.0`；使用 `CF_PAGES_PRODUCTION_VISIBILITY=preview` + `ALLOW_DIRTY_DEPLOY=1`，仍明确标记 Alpha/preview visibility；上一版交互 deployment `8ebd33e5-e790-44b7-9fff-87ca5ed0ab20` 保留为可回溯版本；
- post-deploy 证据：最新 default HTTP/JSON smoke 23/23、unique HTTP/JSON smoke 23/23；线上浏览器确认 Hero 已改为“交错的历史时空”、首页地图可见、人物索引 12 位；上一版线上 Explore 复验已确认 8 地点、2 路线、老子 focus→洛阳单点→地点 dossier；最新页面浏览器 error/warn 日志为空；
- 当前暂停点：地图交互骨架已可线上复盘，但全历史内容尚未完成；当前仍只有既有 12 人/8 地点/2 路线 Alpha 数据。下一步需要先根据线上体验确认地图首屏、人物地图入口和“待核位置”呈现，再进入下一批人物/位置/时间内容；遇到神话人物现实位置、传统身份合并或接受地选择时暂停交给用户判断；

## 2026-08-11｜全历史时空人物地图战略细化（上一阶段决策）

- 新方向已确认：产品覆盖道、儒、佛从神话/传统起源到近现代传播的完整历史时空；隋唐长安保留为精选场景，不再作为 MVP 或产品边界；
- 人物成为地图第一入口。历史人物显示有证据的活动地点、事件和路线；神话/神圣人物显示象征空间，以及现实世界中的祭祀、艺术、朝圣和记忆地点，不制造伪经纬度；历史人物与后世神格化身份使用独立节点和关系连接；
- 已列出文明原型、道家/道教、儒家、佛教和三教制度桥梁人物的全历史策展骨架，并为当前 12 位人物分别列出地图补齐目标；第一项内容任务是确保 12 人点击后都有地图、路线、象征位置或明确的待核说明，不出现空场景；
- 首页目标确认为“全历史时代轨道 + Leaflet 地图/神圣画布 + 人物/事件/地点/路线/关系/经典浏览器 + 常驻时间轴 + 统一详情 drawer”；`/explore` 与首页共用工作台，Museum 和 Research 保持独立；
- 复用 `previous project` 的 Leaflet、聚合、时代筛选、共享选择、详情 drawer、搜索、时间轴和 URL 恢复能力，但不复制 profile、seed、品牌、巨型 atlas JSON 或 fictional-map 语义；
- 发布流程改为 production-only：按内容、普通 UI、schema/部署三种风险运行必要本地门禁，然后直接部署 Cloudflare production 并做 default/unique smoke；不再为日常迭代维护 Preview alias 或执行 Public RC promotion；旧 Public RC2/Preview 记录冻结为历史；
- 完整的人物清单、位置模型、全历史时间结构、组件复用边界、地图 read model、执行 checklist、production-only 流程和验收标准见 [全历史时空人物地图战略](./STRATEGIC_REALIGNMENT_MAP_FIRST_2026-08-11.md)；
- 纪律边界：本轮仍只更新方案、路线图和 handoff，没有修改 Web、内容数据或 production；线上继续保持当前 `2026.08.alpha.1` 基线。

## 2026-08-10｜成玄英与吉藏关系闭环 production 同步（上一版基线）

- production 已按用户授权切换为当前最新完整 Alpha read model：91 个实体、90 条关系、3 条音频、38 个来源；人物 12、地点 10、事件 17；网页 manifest 标记为 `contentVersion=2026.08.alpha.1`、`releaseStage=alpha`、`visibility=preview`，明确这是完整研究内容而非 Public RC 批准包；
- 当前质量状态完整保留：205 个 public blockers、17 个 warnings、184 个 review subjects，其中 109 个为 blocking；这些状态会继续在 Research/审核队列中显示，不因部署到 production 而被隐藏或改写；
- 首页传统入口已与完整 Alpha 对齐：道/儒/佛分别显示 3/4/5 位人物，人物 spotlight 实际展示 12 位；未核实地点以“空间待核/节点待核”明确标注；
- production 作为后续线上复盘的唯一运行时基准：<https://dao-ru-fo-digital-museum.pages.dev>；unique deployment：<https://198d43de.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`198d43de-695b-4ec9-9707-8231f3f9df77`；branch：`main`；commit marker：`cc734cab18f201a1f17f1783e04f66c2748502d8`；本次使用显式的 `CF_PAGES_PRODUCTION_VISIBILITY=preview` Full Alpha 模式，并按 dirty-worktree 授权部署；
- Public RC2 仍是独立的已审核发布边界，artifact 为 34 entities / 41 relations / 0 audio / 0 blockers；它不再代表当前 production 的完整内容量，后续若要恢复 Public visibility，必须重新走 Public RC promotion；
- 后续新增内容、人物、地点、空间和关系，先以 production 当前 Alpha 读模型为复盘基线，再按 slice 进入审核；authoring JSON/compiler 仍是可追溯的修改源，production 是线上展示与回归的事实基准；

### 本次 handoff 验收

- 在上一版基础上，本轮新增 3 个精确来源、2 条 preview 关系，并收紧成玄英—《道德经》关系的来源边界：成玄英补入 631–636 长安城市尺度锚点，吉藏补入约 605–623 长安城市尺度锚点；Public RC2 选择范围未扩大；
- `npm run check`：通过；Full Alpha Playwright + axe：44 passed / 1 skipped；unique production HTTP smoke：23/23；default production HTTP smoke：23/23；
- unique 与 default JSON read model 完全一致：传统入口人物 3/4/5、首页 12 张人物卡、搜索 12 位人物、关系 90、来源 38、质量 205/17、审核 184/109；
- 纪律边界：production 当前是 Alpha preview visibility，不等同于 Public promotion；Public RC2 仍保持 34 entities / 41 relations / 0 audio / 0 blocker；本轮未创建 Git commit、未 reset/checkout、未覆盖用户既有 dirty-worktree 改动；

## 2026-08-10｜完整 Alpha production 同步（上一版基线）

- `release:alpha-public-rc-2` 已完成正式审核并 promotion：12 个 core entities、14 个 dependency entities、30 条关系；`reviews.json` 当前 391 条，RC2 选择范围所有 required checks 已通过；Public artifact 为 34 entities / 41 relations / 0 audio / 0 blockers；
- RC2 新增并公开老子、孔子、释迦牟尼与孔子问礼、鹿野苑初转法轮、大慈恩寺建立等人物—事件—地点—制度空间—文本—关系闭环；production 搜索索引实际包含 6 位人物：老子、孔子、释迦牟尼、玄奘、司马承祯、孔颖达；跨时代比较入口显示老子、孔子、释迦牟尼；
- 首页传统入口的人物计数已更新为道/儒/佛各 2 位，并新增六位人物 spotlight，明确显示时间与地点入口；
- 当前 Public RC Preview：<https://2af05e15.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`2af05e15-c4aa-4b36-8eb2-b5900635295a`；branch：`public-rc`；线上 HTTP smoke 23/23；
- 当前 production：<https://dao-ru-fo-digital-museum.pages.dev>；unique deployment：<https://29aac795.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`29aac795-a3e6-46c1-8dc9-3d0660e7ac37`；branch：`main`；production 线上 HTTP smoke 23/23；线上 JSON 确认 `visibility=public`、0 blockers、34 entities / 41 relations、首页 6 位人物入口；
- 该历史节点 production 使用 `CF_PAGES_CONTENT_VISIBILITY=public`，并修复部署脚本使 production 默认强制 Public visibility；之后已由当前 Full Alpha production 同步显式覆盖；由于既有工作树包含用户此前未提交改动，本轮仍按显式授权使用 `ALLOW_DIRTY_DEPLOY=1`，尚未创建 Git commit；
- 本地验证：`npm run check` 全部通过；单元测试 17/17；Preview 浏览器与 axe 44 passed / 1 skipped；Public RC2 专用浏览器 smoke 1/1；production HTTP smoke 23/23；

该历史节点的下一步已由上方 Full Alpha production 同步取代；当前先以线上完整内容复盘为准。

## 2026-08-09｜Public RC 正式审核闭环与线上复盘（历史）

- 审核身份为 `codex:authorized-rc-reviewer`；冻结范围没有扩大，仍是 27 个 subject（10 个核心实体、3 个 text version 结构依赖、14 条关系）；`reviews.json` 为 144/144 `passed`，其中 27 条 compiler schema、117 条正式审核记录；没有把旧的 agent pre-review 或 role pending 当作批准；
- `release:alpha-public-rc-1` 已从 `in_review` 推进为 `promoted`。promotion ID：`promotion:alpha-public-rc-1-20260809131146`；source checksum：`f1d5513d2d6dba91ef6376afb415868bfca3bb5868475ca2e59c6ede3e2059aa`；Public artifact checksum：`c5004cdd7548520ec08868188f3d258e07a8de1f942eb27ac683825bb26da452`；Public artifact 为 13 entities / 14 relations / 0 audio / 0 blockers；
- 完整 `npm run check` 通过；完整浏览器回归 44 tests 为 43 passed / 1 skipped；Public-only smoke 1/1 passed；Cloudflare HTTP smoke 23/23 passed；线上浏览器已复盘首页、展览、地图、人物比较、原典阅读和玄奘条目。地图当前支持缩放、拖动、键盘/重置，Public 范围不含 Preview-only route corridor；
- 在线复盘曾发现地图把未公开路线实体的 SPA fallback HTML 当 JSON 解析，已修复为 JSON content-type guard + optional route layer，并重新部署复验；这是本轮唯一需要修复的线上阻断问题；
- 当前 Preview：<https://57cc78db.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`57cc78db-1970-485d-808b-33f915a9dfc7`；branch：`public-rc`；commit：`cc734cab18f201a1f17f1783e04f66c2748502d8`；Wrangler：`4.120.0`；production 未触碰；
- 详细证据、边界、复盘路径和下一阶段入口见 [Public RC 最终审核与 Preview 复盘](./PUBLIC_RC_FINAL_AUDIT_2026-08-09.md)。当前适合停在可复盘节点，等待用户线上测试后再决定下一内容 slice。

## 2026-08-09｜构建卫生修复与 Public RC 进入审核

- compiler 输出、Preview read models 和 Public fail-closed artifact 已重新生成；新增 `verify:generated`，当前 455 个生成文件无 iCloud 冲突副本或数字后缀重复文件；`npm test` 现在会先构建 workspace packages，`npm run check` 已调整为先生成/同步再扫描架构边界；
- `npm run check` 全部通过；单元测试 17/17；Playwright + axe 33/33；Public artifact 仍为 0 entities / 0 sources / 0 relations / 0 audio；
- `release:alpha-public-rc-1` 从 `planning` 推进为 `in_review`，范围仍冻结为 27 个 subject；当前 27 条 RC blocker 全部来自正式审核 checks 未完成，144 条记录仍为 27 schema passed、25 agent pre-reviewed、92 pending；不把 agent 预审改写为正式批准；
- 本轮未重新部署 Cloudflare、未执行 promotion、production 未发布；下一步需要真实 reviewer 为 fact/tradition/bilingual/rights/editorial/accessibility 写入带时间和说明的 records。

---

## 2026-08-09｜人物—长安关系证据收窄 Preview（上一条记录）

- 本轮严格留在冻结的 27 个 Public RC subject 内，没有新增人物、文本、地点或关系；两条既有空间关系完成 claim-boundary 收窄：司马承祯—长安为景云二年（约 711）入京的城市尺度锚点，明确排除后续东都洛阳/王屋山活动；孔颖达—长安为贞观十四年（640）长安务本坊国子学讲学锚点，不再外推 `c. 630–648`；
- 新增专用 `source:changan-guozijian-gazetteer`（精确、已核引、陕西省地方志办公室《碑林区志》PDF），通用 `source:education-classics-records` 保持待核；source of truth 现为 30 个来源、79 条关系、144 条 review records，RC 仍为 27 blockers、planning，两个 relation fact 仍是 `pending`；
- 隔离 clean staging：`npm run check` 通过；单元测试 17/17；Playwright + axe 33/33；Preview read models 206 files / 79 bilingual relations；数据库导入计划 1208 statements / 30 sources / 144 reviews；Public artifact 仍为 0 entities / 0 sources / 0 relations / 0 audio；
- 最新 Cloudflare Preview：<https://5b4129ba.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`5b4129ba-d001-4394-b16f-b23bb3f864c7`；Preview branch：`first-public-rc`；
- 线上 smoke 23/23 通过；线上 JSON 确认 317 blockers / 17 warnings、173/173 blocking review subjects、30 sources；线上人物页面显示司马承祯 711 与孔颖达 640 的新关系文案；production 未发布。

---

## 2026-08-09｜Public RC reviewer 角色筛选 Preview 更新（最新）

- 本轮仍不扩展人物、文本或关系范围；在既有 144 条审核记录和 27 个候选 subject 上，Research 审核队列新增按正式 reviewer 角色筛选，并把筛选状态写入可分享 URL；
- 当前 `reviews.json` 共 144 条记录：27 条自动 schema 通过、25 条 agent pre-review（其中 18 条文本链、7 条人物/空间/关系 fact）、92 条正式角色 pending；`pre_reviewed` 不计入 completed checks，不会降低 Public blocker；
- 人物、空间与关系的 fact 分流记录在 [fact 证据分流表](./PUBLIC_RC_FACT_REVIEW_2026-08-09.md)；本轮只是审核闭环的可见性与交接改进，不新增内容选择；
- 隔离 clean staging 的 `npm run check`、单元测试 17/17、Playwright + axe 33/33 均通过；数据库 import plan 保持 144 reviews、27 release-candidate subjects、0 promotions；
- 最新 Cloudflare Preview：<https://60e89825.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`60e89825-7a30-4d0a-bdea-04d103b1a774`；Preview branch：`first-public-rc`；
- 线上 HTTP smoke 23/23 通过；线上 JSON 复验确认 quality report 为 317 blockers、review queue 为 173/173 blocking subjects，角色分派数量为历史 2、传统 10、双语 13、权利 27、无障碍 13、策展 27；线上浏览器已确认点击历史审核筛选后 URL 可分享且队列收窄为 2 项，production 未发布。

## 2026-08-09｜人物—长安关系证据收窄（已完成切片）

- 本轮不扩展冻结的 27 个 Public RC subject；只修正两条既有 relation 的 claim boundary：司马承祯—长安改为景云二年（约 711）入京的城市尺度锚点，明确不把开元年间东都洛阳/王屋山活动并入；孔颖达—长安改为贞观十四年（640）长安务本坊国子学讲学/经学活动，删除无具体空间证据的 `c. 630–648` 宽区间；
- 新增专用 `source:changan-guozijian-gazetteer`，绑定陕西省地方志办公室发布的《碑林区志》精确 PDF 定位；通用 `source:education-classics-records` 保持原待核状态；两条 relation 的 `role:historical-reviewer` 仍为 `pending`，因为 agent evidence pass 不是正式历史审核；
- 已加 compiler regression assertions；clean staging 全量门禁和 33/33 Playwright + axe 已通过，新的 Preview 已完成线上 smoke/JSON/浏览器复核；Public RC 不 promote，production 不发布。

## 2026-08-09｜Public RC accessibility 门禁 Preview 更新（上一版）

- 本轮不扩展人物、文本或关系范围；修正路线图与 compiler required checks 的不一致：13 个 Public RC entity subject（10 个核心实体 + 3 个 text version 依赖）现在都要求 `accessibility`，并新增 `role:accessibility-editor` 的 pending 分派；`reviews.json` 当时共 144 条记录：27 条自动 schema 通过、117 条仍待角色审核；文本链 claim-level 预审边界已整理在 [文本链预审表](./PUBLIC_RC_TEXT_CLAIM_AUDIT_2026-08-09.md)；
- accessibility review 明确检查实际中英文路由的标题层级、焦点顺序、键盘操作、对比度、链接名称和屏幕阅读顺序；33/33 Playwright + axe 只是自动化证据，不替代角色审核；
- 隔离 clean staging 的 `npm run check` 通过；单元测试 17/17；Playwright + axe 33/33；`verify:preview-context` 为 206 文件、79 条双语关系；database import plan 为 144 reviews、27 release-candidate subjects；Public artifact 仍为 0 entities / 0 sources / 0 relations / 0 audio；Public RC 仍为 27 blockers；
- 最新 Cloudflare Preview：<https://7aef36c5.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`7aef36c5-2329-4db1-8912-eb3582b3876e`；Wrangler：`4.120.0`；线上 HTTP smoke 23/23；线上 JSON 复验确认 `figure:xuanzang` 缺少项包含 accessibility，跨文本阅读显示 `Accessibility: pending · role:accessibility-editor`，三条文本来源仍为 `precise`，production 未发布。

## 2026-08-09｜Public RC 来源精度与审核包 Preview 更新（上一版）

- 本轮不扩展人物、文本或关系范围；在既有 27 个 Public RC subject 和 144 条审核记录之上，补齐第一批人工审核所需的 [Public RC 审核包](./PUBLIC_RC_REVIEW_PACKET_2026-08-09.md)，明确 subject、来源入口、定位边界、审核角色和“未完成即阻塞”的规则；其中 13 个实体新增 `accessibility` pending 分派，使路线图与实际 required checks 一致；
- 将 `source:heart-sutra-edition`、`source:daodejing-edition`、`source:analects-edition` 的 `locatorLevel` 从 `edition` 精确到 `precise`。三条来源的既有精确 locator、`citationStatus=verified` 和 public-domain 权利边界不变；人物来源仍保持较宽边界，避免把传记来源误写成每条策展断言的直接证据；
- 隔离 clean staging 的 `npm run check` 通过；单元测试 17/17；Playwright + axe 33/33；`verify:preview-context` 为 206 文件、79 条双语关系；database import plan 为 144 reviews、27 release-candidate subjects；Public artifact 仍为 0 entities / 0 sources / 0 relations / 0 audio；
- 最新 Cloudflare Preview：<https://7159ce73.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`7159ce73-70f0-4a4e-8642-8c133fd5e55b`；Wrangler：`4.120.0`；线上 HTTP smoke 23/23；线上 JSON 复验确认三条文本来源均为 `precise`、质量报告 317 blockers、审核队列 173 subjects、跨文本对读的 fact 仍显示 `pending · role:historical-reviewer`，同文本对读仍为 2 readings / 7 axes / 8 context relations；production 未发布。

## 2026-08-09｜Public RC 审核分派 Preview 更新（上一版）

- 本轮不扩展内容范围，只把第一批 Public RC 的 27 个 subject（10 个核心实体、3 个 text version 依赖、14 条关系）建立为可执行审核队列；`reviews.json` 共 131 条记录：27 条 `schema=passed`（自动编译器证据）和 104 条按 `role:historical-reviewer`、`role:tradition-reviewer`、`role:bilingual-editor`、`role:rights-editor`、`role:lead-curator` 分派的 `pending` 记录；pending 不等于人工批准，也不会满足 ready 门禁；
- TextReading 页面现在把审核证据逐项显示为“已通过 / 待审核”、分派角色和审核说明；当前质量报告仍为 317 blockers / 17 warnings，Review queue 仍为 173 subjects / 173 blocking，Public RC 仍为 planning；
- 本地验证：`npm run check` 通过；单元测试 17/17；Playwright + axe 33/33；`verify:preview-context` 206 文件、79 条双语关系；database import plan 为 131 reviews、27 release-candidate subjects；Public artifact 仍为 0 entities / 0 sources / 0 relations / 0 audio；
- 最新 Cloudflare Preview：<https://512bf65c.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`512bf65c-26f6-4309-9ca4-7d2f4eb6ba89`；Wrangler：`4.120.0`；线上 HTTP smoke 23/23；线上 JSON 复验确认 pending role、317 blockers、173 subjects 和 `figure:xuanzang` 的 schema completed 均已可见；production 未发布。

## 2026-08-09｜同一文本版本对读与审核证据 Preview 更新（上一版）

- source of truth 现为 91 个内容实体、79 条结构化关系、26 个来源和 3 条音频 metadata；其中人物 12、文本 7、文本版本 8、passage 14；双语实体 artifact 为 182 个；数据库 bundle 为 94 个 canonical entities（含 3 个顶级传统）、188 条翻译和 91 条时间断言；
- 在已有跨文本 `three-traditions-passage-reading` 之外，新增同一文本 `dhammacakkappavattana-version-reading`：同一部《转法轮经》的巴利语短引与 Thanissaro 英译各自回到明确的 text version、locator、权利和传述层；`suffering / stress` 被记录为译者措辞差异，并明确不把它冒充成巴利语手稿异文或唯一译法；
- `PassageProfile` 新增受来源约束的 `variantReadings`；文本阅读 read model 同时携带版本/译文差异和 `reviewEvidence`。第一批 Public RC 的 27 个 subject 现在有 131 条审核记录：27 条由 compiler 证明的 schema 通过、104 条按历史/传统/双语/权利/策展角色保持 `pending`；页面显示分派、说明和 blocking，而不是伪造完成状态。新增同文版本切片尚未获得真实 reviewer approval；同一传统内部的版本平行关系不会进入 sacred cosmos 的跨传统象征边；
- Preview 自动同步 compiler 的 182 个双语实体 artifact、91 条搜索项、26 个来源、8 个现实地图地点、63 个时间项、4 节点/5 边无坐标 sacred-cosmos 模型、48 节点/79 条图边、79 条双语关系、2 个双语人物比较 artifact 和 4 个双语文本对读 artifact；compiler read-model 文件为 206 个，dist 为 221 个；
- 本地验证：全量 `npm run check` 通过；单元测试 17/17；Playwright + axe 为 33/33；`verify:preview-context` 为 206 文件、79 条双语关系；数据库导入计划含 131 条 review checks；same-text 对读双语 JSON 各为 2 readings / 2 versions / 7 axes / 8 context relations；质量报告为 317 blockers / 17 warnings，审核队列为 173 subjects / 173 blocking；
- 最新 Cloudflare Preview：<https://a4fcca9a.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`a4fcca9a-4206-4971-b174-cf489ed3a141`；Wrangler：`4.120.0`；线上 HTTP smoke 为 23/23；双语 same-text JSON、原有跨文本 JSON 和新路由线上复验通过；生产环境仍未发布。

## 2026-08-09｜人物与文本立体架构 Preview 更新（最新）

- source of truth 已扩展为 89 个内容实体、75 条结构化关系、25 个来源和 3 条音频 metadata；其中人物 12、文本 7、文本版本 7、passage 13、地点 10、事件 17；双语实体 artifact 为 178 个；数据库 bundle 为 92 个 canonical entities（含 3 个顶级传统）、184 条翻译和 89 条时间断言；
- 老子（李耳）、孔子（孔丘）、释迦牟尼已作为跨时代入口加入 Preview；每人都明确区分历史性/传统性、源头时间、文本/言论归属、现实地点和后世接受，不把传统叙事直接当作同等级历史事实；
- 新增孔子问礼于老子、佛陀在鹿野苑初转法轮两个事件，鹿野苑真实地点，早期佛教文本—版本—passage 链，以及老子/孔子/释迦牟尼的 `attributed_to`、`remembered_in`、后世接受关系；
- 新增 source-of-truth 驱动的 `cross-era-figures` 比较集：老子、孔子、释迦牟尼以历史性、传统归属、时间、言论、空间、事件、文本、后世接受、证据九个维度并排比较；每个单元格明确标注 `recorded` / `derived` / `not_recorded`，并把共同连接到至少两位人物的洛阳与孔子问礼事件显示为桥接节点；
- 新增 source-of-truth 驱动的 `three-traditions-passage-reading` 原典对读：道德经、论语、转法轮经各选一段，按文本层级、定位、原文、归属、解释、时间、证据与权利七个维度并排阅读；每段都回指具体 text version，并保留 `passage_of`、`quoted_from_version`、`attributed_to` 关系和 25 条上下文关系；
- Explore 共享语境现在可在人物、事件、地点、机构、文本之间一跳切换；实体详情显示历史性、人物类别、关系限定条件、证据层和来源跳转；Research 提供 25 个来源的双语来源台账、质量报告和只读审核队列；Preview 自动同步 compiler 的 178 个双语实体 artifact、89 条搜索项、25 个来源、8 个现实地图地点、63 个时间项、200 个 compiler read-model 文件（含 2 个比较入口和 2 个文本对读入口）、4 节点/5 边无坐标 sacred-cosmos 模型和 48 节点/75 边完整关系图；focus projection 会按关系过滤地点，并把关系时间断言加入聚焦时间轴；
- 时间轴支持可分享的 `from` / `to` 年份范围；地图路线从 route entity 的 waypoint manifest 派生为现实地点之间的重建廊道，并明确不启用伪精确动画；
- 六个完整人物 dossier（玄奘、司马承祯、孔颖达、老子、孔子、释迦牟尼）均通过时间、空间、事件、文本、后世接受五项结构门禁；老子标为 `traditional_sage / contested`，其余五位按当前证据层分别标记；
- 本地验证：干净 staging 上 `npm run check` 全绿；单元测试 16/16；Playwright + axe 为 32/32；Preview read models 逐文件校验通过（200 compiler files，双语关系各 75/75，比较集双语各 3 entities / 9 axes / 2 bridges，文本对读双语各 3 passages / 7 axes / 25 context relations）；生产环境仍未发布；
- 最新 Cloudflare Preview：<https://331d0b3f.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`331d0b3f-efd5-44a0-bd3c-4e4a3da0da3b`；Wrangler：`4.120.0`；commit：`cc734cab18f201a1f17f1783e04f66c2748502d8`；线上 HTTP smoke 为 23/23，文本对读/人物比较双语 JSON 和文本对读路由线上复验通过；质量报告为 311 blockers / 17 warnings，审核队列为 167 subjects / 167 blocking，关系/来源各 75/25，sacred cosmos 双语接口各 4 nodes / 5 edges 且无 coordinate 字段；生产环境仍未发布。

## 2026-08-09｜共享语境 Preview 更新（上一版）

- 已将编译产物中的双语关系 read model（51 条关系）接入 `apps/museum-web/public/data/v2/relations/{zh-CN,en}.json`；`verify:preview-context` 要求 Preview 文件与 `.artifacts/content/v2` 逐字一致；
- Explore 新增共享 `context focus`：人物、事件、地点、机构、文本可通过 URL `focus` 聚焦，关系卡片显示关系标签、时间断言和证据层，并可切换到相邻对象或打开已有静态条目；
- 当前地图地点节点、时间轴事件和关系图节点会对匹配的聚焦对象做视觉高亮；这是第一步跨视图连接，完整的关系驱动派生过滤仍列在 P1；
- 本地验证：`npm run check` 全绿；完整 Playwright + axe 为 22/22；fresh/repeat PostgreSQL/PostGIS 为 14 migrations、51 relations，fingerprint 一致；
- 最新 Cloudflare Preview：<https://63184296.dao-ru-fo-digital-museum.pages.dev>；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；deployment ID：`63184296-3706-4beb-846e-d7e95ee563d7`；online smoke 23/23，双语在线关系 read model 各 51/51，headless browser smoke 通过；production 仍不发布。

## 2026-08-09｜Cloudflare Pages Preview 已上线

- Cloudflare Pages 项目：`dao-ru-fo-digital-museum`；production branch 已设为 `main`；本次仅部署 Preview，不执行 production 发布；
- Preview branch：`first-public-rc`；稳定 alias：<https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；本次 unique URL：<https://b73334f3.dao-ru-fo-digital-museum.pages.dev>；
- deployment ID：`b73334f3-8a8c-44a4-96db-724f923da486`；Wrangler `4.120.0`；git commit：`cafc52fdbc89bffb21f5c250fd022134d80cb093`；部署时 tree clean；
- 发布内容明确是 `2026.08.prototype.1` / `first-viewable-prototype`，仍读取已验收的 `apps/museum-web/public/data/v2`，不包含未完成的 Public RC 内容；
- `./deploy/smoke-pages.sh`：23/23 通过，覆盖首页、CSP/nosniff/Permissions-Policy、SPA exhibition/entity/passage deep links、JSON split、地图 split 和 immutable asset cache；
- Chrome 浏览器线上复验：首页加载完成、`/figures/xuanzang` 显示玄奘条目、无 console error/warn；
- 当前 Public RC `release:alpha-public-rc-1` 仍为 `planning`，最新 blocker report 为 27 blockers / 27 warnings；Preview 上线不等于 Public RC 发布。

生产上线仍需另行完成：Preview 评审、production release commit、production smoke、浏览器复验和本页证据回写。不要把 Preview URL 当作正式 production URL。

## 2026-08-09｜地图交互 Preview 更新

- 最新交互 Preview：<https://b0bf2351.dao-ru-fo-digital-museum.pages.dev>；稳定 alias 仍为 <https://first-public-rc.dao-ru-fo-digital-museum.pages.dev>；
- 构建基线：`cc734cab18f201a1f17f1783e04f66c2748502d8`；本次包含当前工作树中的地图交互改动，故部署时 tree 为 dirty；
- 地图已经支持缩放、滚轮、双击、拖动、键盘方向键、`+/-/0`、重置、焦点导航和地点详情跳转；线上 smoke 23/23、最新本地 E2E 22/22 通过；
- 本轮新增的知识架构与 014 数据库迁移属于 authoring/compiler 层，不改变已部署 prototype 的静态内容；Public RC 仍未发布。

---

## 2026-08-09｜Alpha 内容管线、研究层与发布边界

### 2026-08-09 Public RC 基础建设｜进行中

- 冻结 `release:alpha-public-rc-1` 选择清单：10 个 core entities、3 个 text-version dependencies、14 条 relations；
- compiler 新增 structural dependency、relation closure 和三传统覆盖校验；Public 子集只保留可见 related links，并拒绝 dangling passage dependencies；
- 新增 `verify:public-rc`、`verify:public-rc:ready` 和默认 dry-run 的 `content:promote`；当前报告为 27 blockers、27 warnings，候选仍为 planning；
- 新增 migration 014、release candidate bundle rows 和 promotion audit rows；fresh/repeat PostgreSQL/PostGIS 通过，14 migrations、812 importer statements；
- 新增 compiler regression test，确认单个已审核 entity 的 Public artifact 不会携带 preview related entity。

- 新增 figure、concept、institution、event 专用 profile，并为 83/83 canonical entities 补齐结构化 profile；
- 新增 012 migration，补齐音频脚本/来源和 pending review 约束；本轮另新增 013 release candidate / promotion 约束；
- 实现确定性 transaction importer、database state verifier 和隔离的 PostgreSQL/PostGIS fresh/repeat 集成脚本；
- 真实集成验证通过：14 migrations、876 importer statements、83 entities、166 translations、80 temporal assertions、51 relations；重复执行结果一致；
- 补齐 SPA 页面语言/标题/描述 metadata、路由后主内容焦点和无障碍细节；
- 新增 Playwright + axe：22/22 tests 通过，覆盖语言、深链接、搜索、Explore URL、三位人物共享语境、地图交互、390px、reduced motion 和 14 条路由的 WCAG A/AA；
- `npm run check` 全绿；新增 `npm run check:release` 串联静态、E2E 与真实数据库门禁；Public RC blocker report 也纳入默认 check；
- 新增 `CHECKPOINT_2026-08-09.md`，明确测试路线和 Public 内容未完成边界。

下一阶段重点是按已冻结候选逐项完成来源定位、权利、双语和审核，形成第一个 Public RC；Cloudflare Preview 已作为 prototype 测试环境上线，随后继续接入 compiler read model 与 Public 内容发布边界。

### 2026-08-09 深化更新｜数据库契约、质量工作流与派生 read models

- domain schema 补齐 capability、temporal predicate、relation type registry，并对地点、路线和 museum object 使用专用 profile 约束；
- 004/014 migration 已 seed 当前 20 种 relation types 和完整 temporal predicate registry，时间断言不再接受任意字符串；
- compiler 生成确定性 `.artifacts/database/import-v1.json`，当前为 83 entities、166 translations、21 sources、166 entity-source、96 tradition assignments、80 temporal assertions、40 relations；
- 新增 `verify:database-bundle`，检查 UUID/key 唯一性、引用完整性、双语覆盖和三个顶级传统；
- source 增加 locator level 与 citation status；Public factual claim 必须有 verified edition/item/precise 外部来源，项目 editorial method 不算事实来源；
- 新增 `reviews.json` 与 review-check schema；compiler 生成 review queue 并对 Public entity/relation/audio 强制完整审核；
- 新增 quality report、source index、route manifest 和全 artifact SHA-256/bytes manifest；当前 Preview 有 284 个 Public blockers、21 个 warnings、113 个 blocking review subjects；
- Public compiler 改为 fail-closed，当前输出为 0 entities / 0 sources / 0 relations / 0 audio，不泄漏 Preview 来源或 review queue；
- compiler 新增现实地图、隋唐时间轴和三传统关系图 read models：每种语言 7 个地图点、62 个时间项、29 个图节点、30 条图边；没有坐标的近似区域不会被伪定位；
- `MuseumDataSource` / `StaticMuseumDataSource` 已建立 static/API 同构契约并在适配器边界进行 Zod 校验；
- 新增 `verify:architecture`，阻止 Web runtime/部署脚本连接数据库、直读 authoring content 或 `.artifacts`，并要求 prototype 与 Alpha contentVersion 明确分离；
- 发现并补上数据库来源质量字段缺口：新增 forward-only 011 migration，保存 `locator_level` / `citation_status`，import bundle 同时携带双语 citation；
- `npm run check` 全绿：5 个 test files、10 unit tests、14 migrations、Preview/Public 内容、数据库 bundle、架构边界、Vite build 和 static release；production build 无 `.map` 文件；
- 新增 `PROJECT_STATUS_AND_ROADMAP.md` 与 ADR-015，冻结下一阶段实施顺序。

本轮按工作线路完成了 P0 工程基础和 Lean Alpha 内容扩展：

- 新增 `@drf-museum/domain-schema`、`@drf-museum/core` 和 `@drf-museum/content-compiler` workspace packages；
- source of truth 扩展为 80 个双语实体：人物 9、文本 6、文本版本 6、passage 12、概念 6、机构 6、地点 9、事件 15、路线 2、对象 9；
- 独立 `relations.json` registry 达到 51 条关系，包含端点、关系类型、双语说明、证据层、置信度和来源；
- 新增 `audio.json` metadata：3 条双语脚本，当前均为 `not_recorded`；
- compiler 输出双语 entity/relation/audio/profile/search/manifest/read model，并验证稳定 UUID、来源端点、文本—版本—passage 链接、关系和媒体计数；
- `mvp-alpha-matrix.json`、`verify:matrix` 与 `verify:alpha-ready` 将最低配额、实际数量和完成门禁绑定；
- compiler 支持单实体 JSON 与批次数组 JSON，也支持 `preview` 与 `public` visibility。当前 Preview artifact 为 80 entities / 51 relations / 3 audio；Public artifact 为空且通过验证，因为全部内容仍是 preview 或未录制；
- Lean Alpha 全部数量配额已达成；展览 5 sections 高于 4 的最低配额，保留冻结的既有策展路线；
- 龙门石窟接入 UNESCO 权威入口，隋唐总览接入 The Met 公开参考；新增内容对不确定日期、研究性阶段标签和对象占位均显式降级证据层；
- 按技术架构建立 `database/migrations/001–010` authoring schema：PostGIS/pg_trgm、实体与双语、来源/locator/审核/修订、传统/时间/关系、现实与神圣地理硬约束、领域 profile、媒体/音频/展览和 Public 只读视图；
- 新增 `verify:migrations` 与 ADR-014，检查 forward-only 文件顺序、事务包裹、禁止破坏性 baseline SQL 和关键表契约；该阶段当时尚无真实数据库执行证据，已由本页上方工程检查点补齐；
- Explore 状态统一为可分享 URL contract：地图、神圣地理、时间、关系、传统筛选、阅读模式、时间范围和共享 `focus`；新增神圣地理象征层，明确不使用伪经纬度；
- 新增 `/research` Research 层入口，公开索引中的证据分组、版本链、地理边界和发布状态；
- Web 静态路径改由 `@drf-museum/core` read-model contract 生成；
- 浏览器验收通过：首页、Research、Explore 四视图、中文/英文、时间范围 URL、390px 移动端；控制台无 warn/error；修复移动端 `backdrop-filter` 导致底部导航定位到顶部的问题。

当前仍未完成：

1. 80 个实体仍为 Alpha 研究条目，其中 9 个 museum object 包含明确的占位记录，必须落实馆藏、编号、provenance 和图像权利；
2. compiler artifact 尚未替换当前公开 prototype 的 `apps/museum-web/public/data/v2`，这是有意保留的 preview/public 边界；
3. 仍需把主题级 source locator 深化到版本、卷页或目录编号，完成音频录制与审核；
4. PostgreSQL/PostGIS transaction importer 与 fresh/repeat migration/import 已完成；仍未完成的是全文搜索、正式 Public release 浏览器/线上 smoke 和 Cloudflare Pages 部署。

---

## 2026-08-04｜独立工程与第一版垂直切片

### P0 品牌变更

项目发起人在首版上线前冻结新名称：

- 中文：**道·儒·佛文明数字博物馆**；
- 英文：**Daoism, Confucianism & Buddhism Digital Museum**；
- profile：`dao-ru-fo`；
- 默认顺序：道 → 儒 → 佛；
- “儒释道”保留为历史术语和搜索别名。

当前正在同步 P0、工程标识、首页、展厅顺序、静态 manifest 和部署项目名。同步完成前不得发布。

### 2026-08-05 发布优先级调整

项目发起人要求优先完成 Cloudflare Pages 发布，再继续剩余视觉细化。

已完成发布前准备：

- P0 品牌、profile、首页传统顺序、展厅顺序已统一为“道 → 儒 → 佛”；
- `npm run check` 通过；
- `_redirects` 和 `_headers` 已进入 static build；
- 新增 `deploy/cloudflare-pages.sh`、`deploy/smoke-pages.sh`、`deploy/release-evidence.sh`；
- 新增 `docs/DEPLOYMENT.md`；
- production Vite build 已关闭公开 source maps；
- Cloudflare Pages 项目名冻结为 `dao-ru-fo-digital-museum`。

下一步按纪律执行：

1. 重跑无 source map 的 release build；
2. 记录 pre-deploy hashes；
3. 从工程基线创建正式 release checkpoint；
4. 部署 Cloudflare Pages；
5. 运行 production HTTP smoke；
6. 回写 deployment ID、公开 URL、hashes 和已知问题；
7. 上线后继续 1440px/390px 视觉细化。

### 已确认产品与架构

- 新建独立工程 `digital-museum/`，拥有独立 Git；
- `previous project` 只作为能力与行为参考，不加入新 workspace；
- 产品采用 Museum / Explore / Research 三层；
- 内容遵循统一实体注册、本体和静态拆包方向；
- production 目标为 Cloudflare Pages 静态站；
- 隋唐首版优先分别讲清佛、道、儒，再展示长安交汇；
- UI 使用 `ui-ux-pro-max` 生成并人工校正的设计系统；
- 黄金分割用于 61.8/38.2 主次布局、7/5 十二列映射、Fibonacci 间距和 √φ 字体比例。

### 已实现

- React + Vite + strict TypeScript + React Router 独立前端；
- 中英文 profile 与 URL `lang` 状态；
- 首页黄金分割 Hero、三传统入口、文明河流 SVG；
- 展览索引；
- 五章节展览《长安：三教相遇的世界之都》；
- Explore 地图、时间轴和三传统问题图谱；
- 人物、passage、地点详情和来源面板；
- 静态搜索索引；
- 静态数据 v2 拆包：
  - profile；
  - overview；
  - exhibition；
  - entity detail；
  - map GeoJSON；
  - timeline；
  - graph；
  - search；
  - manifest；
- `Api/Static DataSource` 中 Static 部分的第一版接口；
- 静态 artifact verifier；
- reduced motion、skip link、键盘语义和移动端布局基础。

### 核心内容

- 佛：玄奘、《心经》、“色不异空”；
- 道：司马承祯、《道德经》、“道法自然”；
- 儒：孔颖达、《五经正义》、“克己复礼为仁”；
- 核心地点：长安、大慈恩寺、楼观台、长安国子监、洛阳、敦煌、五台山；
- 当前属于 first-viewable prototype，不宣称已达到 Lean Public MVP 配额。

### 主要文件

- `package.json`
- `apps/museum-web/src/App.tsx`
- `apps/museum-web/src/layout/MuseumLayout.tsx`
- `apps/museum-web/src/pages/`
- `apps/museum-web/src/styles.css`
- `apps/museum-web/public/data/v2/`
- `design-system/dao-ru-fo-digital-museum/MASTER.md`
- `scripts/verify-static.mjs`

### 已执行门禁

```text
npm run typecheck  PASS
npm test           PASS (2 tests)
npm run build      PASS
npm run verify:static PASS
```

构建产物：

```text
apps/museum-web/dist/index.html
CSS gzip: 6.38 kB
React vendor gzip: 17.37 kB
App JS gzip: 68.06 kB
contentVersion: 2026.08.prototype.1
```

### 浏览器验收

已确认：

- 首页语义结构；
- h1/h2/h3 层级；
- skip link；
- 主要导航；
- 中英文切换控件；
- 三传统入口；
- 展览和 passage 深链接；
- 页面可从本地 production preview 加载。

待继续：

- 桌面截图视觉检查；
- 390px 响应式检查；
- 展览章节滚动与 Explore 切换；
- 搜索输入；
- entity detail；
- console error/warn；
- 静态 deep-link fallback；
- Cloudflare Pages 发布和线上 smoke。

### 已知风险

1. 当前 text/concept/非核心 place 使用搜索索引生成的原型详情 fallback，完整来源将在下一内容批次补齐。
2. 地图为真实坐标投影的历史地理示意，不是完整 Leaflet 底图。
3. 部分唐代内容仍标明“正式版补完整书目”，不能误写为最终 publishable 学术条目。
4. `npm audit --omit=dev` 对 React Router 7.18.2 报告 RSC Mode CSRF advisory。当前站点只使用静态 `BrowserRouter`，没有 RSC、Action、Server Action、SSR 或 production API，该攻击路径不适用于当前部署；仍需在上游发布可用补丁后升级并清除 audit。
5. Cloudflare Pages Preview 已发布并完成线上 smoke；production 尚未发布，production 发布后仍必须重新执行线上 smoke。

### 下一步

1. 完成浏览器桌面与移动视觉验收；
2. 修复发现的问题；
3. 增加 SPA `_redirects` 与安全 headers；
4. 重跑全部门禁；
5. 发布 Cloudflare Pages；
6. 验证首页、JSON、deep link、中英文和移动端；
7. 更新本文件记录 deployment ID、公开 URL、commit 和最终 hashes。
