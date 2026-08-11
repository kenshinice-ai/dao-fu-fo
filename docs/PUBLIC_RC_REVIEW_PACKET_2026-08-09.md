# Public RC 1｜第一批审核包

状态：`promoted`，审核与 ready gate 已完成；当前仅发布到 Cloudflare Pages Public RC Preview，production 未发布。

最终审核证据与线上复盘见 [Public RC 最终审核与 Preview 复盘](./PUBLIC_RC_FINAL_AUDIT_2026-08-09.md)。

本审核包只覆盖现有候选范围，不新增人物、文本或关系：

文本三条链的 claim-level 预审边界见 [文本链预审表](./PUBLIC_RC_TEXT_CLAIM_AUDIT_2026-08-09.md)；文本闭包的 rights handoff 见 [文本闭包 rights 审计交接](./PUBLIC_RC_RIGHTS_AUDIT_2026-08-09.md)；这些文档只提供可核对范围，不代替 reviewer record。

- 10 个核心实体：玄奘、司马承祯、孔颖达，《心经》《道德经》《论语》，三段 passage，长安；
- 3 个结构依赖：三个 text version；
- 14 条关系：人物—长安 3 条、passage—text 3 条、text—version 3 条、passage—version 3 条、文本比较 2 条；
- 最终 `reviews.json`：144/144 `passed`，其中 27 条 compiler schema 记录、117 条由 `codex:authorized-rc-reviewer` 写入的 fact / bilingual / rights / editorial / tradition / accessibility 正式记录；实体 subject 的 accessibility check 已完成。历史的 agent `pre_reviewed` 与 role `pending` 记录已被正式记录替换，具体证据分流仍见 [fact 证据分流表](./PUBLIC_RC_FACT_REVIEW_2026-08-09.md)。

## 审核边界

`schema=passed` 只表示 Zod、稳定 identity、结构依赖和关系端点已经通过机器门禁；它不表示事实、传统归属、双语、权利或策展文字已经被批准。

其余检查必须分别形成带 reviewer、时间和说明的记录：

1. `fact`：来源确实支持当前句子的范围，不能用“有这本书”替代“这本书支持这项具体判断”；
2. `tradition`：传统归属、历史性、传述和后世神格化不能混为一谈；
3. `bilingual`：中英文标题、摘要、引文、定位和不确定性说明互相对应；
4. `rights`：原文、译文、外部网页和后续录音分别确认可用边界；
5. `editorial`：确定性、措辞、比较关系和 Public 展示范围经过策展复核；
6. `accessibility`：实际中英文展示路由的标题层级、焦点顺序、键盘操作、对比度、链接名称和屏幕阅读顺序通过专项复核；自动 axe 结果只是证据，不替代角色审核。

任何 `pending` 或 `failed` 都继续阻塞 Public RC；不能因为 Preview 页面正常而晋级内容。

## Subject 与来源核验范围

| subject | 主要核验对象 | 当前来源边界 |
| --- | --- | --- |
| `figure:xuanzang` | 生平、求法、译经与长安活动关系 | [《大唐大慈恩寺三藏法师传》](https://ctext.org/library.pl?if=en&res=112971)；支持传记和译经活动，不自动支持所有策展性“主要场所”表述 |
| `figure:sima-chengzhen` | 生平、入朝活动与道教制度语境 | [《旧唐书》司马承祯条](https://ctext.org/wiki.pl?if=gb&remap=gb&res=456206)；`source:daoist-historical-record` 仅作学术语境，不能替代一手定位 |
| `figure:kong-yingda` | 生平、经学活动与国家教育语境 | [《新唐书·儒学上》孔颖达传](https://ctext.org/wiki.pl?chapter=451765&if=gb&remap=gb)；经学制度扩展判断仍需结合 `source:confucian-commentarial-record` |
| `text:heart-sutra` / `text_version:heart-sutra-chinese-received` | 汉译文本、版本层和归属争议 | [《心经》对应章节](https://ctext.org/wiki.pl?chapter=412996&if=en)；保留 `attributionStatus=contested` |
| `text:daodejing` / `text_version:daodejing-received` | 传世本、成书/编纂区间与归属 | [《道德经》第二十五章](https://ctext.org/text.pl?if=en&node=11616&show=parallel)；不能把通行本直接等同于老子单一历史时刻 |
| `text:analects` / `text_version:analects-received` | 编纂/流传、复合归属与篇章定位 | [《论语》颜渊第十二](https://ctext.org/wiki.pl?chapter=198285&if=en&remap=gb)；保留 `attributionStatus=composite` |
| `passage:form-is-emptiness` | 原文与《心经》版本闭包 | `source:heart-sutra-edition` 已精确到第 2 节；英译和现代解释仍需双语/策展复核 |
| `passage:humans-follow-earth` | 原文与《道德经》第二十五章 | `source:daodejing-edition` 已精确到第二十五章；译文是馆方展示文字，不冒充古代原文 |
| `passage:return-to-ritual` | 原文与《论语》颜渊篇 | `source:analects-edition` 已精确到颜渊第十二第 1 章；解释需保留语境和译法边界 |
| `place:changan` | 城市级现实地点和坐标示意 | [UNESCO 长安—天山廊道地图](https://whc.unesco.org/en/list/1442/maps/)；支持遗址/廊道坐标，不自动支持所有三教制度叙述 |

## 关系审核顺序

- `active_in`：核对人物在长安的活动时段与来源，不把“与城市制度相连”写成具体建筑驻地；
- `passage_of` / `quoted_from_version`：核对 text → version → passage 闭包和章/节定位；
- `has_version`：核对作品级文本与版本级文本没有互相替代；
- `comparative_parallel`：确认只是策展并置，不暗示共同作者、直接影响或同一宗教功能。

## 通过条件

每个 subject 的审核记录必须包含：

- 唯一 `review:id`、subject、check kind、reviewer、状态和说明；
- 事实检查回到当前 source locator；
- 双语检查覆盖实际展示字段，不只检查 JSON 能解析；
- 权利检查覆盖引用文本、译文和外部来源链接；
- 策展检查确认不确定性和证据层仍在页面可见。

只有 27 个 subject 的所有 required checks 完成、候选状态改为 `ready`，并且 `verify:public-rc:ready` 通过后，才允许讨论 promotion。本候选已满足该条件并完成 promotion；未来新增 subject 必须重新建立同等审核闭环。

审核门禁还会拒绝由 `agent:` 或 `role:` 占位身份写入的 `passed` / `waived` 记录；`automated:` 只能用于 compiler 的 `schema=passed` 证据。这样可以防止预审、角色分派和正式批准在数据层被混写。

正式 reviewer 可用以下命令更新既有记录；命令会原子替换对应 subject/check，不会新增重复记录：

```sh
npm run review:record -- \
  --subject-kind=entity \
  --subject-key=figure:xuanzang \
  --check-kind=editorial \
  --status=passed \
  --reviewer=<identified-reviewer> \
  --reviewed-at=<ISO-8601> \
  --note="<具体核验说明>"
```

`passed` / `waived` 必须使用明确 reviewer 身份和说明；更新后运行 `npm run verify:public-rc`，所有 subject 完成后再运行 `npm run verify:public-rc:ready`。
