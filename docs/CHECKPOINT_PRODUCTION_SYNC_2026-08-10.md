# Cloudflare production handoff｜最新完整内容同步｜2026-08-10

## 结论

当前工作区的最新完整 Alpha 内容已经同步到 Cloudflare Pages production。后续线上复盘、测试和内容回归以 production 为准；authoring JSON、compiler 和审核记录仍是可追溯的编辑源。

- Default：<https://dao-ru-fo-digital-museum.pages.dev>
- Unique：<https://198d43de.dao-ru-fo-digital-museum.pages.dev>
- Deployment ID：`198d43de-695b-4ec9-9707-8231f3f9df77`
- Branch：`main`
- Content：`2026.08.alpha.1 / alpha / preview`
- Wrangler：`4.120.0`

## 线上内容基线

- 91 个实体：12 人物、10 地点、17 事件；
- 90 条双语关系、38 个来源、3 条音频；
- 首页 12 张人物卡；道/儒/佛人物计数为 3/4/5；搜索索引包含 12 位人物；
- 质量报告：205 public blockers、17 warnings；审核队列：184 subjects、109 blocking；Research 页面保留这些状态；
- Public RC2 独立边界不变：34 entities、41 relations、0 audio、0 blocker。production 的 Alpha preview 不等于 Public promotion。

上一版同步已新增 5 个精确来源和 8 条 preview 关系；本次又新增 3 个精确来源和 2 条 preview 关系，覆盖：

- 李世民—唐朝建立、长安制度语境；
- 武曌—武周建立、洛阳两京制度语境；
- 义净—海路出发、归返河洛、那烂陀学习节点；
- 颜师古—《五经正义》校定与编纂协作。
- 成玄英—631–636 长安城市尺度活动、成疏传承见证；
- 吉藏—约 605–623 隋末唐初长安城市尺度寺院网络。

所有新增关系均保留时间、空间角色、历史性和“尚待进一步拆分”的边界说明，没有提升到 Public。

## 验收证据

- `npm run check`：通过；
- Full Alpha Playwright + axe：44 passed / 1 skipped（45 tests）；
- Unique production HTTP smoke：23/23；
- Default production HTTP smoke：23/23；
- Unique 与 default JSON read model 完全一致：manifest、91/90/38/3、首页 12、搜索人物 12、质量 205/17、审核 184/109、新增关系和三传统 3/4/5 均一致。

## 纪律性 handoff

- 本轮使用已授权 `ALLOW_DIRTY_DEPLOY=1` 部署；未创建 Git commit，未 reset、checkout 或覆盖用户既有 dirty-worktree 改动；
- 不在 Cloudflare 线上直接编辑内容；下一轮从 authoring JSON/compiler 开始，并把 production 作为回归基准；
- 下一阶段优先处理新增关系对应的 review checks 和精确地点/言论/后世影响证据，再决定 Public RC 是否扩大；在此之前不把首页人物数量或 Alpha 在线可见误认为 Public 审核完成。
