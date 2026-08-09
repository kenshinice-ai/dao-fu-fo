# ADR-013｜Alpha 内容 Compiler 基线

状态：Accepted for Alpha / Public MVP 前需复审

## 决策

首批内容以 JSON source files 保存于 `content/`，使用 `@drf-museum/domain-schema` 的 Zod schema 校验，再由 `@drf-museum/content-compiler` 生成双语 entity、relation、audio artifacts、搜索索引、manifest 和 content report。

Alpha 编译产物写入 `.artifacts/content/v2/`，不直接进入当前 first-viewable prototype 的 `public/` 目录。只有通过来源、关系、版权和 `publishable` 门禁后，才允许切换到 production static artifacts。

Compiler 支持 `preview` 和 `public` visibility。Public 输出只包含 `publicationState=public` 且 `reviewStatus=publishable` 的内容；音频还必须有 `ready` 或 `published` asset status。

实体 canonical ID 使用 UUID v5：

```text
UUIDv5(0f8f2f0c-4f55-5e8e-8a4b-4c52f8d7b4b2, "{kind}:{slug}")
```

## 原因

- 内容 source 与前端 read model 分离；
- 双语、来源、时间和审核可以在构建阶段失败；
- 重复编译时实体 ID 稳定；
- Alpha preview 不会意外进入公开静态站；
- 后续可以在不改 Web contract 的情况下增加 YAML/MDX parser、数据库 importer 和正式 publication filter。

## 后续复审

30 条 relation registry 与 Lean Alpha 数量门槛已经达成。在第一次 migration 和 Public MVP 前，仍必须确认 UUID namespace 是否作为正式 P0 冻结值，并补齐真实 media rights、馆藏 provenance、卷页级 source locator 和 Web production read-model 接入门禁。
