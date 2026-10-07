# 道·儒·佛文明数字博物馆｜CLAUDE.md

## 写作规则 · STE-lite v1

适用：操作步骤、发布和回滚、交接（HANDOFF、「等 Lee」）、警告、写给其他会话的说明。

1. 一步一个动作。动词在前。条件放在句首：「如果……，就……」。
2. 句长：中文不超过 40 字，英文不超过 20 词。代码、路径、命令不计。
3. 每一步写成功判据：期望的输出、状态码或版本号。`healthy`、退出码 0 不算证据，除非写明它证明了什么。
4. 警告用 `> ⚠️`。第一句写做什么或不做什么，第二句写不照做的后果，然后写原因。一个警告只讲一个危险。
5. 用主动语态。待办写明负责人。
6. 一词一义：只用本仓库术语表里的词。一个新词有两个意思时，先拆成两个词，再写进表里。
7. 会变的值带日期：「2026-10-03 实测」。没核实的写「未核实」，并写原因。没做的不写成已做。
8. 步骤、原因、事故经过分开放。事故经过不打断步骤。

不适用：
- 说明和原因段：不限句长，但第一句给结论。
- 历史日志（*-LOG.md、按日期记的流水）：保留原样。
- 产品文案和品牌文案（任何语言）、App Store 文案、面向访客的 AI prompt。
- 交接文件里「等 Lee」条目的格式：沿用全局约定，这里不改。
- TTS 旁白和配音稿：不拆句（qwen-tts 实测：拆句 10 次全败）。
- 经文、古籍、文化内容。

旧文档不批量改写。你改哪一节，就按规则整理哪一节。

## 本仓库的范围
- 适用：`docs/DEPLOYMENT.md`、`docs/PUBLIC_RC_WORKFLOW.md`、`docs/RELEASE_GATE_ALPHA.md`、`docs/HANDOFF.md`。
- 不适用：展陈和文化内容；`docs/CHECKPOINT_*`（历史）。

## 术语表
| 用这个 | 意思（只有这一个） | 不要用 |
|---|---|---|
| Preview 部署 | 部署通道：上传到 Cloudflare Pages 非 `main` 分支（`./deploy/cloudflare-pages.sh preview` 或 `preview-public`），得到 branch alias 地址。2026-08-11 起日常不再使用 | 单独的 preview、Preview branch（不带「部署」）、Preview 更新 |
| `visibility=preview` | 内容可见性：产物含研究 Alpha 和未完成审核的内容，没有经过 Public RC 晋级。和部署到哪个通道无关 | 单独的 preview、Preview 内容、Alpha Preview |
| `visibility=public` | 内容可见性：产物只含经 Public RC 晋级、`public + publishable` 的内容 | 公开（指内容时）、Public（不带 `visibility=`） |
| Cloudflare production | 部署通道：Pages 项目 `dao-ru-fo-digital-museum` 的 `main` 分支，对应默认地址 | 公开站点、正式上线；单独的 production 指 Vite 构建模式（那个写「Vite 生产构建」） |
| 默认地址 | <https://dao-ru-fo-digital-museum.pages.dev>，指向当前 Cloudflare production 部署 | 默认域名、default production、default |
| unique 地址 | 某一次部署专属的 `https://<id>.dao-ru-fo-digital-museum.pages.dev`，用作发布和回滚证据 | 唯一部署、unique deployment URL、unique deployment |
| source marker | 部署时通过 `--commit-hash` 记录到 Cloudflare 的 Git commit | commit marker、source/commit marker、source（单独） |
