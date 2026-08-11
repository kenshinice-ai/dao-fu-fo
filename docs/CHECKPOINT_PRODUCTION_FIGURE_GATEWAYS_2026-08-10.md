# Cloudflare production checkpoint｜人物入口与关系闭环｜2026-08-10

## 当前结论

production 的首页人物入口与最新完整 Alpha read model 已对齐。传统入口明确展示道/儒/佛三条主线的 3/4/5 位人物，并在首页提供 12 张人物卡片；本轮继续把成玄英、吉藏的 2 条人物—空间—时间 preview 关系同步到 production。

## 人物与三轴边界

- 道：成玄英、老子、司马承祯，共 3 位；
- 儒：孔子、孔颖达、李世民、颜师古，共 4 位；
- 佛：吉藏、释迦牟尼、武曌、玄奘、义净，共 5 位；
- 时间字段沿用 Alpha entity read model；
- 对尚未核到精确地点的条目，入口卡明确写“空间待核 / 节点待核”，没有用推测填充地点；
- 12 位人物仍全部处于 Alpha 研究范围，Public RC2 的已审核公共边界不因首页扩展而改变。

## Cloudflare 地址

- Default：[dao-ru-fo-digital-museum.pages.dev](https://dao-ru-fo-digital-museum.pages.dev)；
- Unique：[198d43de.dao-ru-fo-digital-museum.pages.dev](https://198d43de.dao-ru-fo-digital-museum.pages.dev)；
- Deployment ID：`198d43de-695b-4ec9-9707-8231f3f9df77`；
- Branch：`main`；Wrangler：`4.120.0`；
- Runtime manifest：`2026.08.alpha.1 / alpha / preview`；
- Alpha read model：91 entities、90 relations、3 audio、38 sources；质量报告 205 blockers / 17 warnings；审核队列 184 subjects / 109 blocking。

## 验证记录

- `npm run check`：通过；
- Full Alpha Playwright + axe：44 passed / 1 skipped（45 tests）；
- Unique production HTTP smoke：23/23；
- Default production HTTP smoke：23/23；
- Unique 与 default JSON 断言均通过：12 位搜索人物、12 张首页人物卡、传统入口 3/4/5、文本 2/2/3、段落 4/4/6、关系 90、来源 38；
- default 域名在 Cloudflare 边缘 revalidate 后与 unique deployment 完全一致。

## 后续基准

以后新增人物、地点、事件、空间、关系和言论，先以 production 当前的 12 人物 / 10 地点 / 17 事件 / 88 关系为回归基准，再按独立内容 slice 增补；不把“进入首页”视为 Public 审核通过。
