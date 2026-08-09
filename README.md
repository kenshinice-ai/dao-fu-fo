# 道·儒·佛文明数字博物馆

独立的 React + Vite 静态数字博物馆工程。第一版聚焦隋唐时期佛、道、儒三条主线，以展览、探索和研究三层体验呈现。

## 本地启动

```bash
npm install
npm run dev
```

## 验证

```bash
npm run check
```

内容管线分为两种可见性：

```bash
npm run build:content              # Alpha preview read model
npm run verify:content
npm run verify:matrix              # 数量与 compiler 报告一致
npm run verify:alpha-ready         # Lean Alpha 最低配额达标
npm run verify:migrations          # 001–012 authoring schema 契约
npm run verify:database-bundle     # 83 个 DB entities 与引用完整性
npm run db:import:plan             # 生成并核验 775 条事务导入语句
npm run verify:database:integration # 临时 PostGIS fresh/repeat 集成验证
npm run verify:architecture        # 静态 production 与 authoring 边界
npm run build:content:public       # 只输出 public + publishable 内容
npm run verify:content:public
npm run test:e2e                   # Playwright 流程、移动端与 axe WCAG
npm run check:release              # 完整 release gate
```

当前 Alpha source 仍是 preview，Public artifact 预期为空；公开站点继续使用已经验收的 first-viewable prototype 静态数据。

当前可测试检查点见 `docs/CHECKPOINT_2026-08-09.md`；完整进度、风险和后续优先级见 `docs/PROJECT_STATUS_AND_ROADMAP.md`。

## 构建

```bash
npm run build
```

产物位于 `apps/museum-web/dist/`，可直接部署至 Cloudflare Pages。

## 设计

设计系统见：

`design-system/dao-ru-fo-digital-museum/MASTER.md`

布局使用黄金分割作为层级工具：

- 61.8% / 38.2% 主次分区；
- 7/5 十二列网格；
- Fibonacci 间距；
- √φ 字体比例。
