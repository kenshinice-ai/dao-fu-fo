# Public RC 工作流

当前完整 Alpha 已按明确授权同步到 production 供线上研究复盘，但它仍保持 `visibility=preview`，不会因为进入 production 就自动成为 Public。`content/dao-ru-fo/public-rc.json` 是当前 Public RC2 的显式选择清单；Public RC 仍走独立的 fail-closed promotion 流程，未来 production 若要恢复 Public visibility，必须重新完成对应 RC 审核。

## 候选范围

`release:alpha-public-rc-2` 当前包含：

- 12 个核心实体：三位跨时代人物、两项事件、四个地点、一个制度空间和一条路线；
- 14 个结构依赖：地点、制度空间、文本、text version 和 passage 依赖；
- 30 条关系：人物—事件—地点、制度空间、路线、文本—版本、passage、归属和后世接收关系；
- 0 条音频。

编译器会拒绝以下情况：

- passage 缺少对应 text 或 text version；
- institution/route 的地点依赖未纳入集合；
- 关系两端不在集合中；
- 选中集合内部存在未选择且未明确排除的关系；
- core selection 没有覆盖道、儒、佛三条主线。

## 日常检查

```bash
npm run build:content
npm run verify:public-rc
cat .artifacts/content/public-rc-plan.json
```

`verify:public-rc` 会输出当前 blocker 和 warning；在 `planning` 或 `in_review` 状态下允许命令通过，方便内容团队逐项清理。真正的 ready 门禁是：

```bash
npm run verify:public-rc:ready
```

它要求候选状态为 `ready`，并且没有未完成审核、未验证来源、权利阻塞、占位对象或关系闭包问题。

RC2 审核闭环已落地：12 个核心实体、14 个 text/space 等结构依赖和 30 条关系，共 56 个 candidate subjects；`reviews.json` 当前 391 条记录，RC2 选择范围 required checks 已通过，并已记录 1 条 promotion。更大 Alpha Preview 的 pending review 仍不等于 Public 批准。

## 晋级流程

1. 内容编辑补来源定位和审核记录；
2. 将候选状态从 `planning` 推进到 `in_review`，再由负责人改为 `ready`；
3. 运行 `npm run verify:public-rc:ready`；
4. 在干净 Git 工作树中执行：

```bash
npm run content:promote -- --apply --promoted-by=<reviewer>
```

工具会在一次受控流程中：

- 将候选 subject 设置为 `public + publishable`；
- 在 iCloud 之外的本机临时目录构建并验证 Public artifact；
- 记录 source checksum 与 artifact checksum；
- 将候选状态写为 `promoted`；
- 重新生成 Preview database bundle，使 `content_promotions` 可被导入 authoring database。

任何一步失败都会恢复本次工具改动。工具默认要求 Git 工作树干净；仅在测试 fixture 中才使用 `ALLOW_DIRTY_PROMOTION=1`。

## 数据库留痕

Migration 013 新增：

- `museum.release_candidates`：候选身份、范围摘要、状态和选择 checksum；
- `museum.release_candidate_subjects`：核心、依赖和 supporting subject；
- `museum.content_promotions`：晋级人、时间、source/artifact checksum 与目标 visibility。

数据库 bundle 同步携带 release candidate、56 个 subject 和 promotion records。当前 promotion record 数量为 1；默认生产发布必须使用 `CF_PAGES_PRODUCTION_VISIBILITY=public`，避免误把 Alpha Preview artifact 上传到 `main`。本轮 Full Alpha 同步是有明确授权的例外模式：`CF_PAGES_PRODUCTION_VISIBILITY=preview`，并在页面 manifest 中保留 Alpha/Preview 身份与审核阻塞。
