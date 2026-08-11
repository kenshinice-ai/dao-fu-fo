# Public RC 1｜文本链 claim-level 预审表

状态：18 个文本链 `fact` checks 已记录为 `pre_reviewed`，不是正式 reviewer approval；其余检查仍保持 `pending`，所有这些状态都继续阻塞 Public RC。文本闭包的权利分层已另列于 [rights 审计交接](./PUBLIC_RC_RIGHTS_AUDIT_2026-08-09.md)。

目的：把第一批 Public RC 中最容易混淆的“原文事实、版本身份、译文、解释和权利”拆开，减少下一轮历史、传统、双语、权利和策展审核的重复劳动。本表只覆盖已有的三部文本、三个版本、三段 passage 及其结构关系，不新增内容；`pre_reviewed` 只记录 agent 对明确 claim boundary 的预审，不替代对应角色的正式签核。

## 结论摘要

| 文本链 | 可以直接核对的范围 | 仍必须保持 pending 的范围 |
| --- | --- | --- |
| 《心经》 | Ctext 第 2 节包含“舍利子，色不异空，空不异色，色即是空，空即是色”；当前 passage 原文与 section locator 对得上 | 不把 Ctext 页面自动等同于某一译者底本；译者、具体版本、异文、英译和数字页面权利仍需角色审核 |
| 《道德经》 | Ctext 第二十五章包含“人法地，地法天，天法道，道法自然”；当前 passage 原文与章次 locator 对得上 | 不把通行本等同于老子单一历史时刻；“自然”的英文译法、传世本身份、出土本/注本差异和数字页面权利仍需角色审核 |
| 《论语》 | Ctext《颜渊》第十二章第 1 章包含“克己复礼为仁”；当前 passage 原文与篇章 locator 对得上 | 不把孔子作者身份、后世注疏解释或制度化接受直接投射到此句；“humaneness / ritual”的译法和数字页面权利仍需角色审核 |

## 逐链核对

### 1. 《心经》

- source：`source:heart-sutra-edition`，`locatorLevel=precise`、`citationStatus=verified`，定位为 Ctext 第 2 节；原始入口为 [Ctext《心经》](https://ctext.org/wiki.pl?chapter=412996&if=en)；
- 可支持的 fact claim：`passage:form-is-emptiness` 的四句汉文与该节原文一致；`passage_of` 和 `quoted_from_version` 关系可以回到 `text:heart-sutra` 与 `text_version:heart-sutra-chinese-received`；
- 不应由该 source 单独推出：具体译者、译出年代、唯一底本、完整异文谱系或“最早/唯一”的历史判断；当前版本实体的 Alpha placeholder 说明必须保留；
- `translationEn`、`modernZh` 和 quote interpretation 是馆方展示层，不能作为原文 source；需由 `role:bilingual-editor` 与 `role:lead-curator` 按实际页面字段复核；
- rights 预审建议：古典文本本身与 Ctext 页面转录/网页呈现分开处理；在 rights reviewer 明确引用长度、链接和页面转录边界前，不把 `public_domain` 扩展为整页内容许可。

### 2. 《道德经》

- source：`source:daodejing-edition`，`locatorLevel=precise`、`citationStatus=verified`，定位为第二十五章；原始入口为 [Ctext《道德经》第二十五章](https://ctext.org/text.pl?if=en&node=11616&show=parallel)；
- 可支持的 fact claim：`passage:humans-follow-earth` 的汉文与第二十五章句子一致；`passage_of` 和 `quoted_from_version` 关系可以回到 `text:daodejing` 与 `text_version:daodejing-received`；
- 不应由该 source 单独推出：成书/编纂的单一年代、老子作为单一历史作者、通行本与出土材料的完全同一，以及“自然”必然等于现代“顺其自然”；
- `translationEn` 的 “naturalness” 和馆方解释是有边界的展示译法，不是唯一英译；需由双语和策展角色确认是否保留该措辞；
- rights 预审建议同上：原典公共领域、数字转录、网页和译文分层处理。

### 3. 《论语》

- source：`source:analects-edition`，`locatorLevel=precise`、`citationStatus=verified`，定位为颜渊第十二第 1 章；原始入口为 [Ctext《论语》颜渊第十二](https://ctext.org/wiki.pl?chapter=198285&if=en&remap=gb)；
- 可支持的 fact claim：`passage:return-to-ritual` 的“克己复礼为仁”与篇章定位一致；`passage_of` 和 `quoted_from_version` 关系可以回到 `text:analects` 与 `text_version:analects-received`；
- 不应由该 source 单独推出：该句在所有传本中完全相同、孔子为现代意义上的单一作者、后世注疏就是原句本义，或唐代制度使用已经由这一 passage 直接证明；
- `translationEn` 的 “humaneness” 与 “ritual” 是展示译法，需保留术语说明并由双语/策展角色复核；
- rights 仍需把古典原文、Ctext 转录、外部翻译和本馆解释分别登记。

## 关系级预审

- `has_version`：当前三条关系只表达作品层到版本层的结构闭包；不表达某个唯一现代版或作者归属，可进入 fact/editorial 审核；
- `passage_of`：三条关系的端点和 source locator 与 passage 的 textSlug 一致；应核对页面展示是否同时显示 text、version 和 locator；
- `quoted_from_version`：三条关系可以支持“当前 passage 回到指定版本层”，但不能把当前数字转录自动标成经鉴定的批校本；
- `comparative_parallel`：`relation:heart-sutra-daodejing-comparative` 与 `relation:daodejing-analects-comparative` 是策展并置，不是共同作者、直接影响或同一宗教功能的事实主张；其 `source:comparative-method` / `source:editorial-method` 只能说明方法边界，不能替代历史事实来源。

## 下一轮签核顺序

建议先处理文本闭包的 18 个 subject（9 个 text/text version/passage + 9 条 `has_version`/`passage_of`/`quoted_from_version` 关系），再处理 2 条比较关系，最后处理 3 位人物和长安。当前 rights pending 备注已具体化为 Ctext 页面/转录/译文/馆方解释的分层核验项；每个 subject 仍需在 `reviews.json` 中由对应角色写入独立的 `reviewedAt`、状态和说明；本表不代替这些记录。
