# Public RC Foundation 检查点｜2026-08-09

> 分支：`work/public-rc-foundation`
> 用途：继续开发第一批 Public RC；稳定可测试基线仍为 `alpha-engineering-baseline`。

## 本检查点新增

- `content/dao-ru-fo/public-rc.json`：10 个核心实体、3 个 text-version 依赖和 14 条结构/语义关系；
- compiler 的 structural dependency、relation closure、三传统覆盖和 Public 子集边界校验；
- `verify:public-rc` blocker report，当前为 53 blockers、27 warnings；
- dry-run / fail-closed 的 `content:promote` 工作流；
- migration 013：release candidates、candidate subjects、content promotions；
- database bundle/import/state verifier 对候选和 promotion checksum 的支持；
- Explore URL 连续快速更新的竞态修复。

## 当前证据

```text
npm run check                         PASS
npm run test:e2e                     PASS (19/19)
npm run verify:database:integration  PASS (13 migrations; fingerprint 52cbaae271faf9f3f4978eb4f6fa6dd7)
npm run verify:public-rc              PASS (planning report; 53 blockers)
npm run verify:public-rc:ready        EXPECTED FAIL (fail-closed; 53 blockers)
```

数据库 bundle 当前为 83 entities、18 sources、30 relations、80 temporal assertions、1 release candidate、27 candidate subjects 和 0 promotion records；导入计划为 803 条语句。

## 下一步

1. 为候选的 10 个核心实体和 14 条关系补 verified edition/item/precise locator；
2. 逐项写入 fact、tradition、bilingual、rights、editorial review checks；
3. 候选状态改为 `ready` 后运行 `npm run verify:public-rc:ready`；
4. 通过 `npm run content:promote -- --apply --promoted-by=<reviewer>` 生成第一个 Public artifact；
5. 再接入 Web preview，并执行 Cloudflare Pages preview smoke。
