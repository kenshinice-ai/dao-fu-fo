# Alpha 内容管线第一批

状态：A1+A2 Full Alpha 已编译并同步 Cloudflare production；等待事实、来源、权利与可访问性复盘。内容版本：`2026.08.alpha.1`。

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

当前 Full Alpha 批次已经达到冻结的最低内容配额，并完成 A1+A2 扩展：

- 140 个实体：26 位人物、16 部文本、8 个文本版本、14 个段落、6 个概念、6 个机构、21 个地点、31 个事件、3 条路线、9 个对象；其中 A1 新增 8 位可审计人物，A2 新增 6 位神话/神圣人物；
- 159 条结构化关系和 3 条音频脚本 metadata；
- locales：`zh-CN`、`en`；
- 状态：实体和关系为 `preview`，音频为 `not_recorded`；本轮按明确授权同步到 production 的 Full Alpha 线上复盘，但不等同于 Public RC 或正式学术发布；
- 目标：验证人物—时间—空间—事件—文本—关系—接受史闭环、历史地图与 symbolic cosmos 分层、统一实体、文本—版本—passage 链接、关系 registry、媒体 rights、来源和双语 read model。

编译命令：

```bash
npm run build:content
npm run sync:preview-read-models
npm run verify:generated
npm run verify:database-bundle
npm run verify:content
npm run verify:matrix
npm run verify:alpha-ready
```

Preview compiler read models 位于本机临时 staging（路径由仓库绝对路径哈希确定），数据库导入包位于 `.artifacts/database/import-v1.json`。`sync:preview-read-models` 会把 compiler 的 entities、relations、sources、quality/review manifests、search、现实地图、sacred cosmos、时间轴、关系图、source-of-truth 驱动的 comparisons 和 text-readings 完整准备到同一临时 Web public staging，再由 Vite 读取；`verify:preview-context` 逐文件比对 compiler 与 Web staging。这样 iCloud 不会参与生成产物写入。普通 prototype 仍保持基底边界；只有明确设置 `CF_PAGES_PRODUCTION_VISIBILITY=preview` 的 production-only Full Alpha 批次才叠加完整 Alpha profile、manifest、audio 与 read models。数据库包当前包含 143 个 canonical entities（140 个内容实体 + 3 个顶级传统）、286 条翻译、54 个来源、159 条关系、140 条时间断言和 391 条 review records；Public RC 的审核记录不会被 Full Alpha 误写成 Public 批准。

compiler 还生成：

- `manifest/quality-report.json`：来源、权利、占位对象和 Public blocker；
- `manifest/review-queue.json`：每个实体、关系和音频所需的审核项；
- `manifest/routes.json`：可生成的实体详情路由；
- `manifest/checksums.json`：所有生成 JSON 的 bytes 与 SHA-256；
- `sources/{locale}/index.json`：双语来源索引；
- 现实地图、全历史 overview 时间轴、三传统关系图和 symbolic cosmos read models；现实地图与 symbolic cosmos 使用互斥空间语义，神话人物不生成伪经纬度。
- 比较 read models：当前 `cross-era-figures` 以老子、孔子、释迦牟尼验证九个比较轴，并输出显式未记录状态、直接关系和共享桥接节点。
- 文本对读 read models：当前 `three-traditions-passage-reading` 以《道德经》《论语》《转法轮经》各一段验证 text→text version→passage 依赖、七个阅读轴、归属关系和来源闭环；它是跨文本并置，不冒充同一文本异文校勘。

完成来源复核、关系补齐和内容门禁后，才允许把编译结果切换为正式 Public artifact；Full Alpha production 可以在明确授权下用于线上研究复盘，但必须保留 `alpha / preview` 标记。

`npm run build:content:public` 使用同一 source of truth 生成本机临时 Public artifact，但只保留 `public + publishable` 的实体、关系和具备 `ready/published` 资产的音频。当前 Public RC2 artifact 为 34 entities / 41 relations / 0 audio / 0 blocker；它与 Full Alpha production 保持独立。

实体目录支持单条对象文件和批次数组文件；两种形式都逐实体通过同一 Zod schema。Alpha 配额是最低门槛，超过目标不会失败，但矩阵中的 `current` 必须与 compiler 报告完全一致。

Public factual claim 至少需要一个 edition/item/precise 且 `citationStatus=verified` 的外部来源。`source:editorial-method` 只说明项目方法，不能代替事实证据。

## 构建卫生与可复现性

- compiler 每次写入前会清空目标 artifact 目录，避免 iCloud 或旧版本生成的重复文件混入新版本。
- `npm test` 会先构建 workspace packages，直接运行测试不会依赖过期的 `dist`。
- `npm run verify:generated` 会扫描 compiler artifact 和 Web Preview read models，发现 iCloud 冲突副本或带数字后缀的重复文件就失败。
- `npm run check` 先编译并同步 Preview，再执行 architecture boundary 检查，避免用旧的部署目录判断当前架构。
- 已有的冲突副本可用 `node scripts/quarantine-generated-conflicts.mjs --apply` 移入被忽略的 `.artifacts/quarantine/icloud-conflicts/`；脚本会保存原路径、字节数和 SHA-256，不删除源数据。
