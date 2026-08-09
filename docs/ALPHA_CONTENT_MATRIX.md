# Lean Alpha 内容矩阵

`content/dao-ru-fo/mvp-alpha-matrix.json` 是首个可公开评审版本的内容门槛。它把文档包中冻结的 Lean Alpha 配额、当前 source of truth 数量和下一批补齐任务放在同一个可检查文件里。

当前 source of truth 包含 80 个实体、30 条关系和 3 条音频 metadata，已达到全部 Lean Alpha 最低配额。展览现有 5 个 section，高于 4 个最低目标；保留既有冻结策展路线，不为追求整数而删除内容。

运行 `npm run verify:matrix` 会把矩阵中的实体、音频和关系当前值与编译报告对照；运行 `npm run verify:alpha-ready` 会确认所有当前值不低于目标。它们统一处于 `preview` 发布状态，因此可以用于原型体验和内部评审，但不能被当作 Lean Public 的正式学术发布。

下一阶段不再以增加数量为主，而是把主题级来源升级为卷页/馆藏级 locator，落实对象 provenance 与图像权利，完成音频资产，并通过 `public + publishable` 门禁。
