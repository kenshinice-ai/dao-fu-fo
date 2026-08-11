# Cloudflare Preview / Production checkpoint｜2026-08-10（历史 Public RC2 节点）

## 当前结论

Public RC2 已完成审核、promotion、Preview 复盘和当时的 production 发布。随后 production 已被显式覆盖为完整 Alpha；当前状态见新的 Full Alpha checkpoint。

## 内容与首页变化

- RC：`release:alpha-public-rc-2`，状态 `promoted`；
- Public artifact：34 entities、41 relations、0 audio、25 sources、0 public blockers；
- RC2 人物入口：老子、孔子、释迦牟尼、玄奘、司马承祯、孔颖达；首页传统入口显示道/儒/佛各 2 位人物；新增六位人物 spotlight，卡片保留人物、时间和地点入口；
- 跨时代人物比较：老子、孔子、释迦牟尼；三传统 passage reading 和关系图仍保持 Public RC2 的闭包；
- production 质量 JSON：`visibility=public`、`publicBlockers=[]`、34 entities、41 relations、0 audio；

## Cloudflare 地址

- Public RC Preview branch：`public-rc`
  - Stable alias：[public-rc.dao-ru-fo-digital-museum.pages.dev](https://public-rc.dao-ru-fo-digital-museum.pages.dev)
  - Unique：[2af05e15.dao-ru-fo-digital-museum.pages.dev](https://2af05e15.dao-ru-fo-digital-museum.pages.dev)
  - Deployment ID：`2af05e15-c4aa-4b36-8eb2-b5900635295a`
- Production branch：`main`
  - Default：[dao-ru-fo-digital-museum.pages.dev](https://dao-ru-fo-digital-museum.pages.dev)
  - Unique：[29aac795.dao-ru-fo-digital-museum.pages.dev](https://29aac795.dao-ru-fo-digital-museum.pages.dev)
  - Deployment ID：`29aac795-a3e6-46c1-8dc9-3d0660e7ac37`
- Production visibility：`public`；production 未连接数据库；

## 验证记录

- `npm run check`：通过；
- unit：17/17；
- Preview Playwright + axe：44 passed / 1 skipped；
- Public RC2 专用 Playwright smoke：1/1；
- Preview HTTP smoke：23/23；
- Production HTTP smoke：23/23（unique 与 default 均复验）；
- Production JSON：6 位人物搜索入口、6 位首页 spotlight、2/2/2 传统人物计数、三人物比较、0 public blockers 均复验；

## 发布注意

本次工作树包含用户既有未提交改动，因此 promotion/deploy 使用了已授权的 dirty-worktree 例外；没有执行 reset、checkout 或覆盖用户改动，也没有创建 Git commit。production 发布脚本已修正为强制 `CF_PAGES_CONTENT_VISIBILITY=public`，避免未来误把 Preview artifact 上传到 main。
