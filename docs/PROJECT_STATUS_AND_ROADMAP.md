# 项目现状与实施路线图

> 基线日期：2026-08-13
> 当前判断：工程、全历史 map-first 入口与第二批 100 条内容闭环已成立；production 继续作为线上唯一事实基准。当前正在执行提交前全量门禁，随后停在“第二批内容上线复盘”节点，Public RC 边界保持独立；Museum / Explore / Research 保留为深度层。

## 2026-08-13 第二批 100 条内容发布前收口点

- 本轮在首批 100 人物基线上新增 40 位人物、40 个事件、20 个地点；当前完整 Alpha 为 428 个编译实体（人物 140、事件 145、地点 80、路线 4、文本 16、文本版本 8、概念 6、机构 6、博物馆对象 9、段落 14）、647 条关系、91 个来源、3 条音频；数据库 bundle 预期为 431 个实体（含 3 个三传统字典实体）；
- 新增人物按汉代经学/儒学 15、道教 10、佛教 15 分组；每人均有时间、来源、事件、地点和既有数据库人物连接；新增人物之间有 15 条互动关系，关系和地点投影遵守证据层与传统记忆边界；
- `npm run verify:second-100` 已通过；完整 `npm run check`、Cloudflare Pages production 部署和线上 default/unique smoke 是本轮剩余发布动作。部署后不自动继续扩容，重新进入用户复盘与事实核验节点。

## 2026-08-11 A1+A2 production 收口点（历史）

- **产品方向已校正**：首页以互动现实地图为核心；人物是入口，时间、空间、事件、地点、路线、关系、经典、言论与后世影响共同组成网络；不再用隋唐 MVP 限制全历史范围；
- **当前可用交互**：Leaflet 底图、缩放、拖动、双击、键盘、全境、popup、地点 dossier、路线 polyline、路线账本、人物关系 focus、可访问地点索引；首页与 Explore 共用 `CivilisationMap`；
- **全历史读模型**：地图和时间轴优先读 `overview`；时间轴 `-600—1200 / 84 events`，`suitang` 保留为 `581—907 / 63 events` 兼容切片；已有地图点带时间范围，并与共享 URL 时间窗口联动；
- **人物地图状态**：当前 26 位人物入口全部通过回归；A1 人物进入现实地图或明确位置状态，A2 神话/神圣人物进入 symbolic cosmos；没有把神话人物伪造为现实经纬度；
- **共享语境入口**：人物选择器动态读取 search read model，首页提供 26 位人物的地图/Cosmos 或 dossier 入口；每位新增人物都连接时间、地点/空间、事件、文本/传承、关系与来源；
- **当前内容规模（历史快照）**：140 个实体、26 位人物、21 个地点、31 个事件、3 条路线、159 条关系、54 个来源、3 条音频；现实地图索引显示 14 个地点，symbolic cosmos 显示 16 个节点与 12 条边；
- **内容审核状态**：Full Alpha quality report 为 352 blockers；review queue 为 302 subjects（227 blocking / 75 non-blocking）；这保持为 Research 中的透明审核队列，不等同于 Public RC 批准；
- **线上基线**：默认 <https://dao-ru-fo-digital-museum.pages.dev>；最新 unique <https://23c99acc.dao-ru-fo-digital-museum.pages.dev>；deployment ID `23c99acc-a45d-48d3-92fd-8d7b4a69438a`；`main` / `cc734ca`；manifest `2026.08.alpha.1 / alpha / preview`；Cloudflare production-only；上一版 `c4ae1eb6-61a0-42cc-9e17-94323fa197cb` 可回滚；
- **验收证据**：production 脚本内置 `npm run check` 全部通过；unit 17/17；Playwright + axe `48 passed / 1 skipped`（49 tests）；unique/default HTTP smoke 各 `25/25`；线上浏览器确认首页 26 人物、真实地图/缩放、Cosmos 3/7/5/12 结构、人物聚焦、庄子 dossier 与 0 控制台错误；
- **本轮暂停**：暂不继续扩大人物、地点、神话空间或接受史范围。下一步以线上复盘和事实/来源/权利/可访问性审核为主；重新进入内容批次前，沿用 [下一批内容审核闸门](./NEXT_CONTENT_REVIEW_GATE_2026-08-11.md) 的 A/B/C/D 规则并重新授权。

### 下一步执行顺序（当前暂停点）

1. 先复盘 production 首页、真实地图、人物入口和 symbolic cosmos，不继续加内容数量；
2. 对本轮 A1/A2 人物补做事实、来源 locator、rights、accessibility 与后世影响审核；
3. 若用户授权下一批，再按“人物—时间—地点/空间—事件—文本—关系—历史地位—后世影响”完整闭环扩展，不接受孤立人物卡；
4. 每批继续走：本地 schema/content/compiler 门禁 → production 部署 → default/unique smoke → 线上浏览器复盘 → handoff；遇到神话定位、身份合并、接受地选择立即暂停请用户判断。

## 2026-08-11 全历史时空人物地图战略调整（上一阶段）

- 产品范围不再以隋唐 MVP 为边界。隋唐是默认精选场景之一；总体覆盖神话与传统起源、印度佛教源流、先秦、秦汉、魏晋南北朝、隋唐、宋元、明清与近现代传播；
- 人物是第一入口，时间和空间是共同骨架。所有人物都必须拥有现实活动地、传统关联地、后世记忆地、路线、象征空间或明确 `position_pending`，不能点击后得到空地图；
- 现实地图与神圣地理继续隔离坐标，但共享当前人物、时代和关系。历史人物与神格化身份建立独立节点；神话人物通过传统顺序、文献见证和现实接受地点进入系统；
- 下一执行主线：状态/位置契约 → 复用 previous project Leaflet 工作台 → 地图进入首页 → 当前 12 人位置补齐 → 全历史三轨时间联动 → 持续扩充著名人物、城市和路线；
- 日常迭代改为 production-only。按改动风险完成必要本地检查后直接部署 Cloudflare production；不再重复维护 Preview alias 和 Public RC promotion。旧 RC/Preview 只作历史审计记录；
- 详细人物清单、位置分层、首页结构、read model、组件复用、执行 checklist、简化发布与验收标准见 [全历史时空人物地图战略](./STRATEGIC_REALIGNMENT_MAP_FIRST_2026-08-11.md)；
- 当前切片已完成并上线：Leaflet 真实地图进入首页，Explore 与首页共用地图工作台，已有 8 个现实地图点、2 条路线和 12 位人物索引可进入；default/unique production smoke 均 23/23，现停在可复盘节点。

### 2026-08-11 当前执行状态

- 交互：缩放、拖动、双击、键盘地图、全境、popup、地点 dossier、路线 polyline、路线账本和可访问地点索引已成立；
- 共享状态：已有关系 focus 会过滤地图地点；首页人物索引提供地图/档案双入口；
- 内容边界：没有新增未经审核的人物、神话坐标或历史断言；当前空间层仍是既有 Alpha read model；
- 验证：`npm run check` 全部通过；Web unit 4/4；地图/首页/人物 focus targeted E2E 4/4；唯一一次完整 axe 异常为导航时序，独立重跑 1/1 通过；
- 下一停点已达到：等待用户线上复盘地图首屏、人物地图入口和待核位置呈现；下一批神话/历史人物、现实记忆地点和时间层扩展遇到策展判断时暂停确认。

## 2026-08-10 完整 Alpha production 同步

- production 当前同步最新完整 Alpha：91 个实体、90 条关系、3 个音频读模型、38 个来源；人物 12、地点 10、事件 17；manifest 为 `2026.08.alpha.1 / alpha / preview`；最新 map-first unique deployment 为 `e0e235b0-abea-4be2-bcfc-8bf0a91cc127`；
- 当前 Alpha 质量状态为 205 blockers、17 warnings、184 review subjects（109 blocking）；这些内容可用于线上研究和复盘，但不等同于 Public RC 已批准；
- Public RC2 已 promotion：34 个 Public entities、41 条 Public relations、25 个来源、0 blocker；它仍作为下一次 Public 发布时的审核基准；
- Cloudflare Preview：[public-rc](https://public-rc.dao-ru-fo-digital-museum.pages.dev)；production：[dao-ru-fo-digital-museum.pages.dev](https://dao-ru-fo-digital-museum.pages.dev)；production 后续作为线上运行时事实基准，authoring/compiler 作为可追溯修改源；

## 1. 项目现在是什么

道·儒·佛文明数字博物馆是一套“静态公开站 + 构建期研究内容系统”。产品分为三层：

- Museum：以策展问题、展览章节和实体详情组织叙事；
- Explore：把真实地理、神圣象征空间、历史时间、传统时间和结构化关系分层呈现；
- Research：公开来源、证据等级、时间断言、版本链、权利与审核状态。

生产环境目标仍是 Cloudflare Pages 静态站。PostgreSQL/PostGIS 只用于 authoring、校验和静态构建，浏览器与 Pages 部署不得连接数据库。

```text
content/*.json
    ↓ Zod domain schema + compiler
    ├─ 本机临时 preview artifact       内部 Preview read models
    ├─ 本机临时 public artifact        fail-closed Public read models
    └─ .artifacts/database/import-v1.json
             ↓ transaction importer + state verifier
       PostgreSQL + PostGIS authoring store

apps/museum-web/public/data/v2        first-viewable prototype 基底（只读）
    ↓ prepare-web-public
本机临时 Web public staging           过滤 iCloud 冲突并叠加 compiler read models
    ↓ Vite
Cloudflare Pages static dist          不含数据库连接
```

## 2. 可核验的当前进度

| 领域 | 当前状态 | 核验结果 |
| --- | --- | --- |
| Web 原型 | 可运行、可构建、可自动回归；第二批 100 条内容正在同步 production Full Alpha | 中英文、Museum/Explore/Research、桌面与 390px 验收保持既有覆盖；本轮增加批次级闭环校验，并在发布后补录最终浏览器与线上烟测证据 |
| Alpha 内容 | 首批 100 人物后再扩充 100 条关联内容 | 428 个编译内容实体、647 条关系、3 条音频脚本、91 个来源；人物 140、事件 145、地点 80、路线 4 |
| 数据库导入契约 | 已生成并验证 | 143 个 canonical entities（含 3 个顶级传统）、54 个来源、286 条翻译、319 条 entity-source、157 条 tradition assignment、140 条时间断言；1 个 Public RC2、56 个候选 subject、391 条 review records 和 1 个 promotion record |
| Explore 派生模型 | 第二批编译前后保持单一 canonical read model | Full Alpha 将自动同步 compiler 的双语实体、140 位人物搜索入口、91 个来源、75 个现实地图地点索引、18 节点/14 边 symbolic-cosmos 模型、全历史 overview 时间轴和 647 条关系；点击人物/地点/事件继续只改变共享 focus，面板、地图和时间轴从同一关系集合反向派生 |
| 内容治理 | 完整 Alpha 继续保持透明审核边界；第二批发布前复核中 | quality report、review queue、source index、route manifest、SHA-256 manifest 均由 compiler 生成；本批新增内容继续保留 `preview` publication 与证据等级，不把 Full Alpha 上线误称为 Public RC 批准 |
| 数据库 schema | 真实集成通过 | 001–015 migration、checksum-aware runner、事务 importer、state verifier、PostGIS/pg_trgm、领域 profile、Public 只读视图和 release/promotion 留痕；fresh/repeat 结果一致 |
| 发布隔离 | 已固化 | Public artifact 继续独立保持 34 entities / 41 relations / 0 audio / 0 blocker；本批 Full Alpha 目标为 428 entities / 647 relations / 3 audio；`verify:architecture` 阻止 Web/部署连接数据库或直读 Alpha 源内容；production 默认 public，只有显式 `CF_PAGES_PRODUCTION_VISIBILITY=preview` 才进入 Full Alpha 模式 |
| 总门禁 | 发布前执行中 | 批次闭环已通过；待完成 `npm run check`、migration/import plan、compiler、database bundle、Vite build、static release、Cloudflare production 与线上 default/unique HTTP smoke |

> 以下是此前更大 Preview 的历史快照，不是当前 production Alpha；当前线上基线以本文件顶部和 [最新 production handoff](./HANDOFF.md) 为准。

此前更大 Preview quality report 有 278 个 Public 阻塞项：

- `NOT_PUBLIC`：78；
- `NOT_PUBLISHABLE`：78；
- `NO_VERIFIED_LOCATOR`：35；
- `REVIEW_CHECKS_INCOMPLETE`：78；
- `SOURCE_RIGHTS_BLOCKED`：9。

另有 17 个警告：9 个 museum object 占位记录，以及 8 个仍处于 draft 的 source locator。Review queue 有 173 个 subject，其中 146 个仍是更大 Preview 的 blocking 工作项；Public RC 独立 artifact 已为 0 blocker。这些数字是内容工作队列，不是程序错误。

## 3. 已经成立的关键能力

### 3.1 统一内容模型

- 统一 EntityKind、RelationType、TemporalPredicate、Capability registry；
- 稳定 UUIDv5，以 `{kind}:{slug}` 为 canonical identity；
- 双语、来源、时间、传统归属、证据层、发布状态和审核状态均为 schema 必填或受控字段；
- 关系已开始承载人物—事件、事件—地点、言论归属、后世接收/记忆/神格化语义；`qualifiers` 和关系时间断言会进入 read model；
- passage 强制关联 text 与 text version；真实地理与神圣象征地理有互斥硬约束。

### 3.2 发布质量控制

- Public 实体必须同时满足 `publicationState=public`、`reviewStatus=publishable`、来源 locator、权利和 review checks；
- 项目自身编辑说明不能冒充外部事实来源；
- Public 输出只携带可见内容实际引用的来源，不泄漏 Preview source/review queue；
- 所有生成 JSON 由 checksum manifest 覆盖，文件清单、bytes 和 SHA-256 可复验。

### 3.3 面向未来的读取契约

- `MuseumDataSource` 抽象了 static/API 同构读取；
- `StaticMuseumDataSource` 在适配器边界使用 Zod 验证返回数据；
- path contract 覆盖 profile、entity、search、relations、audio、sources、地图、时间、图、comparisons、text-readings、quality、review、routes 和 checksums；
- 当前 Web 原型尚未切换到 Alpha schema，避免把 Preview 内容误发布。

## 4. 下一阶段实施顺序

### A：全历史状态与位置契约

1. 扩展 RouteState：当前实体标签、时代、历史/传统/接受时间模式、地图图层、LOD 和可分享视口；
2. 定义 exact site、城市尺度、推定地区、传统关联、后世记忆、路线走廊和 symbolic cosmos 七类位置；
3. 历史人物、传统人物、神话/神圣人物和后世神格化身份分层；
4. compiler 生成按时代、区域、人物、路线、城市和神圣空间拆分的地图 read models。

### B：previous project 地图工作台复用

1. 提取 Leaflet、底图、聚合、路线、fit-all、fly-to、popup 和键盘/触控交互；
2. 提取时代 rail、全局搜索、统一详情 drawer、底部时间轴和 URL 恢复；
3. 改为消费本项目 `MuseumDataSource`，不复制旧 profile、seed、品牌和 full-atlas 数据包；
4. 当前 SVG 地图降为 fallback，真实地图与神圣地理继续使用两个坐标系统。

### C：地图进入首页

1. 首页第一屏调整为全历史时代轨道、地图、实体浏览器和时间轴；
2. 当前 12 张人物卡移入人物标签；
3. 人物、事件、地点、路线、关系和经典共享同一筛选与 focus；
4. `/explore` 与首页共用工作台；Museum、Research 和 dossier 保留独立路由。

### D：当前人物位置与全历史内容

1. 先确保当前 12 人全部有现实活动地、传统关联地、后世记忆地、路线、symbolic position 或明确 `position_pending`；
2. 再按文明原型、道家/道教、儒家、佛教和制度桥梁人物持续扩展，不设最终数量上限；
3. 内容建设单位改为人物—时间—地点—事件—路线—文本—历史地位—后世影响的完整语境；
4. 城市、机构、路线和三教交汇事件与人物同步扩展，避免再次形成只有人物卡、没有空间网络的内容结构。

### E：production-only 连续发布

1. 内容、普通 UI、schema/部署改动按三种风险执行不同强度的本地门禁；
2. 必要验证通过后直接部署 Cloudflare production，不再维护日常 Preview alias 或 Public RC promotion；
3. 每次记录 default/unique URL、deployment ID、版本/校验和、线上 smoke 和 handoff；
4. smoke 失败恢复上一已知版本；Cloudflare 保持纯静态、可迁移，不引入平台专有运行时依赖。

### F：长期能力

- 城市/区域/机构三级 LOD、关系网络和无障碍邻接表；
- IIIF、馆藏媒体、3D 模型与可追溯 asset pipeline；
- 内容修订历史、diff、撤回和策展/研究工作台；
- 中文别名、异体字、法号、梵巴藏文转写和全球搜索；
- 多时期专题展览、学习路径和可复用内容包；
- 可观测性与匿名内容发现指标，前提是完成隐私评审。

## 5. 近期完成标准

下一阶段完成标准是“全历史人物地图首页成立”：

- 打开 production 即可看到并操作地图；
- 当前 12 人点击后都有位置、路线、象征空间或明确待核说明；
- 地图、时代、时间范围、人物列表和详情 focus 联动；
- 历史、传统、神话、神圣身份和接受史不混写；
- 真实地图具备底图、缩放、平移、聚合、图层、图例、路线、弹窗和详情聚焦；
- 神圣地理没有伪经纬度，但能连接现实世界的接受和记忆地点；
- 刷新、返回和分享恢复当前场景；
- 桌面、390px、键盘、触控、reduced-motion 和 axe 基线通过；
- production 部署完成 default/unique HTTP、JSON 和关键浏览器 smoke；
- `HANDOFF.md` 顶部记录唯一当前版本与回滚证据。

## 6. 常用证据命令

```bash
npm run check
npm run build:content
npm run verify:database-bundle
npm run db:import:plan
npm run test:e2e
npm run verify:database:integration
npm run verify:content
npm run build:content:public
npm run verify:content:public
npm run verify:architecture
npm run check:release
```

主要机器可读证据位于 `.artifacts/content/v2/manifest/` 和 `.artifacts/database/import-v1.json`；它们是构建产物，不是当前公开站数据。
