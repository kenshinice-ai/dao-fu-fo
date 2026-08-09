# 道·儒·佛文明数字博物馆｜项目交接文档

> 维护纪律：每个可独立说明的实现、修复、验证或发布阶段完成后立即更新。
> 最后更新：2026-08-09
> 当前阶段：Alpha content pipeline / First Viewable Prototype

---

## 2026-08-09｜Alpha 内容管线、研究层与发布边界

### 2026-08-09 Public RC 基础建设｜进行中

- 冻结 `release:alpha-public-rc-1` 选择清单：10 个 core entities、3 个 text-version dependencies、14 条 relations；
- compiler 新增 structural dependency、relation closure 和三传统覆盖校验；Public 子集只保留可见 related links，并拒绝 dangling passage dependencies；
- 新增 `verify:public-rc`、`verify:public-rc:ready` 和默认 dry-run 的 `content:promote`；当前报告为 53 blockers、27 warnings，候选仍为 planning；
- 新增 migration 013、release candidate bundle rows 和 promotion audit rows；fresh/repeat PostgreSQL/PostGIS 通过，13 migrations、803 importer statements，指纹 `52cbaae271faf9f3f4978eb4f6fa6dd7`；
- 新增 compiler regression test，确认单个已审核 entity 的 Public artifact 不会携带 preview related entity。

- 新增 figure、concept、institution、event 专用 profile，并为 83/83 canonical entities 补齐结构化 profile；
- 新增 012 migration，补齐音频脚本/来源和 pending review 约束；本轮另新增 013 release candidate / promotion 约束；
- 实现确定性 transaction importer、database state verifier 和隔离的 PostgreSQL/PostGIS fresh/repeat 集成脚本；
- 真实集成验证通过：13 migrations、803 importer statements、83 entities、166 translations、80 temporal assertions、30 relations；重复执行指纹保持 `52cbaae271faf9f3f4978eb4f6fa6dd7`；
- 补齐 SPA 页面语言/标题/描述 metadata、路由后主内容焦点和无障碍细节；
- 新增 Playwright + axe：19/19 tests 通过，覆盖语言、深链接、搜索、Explore URL、390px、reduced motion 和 14 条路由的 WCAG A/AA；
- `npm run check` 全绿；新增 `npm run check:release` 串联静态、E2E 与真实数据库门禁；Public RC blocker report 也纳入默认 check；
- 新增 `CHECKPOINT_2026-08-09.md`，明确测试路线和 Public 内容未完成边界。

下一阶段重点是按已冻结候选逐项完成来源定位、权利、双语和审核，形成第一个 Public RC；随后把 compiler read model 接入 Web 并发布 Cloudflare preview。

### 2026-08-09 深化更新｜数据库契约、质量工作流与派生 read models

- domain schema 补齐 capability、temporal predicate、relation type registry，并对地点、路线和 museum object 使用专用 profile 约束；
- 004 migration 已 seed 当前 14 种 relation types 和完整 temporal predicate registry，时间断言不再接受任意字符串；
- compiler 生成确定性 `.artifacts/database/import-v1.json`，当前为 83 entities、166 translations、18 sources、164 entity-source、96 tradition assignments、80 temporal assertions、30 relations；
- 新增 `verify:database-bundle`，检查 UUID/key 唯一性、引用完整性、双语覆盖和三个顶级传统；
- source 增加 locator level 与 citation status；Public factual claim 必须有 verified edition/item/precise 外部来源，项目 editorial method 不算事实来源；
- 新增 `reviews.json` 与 review-check schema；compiler 生成 review queue 并对 Public entity/relation/audio 强制完整审核；
- 新增 quality report、source index、route manifest 和全 artifact SHA-256/bytes manifest；当前 Preview 有 314 个 Public blockers、21 个 warnings、113 个 blocking review subjects；
- Public compiler 改为 fail-closed，当前输出为 0 entities / 0 sources / 0 relations / 0 audio，不泄漏 Preview 来源或 review queue；
- compiler 新增现实地图、隋唐时间轴和三传统关系图 read models：每种语言 7 个地图点、62 个时间项、29 个图节点、30 条图边；没有坐标的近似区域不会被伪定位；
- `MuseumDataSource` / `StaticMuseumDataSource` 已建立 static/API 同构契约并在适配器边界进行 Zod 校验；
- 新增 `verify:architecture`，阻止 Web runtime/部署脚本连接数据库、直读 authoring content 或 `.artifacts`，并要求 prototype 与 Alpha contentVersion 明确分离；
- 发现并补上数据库来源质量字段缺口：新增 forward-only 011 migration，保存 `locator_level` / `citation_status`，import bundle 同时携带双语 citation；
- `npm run check` 全绿：4 个 test files、8 tests、11 migrations、Preview/Public 内容、数据库 bundle、架构边界、Vite build 和 static release；production build 无 `.map` 文件；
- 新增 `PROJECT_STATUS_AND_ROADMAP.md` 与 ADR-015，冻结下一阶段实施顺序。

本轮按工作线路完成了 P0 工程基础和 Lean Alpha 内容扩展：

- 新增 `@drf-museum/domain-schema`、`@drf-museum/core` 和 `@drf-museum/content-compiler` workspace packages；
- source of truth 扩展为 80 个双语实体：人物 9、文本 6、文本版本 6、passage 12、概念 6、机构 6、地点 9、事件 15、路线 2、对象 9；
- 独立 `relations.json` registry 达到 30 条关系，包含端点、关系类型、双语说明、证据层、置信度和来源；
- 新增 `audio.json` metadata：3 条双语脚本，当前均为 `not_recorded`；
- compiler 输出双语 entity/relation/audio/profile/search/manifest/read model，并验证稳定 UUID、来源端点、文本—版本—passage 链接、关系和媒体计数；
- `mvp-alpha-matrix.json`、`verify:matrix` 与 `verify:alpha-ready` 将最低配额、实际数量和完成门禁绑定；
- compiler 支持单实体 JSON 与批次数组 JSON，也支持 `preview` 与 `public` visibility。当前 Preview artifact 为 80 entities / 30 relations / 3 audio；Public artifact 为空且通过验证，因为全部内容仍是 preview 或未录制；
- Lean Alpha 全部数量配额已达成；展览 5 sections 高于 4 的最低配额，保留冻结的既有策展路线；
- 龙门石窟接入 UNESCO 权威入口，隋唐总览接入 The Met 公开参考；新增内容对不确定日期、研究性阶段标签和对象占位均显式降级证据层；
- 按技术架构建立 `database/migrations/001–010` authoring schema：PostGIS/pg_trgm、实体与双语、来源/locator/审核/修订、传统/时间/关系、现实与神圣地理硬约束、领域 profile、媒体/音频/展览和 Public 只读视图；
- 新增 `verify:migrations` 与 ADR-014，检查 forward-only 文件顺序、事务包裹、禁止破坏性 baseline SQL 和关键表契约；该阶段当时尚无真实数据库执行证据，已由本页上方工程检查点补齐；
- Explore 状态统一为可分享 URL contract：地图、神圣地理、时间、关系、传统筛选、阅读模式和时间范围；新增神圣地理象征层，明确不使用伪经纬度；
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
5. Cloudflare Pages 尚未发布，发布后必须以线上 smoke 为准。

### 下一步

1. 完成浏览器桌面与移动视觉验收；
2. 修复发现的问题；
3. 增加 SPA `_redirects` 与安全 headers；
4. 重跑全部门禁；
5. 发布 Cloudflare Pages；
6. 验证首页、JSON、deep link、中英文和移动端；
7. 更新本文件记录 deployment ID、公开 URL、commit 和最终 hashes。
