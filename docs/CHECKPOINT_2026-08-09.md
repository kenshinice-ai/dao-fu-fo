# 可测试检查点｜2026-08-09

> 检查点名称：`alpha-engineering-baseline`
> 用途：产品体验测试、内容复盘和下一阶段排期；不是 Public 内容发布候选。

## 1. 现在可以测试什么

- 中英文首页、Museum、首个五章节展览、Explore 四种视图、Research、搜索和实体详情；
- Explore 的视图、传统筛选、阅读模式与时间范围可写入 URL，适合分享和复现；
- 390px 移动端底部导航、键盘焦点、减弱动画和核心页面无障碍；
- Preview 内容管线：80 个内容实体、30 条关系、3 条音频脚本和 18 个来源；
- authoring database：12 个迁移、83 个 canonical entities 和可重复的事务导入。

后续工程分支已增加 Public RC foundation，但不会修改本检查点；可复盘的下一检查点会单独记录 013 migration、RC selection 和 promotion audit。

## 2. 最短启动方式

```bash
cd /path/to/digital-museum
npm install
npm run dev
```

浏览器打开终端显示的本地 URL。建议按以下顺序复盘：

1. 首页：品牌、三传统入口和中英文切换是否自然；
2. Museum → 《长安：三教相遇的世界之都》：五章节叙事是否成立；
3. Explore：依次切换真实地图、神圣空间、时间和关系图，复制 URL 后重新打开；
4. Search：搜索 `Xuanzang` 或 `玄奘`，进入人物详情并检查来源区；
5. Research：检查证据等级、版本链和当前发布边界是否容易理解；
6. 将窗口缩至约 390px，检查底部导航、长标题和图谱侧栏。

## 3. 自动化复验

```bash
npm run check
npm run test:e2e
npm run verify:database:integration
```

一次执行全部 release gate：

```bash
npm run check:release
```

2026-08-09 本地结果：

- `npm run check`：通过；8 个单元测试、内容/架构/构建门禁全部通过；
- `npm run test:e2e`：19/19 通过，含 14 条核心路由的 axe WCAG A/AA 扫描；
- database integration：fresh/repeat 均通过，数据库指纹为 `ea9a339e0c1159582504ce9a13f65eca`。

## 4. 复盘时重点记录

- 产品：Museum / Explore / Research 三层是否清楚，首展是否有连续叙事；
- 交互：语言、搜索、筛选、返回路径和移动端是否有中断；
- 内容：哪些实体应进入第一批 8–12 个 Public RC，哪些需要删减或改写；
- 证据：来源定位、馆藏编号、权利、审核和双语是否足以公开；
- 视觉：地图、神圣空间、时间轴与关系图是否应继续保持当前抽象程度。

## 5. 明确未完成

- 当前部署数据仍是已验收的 `2026.08.prototype.1`，Alpha Preview 尚未接入 Web；
- Public Alpha artifact 有意保持为空；当前有 314 个发布 blocker 和 113 个 blocking review subject；
- 9 个 museum object 仍是待落实馆藏、编号、provenance 与图像权利的占位记录；
- 3 条音频只有脚本，尚未录制、转录和完成权利/无障碍审核；
- 审核记录当前为 0；还未形成第一批 8–12 个可公开实体；
- 尚未部署 Cloudflare Pages preview，也没有线上 HTTP/browser smoke 证据。

因此，本检查点适合“测试和复盘”，不应将 Preview 内容批量切换为 Public，也不应直接发布 production。
