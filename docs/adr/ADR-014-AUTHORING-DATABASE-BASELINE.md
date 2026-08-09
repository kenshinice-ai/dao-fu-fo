# ADR-014｜Authoring Database Baseline

状态：Accepted for Alpha / transaction importer 前复审

## 决策

采用 001–010 baseline 与后续 forward-only migration 建立 PostgreSQL/PostGIS authoring schema；011 将来源 locator/citation 质量字段写入数据库契约。数据库只服务内容导入、完整性验证、preview/staging、QA 和静态构建；Cloudflare Pages production 不建立数据库连接。

内容实体 UUID 继续由 compiler 使用冻结 namespace 和 `{kind}:{slug}` 确定性生成。数据库不随机生成 canonical entity ID。source 和 relation 的当前字符串 key 通过 `canonical_key` 保留导入映射，数据库 UUID 由 importer 负责稳定生成。

真实地理使用 SRID 4326 PostGIS geometry。`sacred_symbolic` 地点必须没有 `geom`，并必须提供 cosmos zone 与 canvas 坐标；它们不能进入现实距离或路线计算。

## 门禁

- 每个 migration 必须以事务包裹；
- 已发布 migration 不修改，新增变更只增加后续序号；
- baseline 禁止 `DROP` 与 `TRUNCATE`；
- `npm run verify:migrations` 检查顺序和关键契约；
- 配置测试数据库后，CI 必须增加 fresh/repeat migrate、fresh/repeat import、ID 稳定与 read-model checksum 测试。

## 未完成

compiler 已生成并验证确定性 `import-v1.json` 契约，relation/temporal registry seed 也已补齐；尚未实现把该 bundle 写入 PostgreSQL 的 transaction importer，也未在真实 PostgreSQL/PostGIS 服务上执行 migration。首次导入前仍应补齐 figure/event/concept/institution 等专用 profile，复核 source locator 粒度和 UUID namespace 冻结状态。
