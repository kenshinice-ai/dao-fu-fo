# Public RC 1｜最终审核与 Preview 复盘

> 审核日期：2026-08-09（Australia/Melbourne）
> 审核身份：`codex:authorized-rc-reviewer`
> 结论：冻结范围内的 Public RC 已完成审核并 promotion；当前只发布到 Cloudflare Pages Preview，production 未发布。

## 结论摘要

- 候选范围保持冻结：27 个 subject（10 个核心实体、3 个 text version 结构依赖、14 条关系），没有借审核机会扩大人物、文本、地点或关系范围。
- `content/dao-ru-fo/reviews.json` 为 144/144 `passed`：27 条 `automated:content-compiler` schema 记录，117 条 `codex:authorized-rc-reviewer` 的 fact / bilingual / rights / editorial / tradition / accessibility 正式记录。
- `content/dao-ru-fo/public-rc.json` 已从 `in_review` 推进为 `promoted`；promotion ID 为 `promotion:alpha-public-rc-1-20260809131146`。
- Public compiler artifact 为 13 entities、14 relations、0 audio、26 个双语 locale artifacts、0 public blockers；`npm run verify:content:public`、`npm run verify:public-rc` 和 `npm run verify:public-rc:ready` 均通过。

## 审核边界

本轮通过的是当前页面与当前静态 artifact 的发布边界，不是对未纳入范围内容的泛化背书：

- 三个 text version 作为 passage 的结构依赖和 received-text 记录发布，不宣称已经是 critical edition；
- 仅发布短摘录、馆方结构化字段、source metadata、locator 和外部链接，不镜像 Ctext、Cambridge 或地方志 PDF 的整页内容；
- 人物、地点、原典文字和关系分别回到对应来源与定位；比较关系保持为 bounded curatorial comparison，不暗示共同作者、直接影响或同一宗教功能；
- 真实地图只显示有现实地理指向的地点；神圣/象征空间不生成伪经纬度。

## 自动化与线上证据

- `npm run check`：通过；包含 typecheck、17 个 unit tests、compiler、数据库 bundle、架构、质量、Public artifact 和 static build 门禁。
- 完整本地浏览器回归：44 个测试中 43 passed、1 skipped（Public-only 测试在默认 Preview visibility 下跳过）；包含新增 RC 路由和 axe WCAG 2A/AA 检查。
- Public-only 本地 smoke：1/1 passed，覆盖旧 Preview comparison/text-reading URL 的 Public RC fallback 和 Public 地图加载。
- Cloudflare HTTP smoke：23/23 passed。
- 在线浏览器复盘（刷新后使用当前 fingerprinted bundle）：首页、长安展览、玄奘人物条目、人物比较 3 cards、原典阅读 3 cards 均正常；地图无 alert，缩放到 125%、拖动平移会改变 camera transform，地点节点与地图控制可见。

## 本轮修复的线上问题

首次在线浏览器复盘发现 Public 地图会把未公开的 route entity 请求解析为 SPA HTML，进而显示 JSON parse error。修复内容为：

1. static entity request 校验 JSON content type，不把 SPA fallback HTML 当实体 JSON；
2. Public 地图把路线实体作为可选装饰层，缺少路线实体时仍加载地图主数据和缩放/平移/地点节点；
3. 增加 Public-only 地图回归断言；修复后重新部署并通过线上 smoke。

Public RC 当前只发布已审核的三位人物、三部文本、三段 passage、长安和三个 text version 依赖，因此 Public 地图不显示 Preview-only route corridor；这属于范围隔离，不是地图主功能失败。

## Cloudflare Preview 记录

- Project：`dao-ru-fo-digital-museum`
- Branch：`public-rc`
- Alias：[https://public-rc.dao-ru-fo-digital-museum.pages.dev](https://public-rc.dao-ru-fo-digital-museum.pages.dev)
- Unique deployment：[https://57cc78db.dao-ru-fo-digital-museum.pages.dev](https://57cc78db.dao-ru-fo-digital-museum.pages.dev)
- Deployment ID：`57cc78db-1970-485d-808b-33f915a9dfc7`
- Git source：`cc734cab18f201a1f17f1783e04f66c2748502d8`；Wrangler：`4.120.0`
- Public source checksum：`f1d5513d2d6dba91ef6376afb415868bfca3bb5868475ca2e59c6ede3e2059aa`
- Public artifact checksum：`c5004cdd7548520ec08868188f3d258e07a8de1f942eb27ac683825bb26da452`
- Production：未触碰。

## 暂停点与下一步

现在适合停在“Public RC Preview 可复盘节点”，不继续扩大内容范围。下一轮只有在用户确认后再进入：

1. 先复盘当前 Preview：首页 → Explore 地图 → 玄奘 → passage → text reading；重点看地图操作、人物/空间/时间组合以及来源/不确定性呈现；
2. 收集复盘反馈并只修复阻断性问题；
3. 再单独立项下一内容 slice，优先讨论人物—事件—空间—言论—历史地位—后世影响的增量，而不是直接把整个 Preview Alpha 扩为 Public；
4. 任何新增 subject 都必须建立新的审核范围、source locator、review records 和 promotion 记录；production release 另行执行。
