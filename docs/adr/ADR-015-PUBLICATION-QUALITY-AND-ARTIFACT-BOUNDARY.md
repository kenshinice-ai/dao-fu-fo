# ADR-015｜Publication Quality and Artifact Boundary

状态：Accepted for Alpha

## 背景

项目同时存在已经可看的静态原型、内部 Alpha 研究内容、未来 authoring database 和最终 Public release。如果仅依赖目录复制或人工判断，Preview 来源、未清权利对象和未完成审核的条目可能被误发布。

## 决策

1. compiler 是内容 source of truth 到 read model 与 database import bundle 的唯一受控转换边界；
2. Preview 与 Public 使用独立输出目录，Public 采用 fail-closed 过滤；
3. Public subject 必须满足 publication、review status、verified factual locator、rights 和显式 review checks；
4. 项目内部 editorial method 不能满足外部事实来源门禁；
5. compiler 输出 quality report、review queue、source index、route manifest 和 SHA-256 checksums；
6. Web production 只读取静态 `data/v2`，不得连接 PostgreSQL、导入 authoring JSON 或读取 `.artifacts`；
7. 当前 first-viewable prototype 和 Alpha contentVersion 保持不同，直到执行显式 promotion；
8. database import bundle 使用冻结 UUID namespace，且只能从 Preview source content 生成。

## 结果

- 当前 Public Alpha artifact 为空是正确行为；
- Preview 可以继续扩展而不会自动改变公开原型；
- 内容团队可从 blocker/review queue 工作，不靠散落清单；
- 未来切换 Web 数据源时必须走显式 release/promotion 工作流；
- `verify:architecture`、`verify:content` 和 `verify:static` 共同保护该边界。

## 未完成

- transaction importer 与真实 PostgreSQL/PostGIS fresh/repeat 测试；
- review check 的签名、审计日志和 curator UI；
- Alpha read model 到 Web Public data 的显式 promotion 工具；
- 发布候选的 E2E、a11y 与线上 smoke。
