# 项目现状与实施路线图

> 基线日期：2026-08-09
> 当前判断：工程和 Lean Alpha 内容骨架已经成立，但公开站仍是 first-viewable prototype；Alpha 研究内容尚未达到 Public 发布标准。

## 1. 项目现在是什么

道·儒·佛文明数字博物馆是一套“静态公开站 + 构建期研究内容系统”。产品分为三层：

- Museum：以策展问题、展览章节和实体详情组织叙事；
- Explore：把真实地理、神圣象征空间、历史时间、传统时间和结构化关系分层呈现；
- Research：公开来源、证据等级、时间断言、版本链、权利与审核状态。

生产环境目标仍是 Cloudflare Pages 静态站。PostgreSQL/PostGIS 只用于 authoring、校验和静态构建，浏览器与 Pages 部署不得连接数据库。

```text
content/*.json
    ↓ Zod domain schema + compiler
    ├─ .artifacts/content/v2          内部 Preview read models
    ├─ .artifacts/content/public-v2   fail-closed Public read models
    └─ .artifacts/database/import-v1.json
             ↓ transaction importer + state verifier
       PostgreSQL + PostGIS authoring store

apps/museum-web/public/data/v2        当前已验收的 first-viewable prototype
    ↓ Vite
Cloudflare Pages static dist          不含数据库连接
```

## 2. 可核验的当前进度

| 领域 | 当前状态 | 核验结果 |
| --- | --- | --- |
| Web 原型 | 可运行、可构建、可自动回归 | 中英文、Museum/Explore/Research、桌面与 390px 验收已完成；19 个 Playwright 测试通过，含 14 条核心路由 axe WCAG A/AA 扫描；当前公开数据版本 `2026.08.prototype.1` |
| Alpha 内容 | 最低数量完成 | 80 个实体、30 条关系、3 条音频脚本、18 个来源；双语实体 artifact 共 160 个 |
| 数据库导入契约 | 已生成并验证 | 83 个 canonical entities（含 3 个顶级传统）、166 条翻译、164 条 entity-source、96 条 tradition assignment、80 条时间断言 |
| Explore 派生模型 | 已生成并验证 | 每种语言 7 个现实地图点、62 个时间项、29 个图节点、30 条图边 |
| 内容治理 | 机器可读 | quality report、review queue、source index、route manifest、SHA-256 manifest 均由 compiler 生成 |
| 数据库 schema | 真实集成通过 | 001–012 migration、checksum-aware runner、事务 importer、state verifier、PostGIS/pg_trgm、领域 profile 和 Public 只读视图；fresh/repeat 结果一致 |
| 发布隔离 | 已固化 | Public Alpha artifact 当前为 0 entities / 0 sources / 0 relations / 0 audio；`verify:architecture` 阻止 Web/部署连接数据库或直读 Alpha 源内容 |
| 总门禁 | 通过 | typecheck、8 unit tests、19 E2E/a11y tests、migration/import integration、architecture、Preview/Public compiler、bundle、content、quota、Vite build、static release 全通过 |

当前 Preview quality report 有 314 个 Public 阻塞项：

- `NOT_PUBLIC`：80；
- `NOT_PUBLISHABLE`：80；
- `NO_VERIFIED_LOCATOR`：65；
- `REVIEW_CHECKS_INCOMPLETE`：80；
- `SOURCE_RIGHTS_BLOCKED`：9。

另有 21 个警告：9 个 museum object 占位记录，以及 12 个仍处于 draft 的 source locator。Review queue 有 113 个 subject，当前全部 blocking。这些数字是内容工作队列，不是程序错误。

## 3. 已经成立的关键能力

### 3.1 统一内容模型

- 统一 EntityKind、RelationType、TemporalPredicate、Capability registry；
- 稳定 UUIDv5，以 `{kind}:{slug}` 为 canonical identity；
- 双语、来源、时间、传统归属、证据层、发布状态和审核状态均为 schema 必填或受控字段；
- passage 强制关联 text 与 text version；真实地理与神圣象征地理有互斥硬约束。

### 3.2 发布质量控制

- Public 实体必须同时满足 `publicationState=public`、`reviewStatus=publishable`、来源 locator、权利和 review checks；
- 项目自身编辑说明不能冒充外部事实来源；
- Public 输出只携带可见内容实际引用的来源，不泄漏 Preview source/review queue；
- 所有生成 JSON 由 checksum manifest 覆盖，文件清单、bytes 和 SHA-256 可复验。

### 3.3 面向未来的读取契约

- `MuseumDataSource` 抽象了 static/API 同构读取；
- `StaticMuseumDataSource` 在适配器边界使用 Zod 验证返回数据；
- path contract 覆盖 profile、entity、search、relations、audio、sources、地图、时间、图、quality、review、routes 和 checksums；
- 当前 Web 原型尚未切换到 Alpha schema，避免把 Preview 内容误发布。

## 4. 下一阶段实施顺序

### P0：完成第一批可公开内容

1. 优先选择 8–12 个核心实体形成 release candidate，而不是一次性审核全部 80 个；
2. 把事实来源深化到 edition/item/precise locator，补标准 citation；
3. 完成 schema、fact、tradition、bilingual、rights、accessibility、editorial checks；
4. 为 9 个 museum object 落实真实馆藏、编号、provenance、图像许可、裁切和色彩策略，无法落实的对象不进入 Public；
5. 完成 3 条音频的录制、字幕/转录、响度、许可和无障碍复核；
6. 只通过显式 promotion 将审核完成的对象改为 Public，不批量复制 Preview 目录。

### P1：把新 read model 接入产品

1. 用 `MuseumDataSource` 替换 Web 中的原型专用数据对象；
2. 实现来源索引、质量面板和审核状态的 Research UI；
3. 将 compiler 生成的现实地图、时间轴和关系图接入 Explore；
4. 新增 route corridor 显示，但重建路线默认禁止伪精确动画；
5. 实现 sacred cosmos compiler read model，使象征空间也来自 source of truth；
6. 增加实体比较、文本版本对读、passage 并排阅读与来源跳转。

### P1：发布工程化

1. 把 `check:release` 和临时 PostGIS 集成加入 CI；
2. 冻结 Node、PostgreSQL/PostGIS 和 Wrangler 版本；
3. 发布 Cloudflare Pages preview，执行 HTTP smoke 和真实浏览器复验；
4. preview 通过后再发布 production，并记录 deployment ID、URL、commit 和 hashes。

### P2：长期能力

- PostgreSQL 全文检索、别名与中文检索策略；
- IIIF、馆藏媒体、3D 模型与可追溯 asset pipeline；
- 内容修订历史、diff、撤回与版本发布记录；
- curator/admin 工作台和 review queue 操作界面；
- 多 profile、多时期展览和可复用专题包；
- 可观测性、匿名使用分析和内容发现指标，前提是完成隐私评审。

## 5. 近期完成标准

下一里程碑不是“80 个条目全部上线”，而是一个可审计的 Public RC：

- 至少一个完整展览切片；
- 核心实体、关系、地图点、时间项和 passage 均有 verified locator；
- Public quality report 无 blocker；
- Public review queue 无 blocking item；
- fresh/repeat database 测试通过；
- E2E、a11y、build、static smoke 全绿；
- Preview 和 Public 的差异有明确 promotion 记录。

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
