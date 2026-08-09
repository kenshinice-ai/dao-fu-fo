# Alpha 内容管线第一批

状态：执行中。内容版本：`2026.08.alpha.1`。

这一批内容不是最终 Public MVP，而是用于验证：同一份双语、带来源、时间声明和传统归属的内容，能够被 compiler 转换为静态实体详情、索引和报告。

当前 source of truth 位于：

```text
content/common/sources.json
content/dao-ru-fo/profile.json
content/dao-ru-fo/traditions.json
content/dao-ru-fo/entities/
content/dao-ru-fo/relations.json
content/dao-ru-fo/audio.json
content/dao-ru-fo/reviews.json
```

当前 Alpha 批次已经达到冻结的最低内容配额：

- 80 个实体：9 位人物、6 部文本、6 个文本版本、12 个段落、6 个概念、6 个机构、9 个地点、15 个事件、2 条路线、9 个对象；
- 30 条结构化关系和 3 条音频脚本 metadata；
- locales：`zh-CN`、`en`；
- 状态：实体和关系为 `preview`，音频为 `not_recorded`，不能直接作为公开 production 内容；
- 目标：验证统一实体、文本—版本—passage 链接、关系 registry、媒体 rights、来源、时间和双语 read model。

编译命令：

```bash
npm run build:content
npm run verify:database-bundle
npm run verify:content
npm run verify:matrix
npm run verify:alpha-ready
```

Preview read models 位于 `.artifacts/content/v2/`，数据库导入包位于 `.artifacts/database/import-v1.json`。两者都不会进入当前 first-viewable prototype 的公开静态目录。数据库包当前包含 83 个 canonical entities（80 个内容实体 + 3 个顶级传统）、166 条翻译、18 个来源、30 条关系和 80 条时间断言。

compiler 还生成：

- `manifest/quality-report.json`：来源、权利、占位对象和 Public blocker；
- `manifest/review-queue.json`：每个实体、关系和音频所需的审核项；
- `manifest/routes.json`：可生成的实体详情路由；
- `manifest/checksums.json`：所有生成 JSON 的 bytes 与 SHA-256；
- `sources/{locale}/index.json`：双语来源索引；
- 现实地图、隋唐时间轴和三传统关系图 read models。

完成来源复核、关系补齐和内容门禁后，才允许把编译结果切换为正式 production artifact。

`npm run build:content:public` 使用同一 source of truth 生成 `.artifacts/content/public-v2/`，但只保留 `public + publishable` 的实体、关系和具备 `ready/published` 资产的音频。当前 Public artifact 为空是预期的发布边界。

实体目录支持单条对象文件和批次数组文件；两种形式都逐实体通过同一 Zod schema。Alpha 配额是最低门槛，超过目标不会失败，但矩阵中的 `current` 必须与 compiler 报告完全一致。

Public factual claim 至少需要一个 edition/item/precise 且 `citationStatus=verified` 的外部来源。`source:editorial-method` 只说明项目方法，不能代替事实证据。
