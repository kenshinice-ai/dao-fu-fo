# Cloudflare production checkpoint｜完整 Alpha｜2026-08-10

> 内容模型快照仍有效；首页人物入口已在随后部署中扩展为 12 位，最新 deployment 见 [人物入口 checkpoint](./CHECKPOINT_PRODUCTION_FIGURE_GATEWAYS_2026-08-10.md)。
> 本文件保留为早一版完整 Alpha 快照；最新 production 关系闭环、计数和线上验收，以 [人物入口与关系闭环 checkpoint](./CHECKPOINT_PRODUCTION_FIGURE_GATEWAYS_2026-08-10.md) 和 [项目交接文档](./HANDOFF.md) 为准。

## 当前结论

production 已同步当前最新、最完整的 Alpha read model，并作为后续线上展示与复盘基准。它不是 Public RC 批准包：manifest 明确保留 `contentVersion=2026.08.alpha.1`、`releaseStage=alpha`、`visibility=preview`，Research 页面继续展示审核状态。

## 内容快照

- 实体：91；其中人物 12、地点 10、事件 17、机构 6、文本 7、文本版本 8、段落 14、路线 2；
- 关系：88；音频：3；来源：35；双语 entity artifact：182；
- 质量报告：207 public blockers、17 warnings；审核队列：182 subjects，其中 107 blocking；
- 搜索入口实际包含 12 位人物：成玄英、孔子、吉藏、孔颖达、老子、李世民、释迦牟尼、司马承祯、武曌、玄奘、颜师古、义净；
- 该节点首页曾保留 6 位人物 spotlight；随后已对齐完整 Alpha 的 12 位人物与道/儒/佛 3/4/5 统计；
- Public RC2 保留为独立审核基线：34 entities、41 relations、0 audio、25 sources、0 blockers。

## Cloudflare 地址

- Production branch：`main`；
- Default：[dao-ru-fo-digital-museum.pages.dev](https://dao-ru-fo-digital-museum.pages.dev)；
- Unique：[e4db38ec.dao-ru-fo-digital-museum.pages.dev](https://e4db38ec.dao-ru-fo-digital-museum.pages.dev)；
- Deployment ID：`e4db38ec-88da-48bf-8685-56f1d945c644`；
- Wrangler：`4.120.0`；
- 上传模式：`CF_PAGES_PRODUCTION_VISIBILITY=preview` + `DRF_WEB_DEPLOYMENT_MODE=full-alpha`；
- production 不连接数据库，Cloudflare 只接收本机门禁通过后的静态 dist。

## 验证记录

- `npm run check`：通过；
- Full Alpha Playwright + axe：44 passed / 1 skipped（45 tests）；
- Unique production HTTP smoke：23/23；
- Default production HTTP smoke：23/23；
- Unique 与 default JSON 断言均通过：manifest `alpha/preview`、91/88/3、207 blockers、17 warnings、182/107 review queue、12 位人物；
- 部署初始观察到的旧固定路径缓存已完成 revalidate，最终 default 域名与 unique deployment 数据一致。

## 后续 source-of-truth 纪律

- production 是线上运行时、用户复盘和回归测试的事实基准；
- `content/*.json`、compiler artifact 和审核记录仍是可追溯的编辑修改源，不直接在 Cloudflare 上编辑内容；
- 新人物、地点、空间、事件、关系和言论先以本 checkpoint 的完整 Alpha 规模为基线，再按独立 slice 增补和审核；
- 任何恢复 Public visibility 的动作，必须重新执行 Public RC candidate、review、promotion 和 production 验收；
- 本轮使用了已授权 dirty-worktree deploy，没有创建 Git commit，也没有 reset、checkout 或覆盖用户既有改动。
