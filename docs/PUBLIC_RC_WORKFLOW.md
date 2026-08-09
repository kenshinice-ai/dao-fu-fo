# Public RC 工作流

当前内容仍是 Alpha Preview。`content/dao-ru-fo/public-rc.json` 是第一批 Public RC 的显式选择清单，不会因为条目被加入清单就自动公开。

## 候选范围

`release:alpha-public-rc-1` 当前包含：

- 10 个核心实体：三位人物、三部文本、三段 passage 和长安；
- 3 个结构依赖：三个 text version；
- 14 条关系：人物—地点、passage—文本、文本—版本和文本比较关系；
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

`verify:public-rc` 会输出当前 blocker 和 warning，但在 planning 状态下允许命令通过，方便内容团队逐项清理。真正的 ready 门禁是：

```bash
npm run verify:public-rc:ready
```

它要求候选状态为 `ready`，并且没有未完成审核、未验证来源、权利阻塞、占位对象或关系闭包问题。

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
- 构建并验证 `.artifacts/content/public-v2`；
- 记录 source checksum 与 artifact checksum；
- 将候选状态写为 `promoted`；
- 重新生成 Preview database bundle，使 `content_promotions` 可被导入 authoring database。

任何一步失败都会恢复本次工具改动。工具默认要求 Git 工作树干净；仅在测试 fixture 中才使用 `ALLOW_DIRTY_PROMOTION=1`。

## 数据库留痕

Migration 013 新增：

- `museum.release_candidates`：候选身份、范围摘要、状态和选择 checksum；
- `museum.release_candidate_subjects`：核心、依赖和 supporting subject；
- `museum.content_promotions`：晋级人、时间、source/artifact checksum 与目标 visibility。

数据库 bundle 同步携带 release candidate、27 个 subject 和 promotion records。当前 promotion record 数量为 0，这是预期的 fail-closed 状态。
