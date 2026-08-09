# Alpha 发布门禁

当前项目同时保留两种输出：

- `preview`：`.artifacts/content/v2`，用于内部评审、原型和内容编辑；允许 `preview` 状态，但必须有双语、来源、时间声明和稳定 ID。
- `public`：`.artifacts/content/public-v2`，只接受 `public + publishable` 的实体和关系；音频还必须有 `ready` 或 `published` asset status。

常用检查：

```sh
npm run build:content
npm run verify:content
npm run verify:matrix
npm run verify:alpha-ready
npm run build:content:public
npm run verify:content:public
npm run verify:database-bundle
npm run db:import:plan
npm run verify:public-rc
npm run test:e2e
npm run verify:database:integration
npm run verify:architecture
npm run check
npm run check:release
```

`npm run verify:public-rc:ready` 和 `npm run content:promote -- --apply --promoted-by=<reviewer>` 只在内容审核完成后执行，不属于当前 Alpha 的默认绿色门禁。

Lean Alpha 数量门槛已经达成。Public artifact 仍预期为空，因为内容处于 `preview`，对象馆藏与图像权利尚未落实，音频尚未录制，主题级来源 locator 仍待深化。这是安全边界，不是内容缺失被静默忽略。

Public subject 的必要条件：

1. `publicationState=public`；
2. `reviewStatus=publishable`；
3. 至少一个已验证的 edition/item/precise 外部事实来源；
4. 不存在 unknown/restricted rights blocker；
5. 所需 schema、fact、tradition、bilingual、rights、accessibility、editorial check 全部为 passed 或 waived；
6. 关系两端都在 Public 集合；音频 asset 为 ready/published。

当前 quality report 有 314 个 blocker，review queue 有 113 个 blocking subject。Public 编译结果仍是 0 entities / 0 sources / 0 relations / 0 audio，并通过 checksum 和内容验证。
