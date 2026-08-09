# 道·儒·佛文明数字博物馆｜Cloudflare Pages 上线手册

> 状态：Cloudflare Pages Preview 已部署；production 尚未执行
> 核对日期：2026-08-09
> 适用工程：`digital-museum` 第一版可看静态原型

## 1. 发布决策

### 1.1 项目命名

推荐并冻结：

```text
Cloudflare Pages project: dao-ru-fo-digital-museum
Production branch: main
Expected default URL: https://dao-ru-fo-digital-museum.pages.dev
```

该名称与工程包名、`dao-ru-fo` profile 和“道 → 儒 → 佛”的策展顺序一致。若名称已被占用，Cloudflare 可能为默认域名附加随机字符；此时仍保留 Pages 项目名，并以控制台返回的实际 URL 为准。

### 1.2 第一版发布方式

第一版采用 **Cloudflare Pages Direct Upload + Wrangler**：

- 构建在本机/受控 CI 完成；
- 只上传预先验证的 `apps/museum-web/dist/`；
- 先发 preview，完成线上 smoke 和浏览器验收后再发 production；
- 不在 Cloudflare 端重复生成内容包；
- 第一版不需要 Pages Functions、KV、D1 或运行时 API。

重要：Cloudflare 当前规定，Direct Upload 项目不能原地切换为 Git integration。若未来必须改成 Git 自动部署，需要创建新的 Git-integrated Pages 项目并迁移域名。第一版选择 Direct Upload，意味着正式项目继续以可审计的手动/CI 上传为发布模型。

## 2. 当前工程检查结果

### 2.1 构建与脚本

根目录现有命令：

```text
npm run dev
npm run build
npm run typecheck
npm run test
npm run verify:migrations
npm run verify:architecture
npm run build:content
npm run verify:database-bundle
npm run verify:content
npm run build:content:public
npm run verify:content:public
npm run verify:static
npm run check
```

发布门禁使用：

```bash
npm run check
```

它依次执行 typecheck、tests、migration 与 architecture contract、Preview/Public compiler、数据库 bundle、内容质量与配额、Vite production build 和静态产物验证。Vite 输出目录为：

```text
apps/museum-web/dist/
```

### 2.2 静态发布资产

2026-08-09 检查到：

- `dist/` 已存在；
- 当前 Preview 构建共 35 个文件，总体积约 544 KiB；该数字会随 hashed bundle 改变，应以 preflight 实测为准；
- 没有单文件超过 Cloudflare Pages 的 25 MiB 上限；
- 文件数远低于 Free plan 的 20,000 文件上限；
- hashed JS/CSS 位于 `dist/assets/`；
- production Vite 配置 `sourcemap: false`，`verify:static` 会拒绝任何 `.map` 文件；
- 静态内容已按 `data/v2/` 拆包，而不是单个大 JSON。

注意：此处 `data/v2` 是已验收的 `2026.08.prototype.1`。Alpha Preview/Public compiler 输出位于 `.artifacts`，不会被 Vite 自动复制进 deployment。

当前主要数据目录：

```text
data/v2/manifest/
data/v2/profile/
data/v2/overview/
data/v2/exhibitions/
data/v2/entities/
data/v2/maps/
data/v2/timeline/
data/v2/graphs/
data/v2/search/
```

### 2.3 SPA 路由与响应头

源文件位于：

```text
apps/museum-web/public/_redirects
apps/museum-web/public/_headers
```

Vite 构建已将它们复制到：

```text
apps/museum-web/dist/_redirects
apps/museum-web/dist/_headers
```

`_redirects` 当前提供 React Router deep-link fallback：

```text
/* /index.html 200
```

`_headers` 当前提供：

- CSP；
- `X-Content-Type-Options`；
- `Referrer-Policy`；
- `Permissions-Policy`；
- hashed assets 一年 immutable browser cache；
- `data/v2` 一小时 browser cache，并允许 stale-while-revalidate。

Cloudflare 会从最终静态资产目录读取 `_headers` 和 `_redirects`。上线后必须实际检查这些规则，而不能只以仓库文件存在作为验收证据。

## 3. 发布工具

本目录提供三个不修改应用源码的工具：

```text
deploy/cloudflare-pages.sh  构建门禁、项目创建、preview/production 上传、部署列表
deploy/smoke-pages.sh       对 preview 或 production URL 执行 HTTP smoke
deploy/release-evidence.sh  生成可粘贴进 HANDOFF 的发布证据字段
```

首次使用：

```bash
cd /path/to/digital-museum
chmod +x deploy/*.sh
```

脚本默认使用：

```text
CF_PAGES_PROJECT=dao-ru-fo-digital-museum
CF_PAGES_PRODUCTION_BRANCH=main
WRANGLER_VERSION=latest
```

如需冻结 Wrangler 版本：

```bash
WRANGLER_VERSION=<verified-version> ./deploy/cloudflare-pages.sh preflight
```

上线记录必须写入实际使用的 Wrangler 版本。

## 4. P0 上线前置条件

工程基线已经具备本地 Git 检查点；**production 脚本默认拒绝 dirty tree**。正式上线前仍需完成：

1. 浏览器桌面和 390px 移动端验收；
2. 修复 console error/warn 和阻断问题；
3. `npm run check` 全绿；
4. 从已验证检查点创建可追溯 release commit；
5. 确认 production branch 使用 `main`；
6. 确认 Cloudflare 账号与项目归属；
7. 确认 production build 中没有浏览器 source maps；
8. 更新 `docs/HANDOFF.md` 的 pre-deploy 记录。

推荐 Git 准备流程由主线程执行：

```bash
git add <reviewed release files>
git commit -m "release: first viewable digital museum"
git branch -M main
git status --short
```

最后一条必须无输出。不要为了绕过门禁而常态使用 `ALLOW_DIRTY_DEPLOY=1`。

## 5. 第一次 Cloudflare Pages 发布

### 5.1 身份验证

个人交互发布：

```bash
./deploy/cloudflare-pages.sh login
```

CI 发布需要最小权限的 Cloudflare API Token，并设置：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Token 至少需要目标账号的 Pages 写权限。不要把 Token 写入仓库、命令输出、截图或 HANDOFF。

### 5.2 本地 preflight

```bash
./deploy/cloudflare-pages.sh preflight
```

成功条件：

- 全部 repository gates 通过；
- `dist/index.html`、manifest、`_headers`、`_redirects` 存在；
- public 与 dist 的 headers/redirects 一致；
- 文件数与单文件大小符合 Pages 限制；
- 输出确认正确项目名和 dist 路径。

### 5.3 检查/创建项目

先检查账号中是否已经存在同名项目：

```bash
./deploy/cloudflare-pages.sh projects
```

仅在确认不存在时创建：

```bash
./deploy/cloudflare-pages.sh create
```

等价核心命令：

```bash
npx wrangler pages project create dao-ru-fo-digital-museum \
  --production-branch=main
```

### 5.4 Preview 部署

```bash
./deploy/cloudflare-pages.sh preview first-public-rc
```

等价核心命令：

```bash
npx wrangler pages deploy apps/museum-web/dist \
  --project-name=dao-ru-fo-digital-museum \
  --branch=first-public-rc
```

记录 Wrangler 输出的：

- deployment ID；
- unique deployment URL；
- branch alias URL；
- Wrangler 版本；
- 上传文件数量；
- Git commit / dirty 状态。

### 5.5 Preview 线上 smoke

```bash
./deploy/smoke-pages.sh https://<preview-url>
```

然后按第 7 节完成真实浏览器验收。Preview 未通过时不得继续 production。

### 5.6 Production 部署

确保：

- 当前 Git tree clean；
- 当前 commit 与 preview 验收 commit 相同；
- `npm run check` 在该 commit 上通过；
- pre-deploy HANDOFF 已更新。

执行：

```bash
CONFIRM_PRODUCTION=dao-ru-fo-digital-museum \
  ./deploy/cloudflare-pages.sh production
```

等价核心命令：

```bash
npx wrangler pages deploy apps/museum-web/dist \
  --project-name=dao-ru-fo-digital-museum \
  --branch=main
```

部署完成后不要立刻结束任务；必须继续 production smoke、浏览器复验和 HANDOFF。

## 6. 自动化线上 Smoke 清单

运行：

```bash
./deploy/smoke-pages.sh https://dao-ru-fo-digital-museum.pages.dev
```

脚本会验证：

1. `/` 返回 HTML 200；
2. 首页包含 React root；
3. CSP、nosniff、Permissions-Policy 已实际生效；
4. `/museum/changan-three-traditions` deep link 返回 app shell；
5. `/figures/xuanzang` deep link 返回 app shell；
6. `/passages/form-is-emptiness` deep link 返回 app shell；
7. content manifest 可读取且身份为 `dao-ru-fo` / schema `2.0`；
8. English profile 数据拆包可读取；
9. 隋唐 GeoJSON 可读取；
10. `data/v2` cache policy 生效；
11. hashed asset 使用 immutable cache policy。

任意一项失败，脚本以非零状态退出，production 不得签收。

## 7. 浏览器验收清单

### 7.1 桌面

- 首页品牌显示“道·儒·佛文明数字博物馆”；
- 默认策展顺序为“道 → 儒 → 佛”；
- 黄金分割层级清晰，但没有装饰性滥用黄金螺旋；
- 首页主区/辅助区、7/5 网格和重点卡片无溢出；
- 主导航、skip link、键盘焦点可用；
- 展览五章节滚动正常；
- 地图、时间、关系三个 Explore 模式可切换；
- 搜索可输入、提交、打开结果；
- 人物、passage、地点详情可打开；
- 研究来源面板可读；
- 中文/English 切换不丢失当前位置或产生空白页；
- hard refresh deep link 不返回 Cloudflare 404；
- console 无 error；warn 必须逐项判定并记录。

### 7.2 390px 移动端

- 无横向滚动；
- 品牌、导航和语言控件不重叠；
- 黄金分割桌面布局合理降为单列，不强保 61.8/38.2；
- 卡片、地图图例、时间轴和关系图不裁切关键操作；
- 最小点击目标、焦点样式和正文可读性合格；
- 展览章节、搜索、entity drawer/detail 可完整操作。

### 7.3 双语与数据

- `/data/v2/profile/zh-CN.json` 与 `/data/v2/profile/en.json` 均为 200；
- 中文与英文首页均无 key 泄漏；
- content version 与 preview 验收一致；
- 三传统核心人物、经典、passage 链都能打开；
- “完整审校待补”等内容状态没有被错误隐藏。

## 8. 发布证据与 Handoff

生成基础证据块：

```bash
./deploy/release-evidence.sh https://<verified-public-url>
```

将输出补全并写入 `docs/HANDOFF.md`。上线记录至少包含：

```text
release timestamp (UTC and Melbourne)
release operator
Cloudflare account/team
Pages project name
environment (preview/production)
production branch
public URL
unique deployment URL
deployment ID
Git branch
Git commit SHA
Git tree clean/dirty
Node / npm / Wrangler versions
schema version
content version
profile
release stage
dist file count and bytes
index/app/vendor/CSS/content-manifest/_headers/_redirects SHA-256
npm run check result
online smoke result
desktop browser result
390px mobile result
Chinese/English result
console error/warn result
known issues
rollback target deployment ID
next-stage owner and concrete entry point
```

Handoff 纪律：

1. 部署前记录 commit、门禁和已知风险；
2. preview 后记录 deployment ID、URL 和 smoke；
3. production 后立即记录正式 URL、deployment ID 和 hashes；
4. 浏览器复验后记录设备/视口/浏览器和发现；
5. 任何 hotfix 必须形成新 commit、新 deployment 和新 handoff 条目；
6. 不得用“已上线”替代可复核的 URL、ID、hash 与测试证据。

## 9. 回滚

### 9.1 什么时候回滚

出现以下任一情况应优先回滚：

- 首页或核心 deep link 无法加载；
- 关键静态数据 404/解析失败；
- 中文或英文整站不可用；
- CSP/headers 变化导致应用脚本被阻断；
- production 与已验收 preview 的 commit/content version 不一致；
- 出现影响公众使用或学术可信度的严重内容错误。

### 9.2 回滚目标

只选择：

- 状态为 successful 的历史 production deployment；
- 已记录 deployment ID、commit、content version 和 smoke 结果；
- 不是 preview deployment。

Cloudflare 不允许把 preview deployment 直接作为 production rollback target。

### 9.3 Dashboard 回滚（推荐）

1. Cloudflare Dashboard → Workers & Pages；
2. 打开 `dao-ru-fo-digital-museum`；
3. 打开 Deployments；
4. 在 All deployments 找到目标 successful production deployment；
5. 三点菜单 → **Rollback to this deployment**；
6. 二次核对目标 deployment ID；
7. 确认 rollback；
8. 立即执行 production smoke 和浏览器最小复验；
9. 在 HANDOFF 记录事故、旧/新 deployment ID、操作人、时间和后续修复入口。

### 9.4 API 回滚（仅自动化/应急）

需要：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
TARGET_DEPLOYMENT_ID
CF_PAGES_PROJECT=dao-ru-fo-digital-museum
```

API：

```bash
curl --fail-with-body --request POST \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/deployments/${TARGET_DEPLOYMENT_ID}/rollback" \
  --header "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  --header "Content-Type: application/json"
```

执行 API 回滚前必须人工复核 deployment ID。API Token 不得进入 shell history、日志或 HANDOFF；优先通过安全环境变量注入。

### 9.5 回滚后验证

```bash
./deploy/smoke-pages.sh https://dao-ru-fo-digital-museum.pages.dev
./deploy/cloudflare-pages.sh list production
```

回滚只恢复服务，不等于修复完成。根因、修复 commit、重新发布和内容勘误仍需单独闭环。

## 10. 已知上线风险

1. 当前仓库没有首个 commit，尚不满足 production 可追溯性。
2. production build 已关闭 source maps，`verify:static` 也会拦截 `.map`；未来若为错误监控重新启用，应上传到受控服务而不是随 Pages 公开。
3. `_redirects` 会把未知 URL rewrite 到 SPA；应用内部 NotFound 页面必须通过浏览器验收。
4. CSP 当前只允许同源资源。未来加入外部字体、地图瓦片、音频/CDN 或分析脚本时，必须先最小化扩展 CSP 并复验。
5. `data/v2` 使用一小时 browser cache。紧急内容勘误发布后需要确认新 deployment 与浏览器缓存行为。
6. Direct Upload 项目不能原地转成 Git integration；未来若改变发布模式，需要新项目迁移。
7. 自定义域名、Web Analytics、访问日志与监控不属于第一版发布阻断项，但进入 Public MVP 前应形成单独 ADR。

## 11. 官方依据

- Cloudflare Pages Direct Upload：
  <https://developers.cloudflare.com/pages/get-started/direct-upload/>
- Wrangler Pages commands：
  <https://developers.cloudflare.com/workers/wrangler/commands/pages/>
- Pages `_headers`：
  <https://developers.cloudflare.com/pages/configuration/headers/>
- Pages serving 与 SPA 行为：
  <https://developers.cloudflare.com/pages/configuration/serving-pages/>
- Pages limits：
  <https://developers.cloudflare.com/pages/platform/limits/>
- Pages rollbacks：
  <https://developers.cloudflare.com/pages/configuration/rollbacks/>
