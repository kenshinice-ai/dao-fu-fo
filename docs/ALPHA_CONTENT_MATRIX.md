# Lean Alpha 内容矩阵

`content/dao-ru-fo/mvp-alpha-matrix.json` 是首个可公开评审版本的内容门槛。它把文档包中冻结的 Lean Alpha 配额、当前 source of truth 数量和下一批补齐任务放在同一个可检查文件里。

当前 Full Alpha source of truth 包含 140 个内容实体、159 条关系和 3 条音频 metadata，已达到全部 Lean Alpha 最低配额。分类为人物 26、文本 16、文本版本 8、passage 14、概念 6、机构 6、地点 21、事件 31、路线 3、对象 9；展览现有 5 个 section，高于 4 个最低目标；保留既有策展路线，并把 A1 历史网络与 A2 symbolic cosmos 作为同一全历史 read model 的两条空间轨道。

运行 `npm run verify:matrix` 会把矩阵中的实体、音频和关系当前值与编译报告对照；运行 `npm run verify:alpha-ready` 会确认所有当前值不低于目标。A1/A2 新增内容统一处于 `preview` 发布状态，因此已同步到 Cloudflare production 的 Full Alpha 线上复盘，但不能被当作 Lean Public 或 Public RC 的正式学术发布。

下一阶段不再以增加数量为主，而是把主题级来源升级为卷页/馆藏级 locator，落实对象 provenance 与图像权利，完成音频资产，并通过 `public + publishable` 门禁。
