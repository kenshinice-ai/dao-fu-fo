# Public RC 1｜人物、空间与关系 fact 证据分流

状态：7 条 fact checks 已记录为 `pre_reviewed`，2 条人物—长安关系仍保持 `pending`。本轮只收窄既有关系的证据边界，不把任何 fact 改成正式通过。本表不是正式 reviewer approval，也不改变 Public RC 的 fail-closed 规则。

本轮只处理已经冻结的 27 个 Public RC subject，不新增人物、文本、地点或关系。目标是把“可以进行 agent 级 claim-boundary 预审”和“仍需补精确证据”分开，方便正式历史与策展角色接手。

## 已完成 agent 级预审

| subject | 当前可支持的边界 | 主要来源 | 仍需正式签核 |
| --- | --- | --- | --- |
| `figure:xuanzang` | 玄奘作为有传记记录的僧侣、求法者和译经者，以及与长安翻译/制度空间的关联；不把后世文学形象当作生平事实 | [`source:xuanzang-records`](https://ctext.org/library.pl?if=en&res=112971)；[Ctext 玄奘数据条目](https://ctext.org/datawiki.pl?if=en&remap=gb&res=948242) | 逐项核对传记卷次、路线年份、译经项目和页面展示字段 |
| `relation:xuanzang-active-changan` | 玄奘返抵长安以及长安译经机构的关系边界；不推出具体建筑驻地或所有译经均在同一地点完成 | 同上 | 历史 reviewer 核对原始传记定位，lead curator 核对“主要场所”措辞 |
| `relation:daodejing-analects-comparative` | 只作为比较阅读入口，明确排除共同作者、直接影响和同一宗教功能 | [`source:comparative-method`](https://www.cambridge.org/core/books/ancient-and-modern-practices-of-citizenship-in-asia-and-the-west/interpreting-dao-between-waymaking-and-bewegen/CAFD486CD1B7104EDDB070DD77CBB970)；`source:editorial-method` | 历史 reviewer 确认关系不是事实影响断言，lead curator 确认页面免责声明 |
| `relation:heart-sutra-daodejing-comparative` | 只作为保留术语、时代和宗教功能差异的概念并置，不把两部文本等同 | [`source:comparative-method`](https://www.cambridge.org/core/books/ancient-and-modern-practices-of-citizenship-in-asia-and-the-west/interpreting-dao-between-waymaking-and-bewegen/CAFD486CD1B7104EDDB070DD77CBB970)；`source:editorial-method` | 历史 reviewer 与 lead curator 分别确认方法边界和展示措辞 |
| `figure:sima-chengzhen` | 唐代传记与《全唐文》支持 647–735、道士身份和入朝召见的有限事实边界；不把法脉和后世影响合并进该结论 | [《旧唐书》司马承祯条](https://ctext.org/wiki.pl?if=gb&remap=gb&res=456206)；[《全唐文》司马承祯](https://ctext.org/wiki.pl?chapter=226793&if=gb) | 传统归属、后世影响和正式历史/策展审核仍需分开签核 |
| `figure:kong-yingda` | 《新唐书》传与艺文志记录支持 574–648、奉诏编纂经疏和国子监语境的有限事实边界 | [《新唐书·儒学上》](https://ctext.org/wiki.pl?chapter=451765&if=gb&remap=gb)；[《新唐书·艺文志》](https://ctext.org/wiki.pl?chapter=189091&if=en) | 编纂参与者、制度化接受和正式历史/策展审核仍需核对 |
| `place:changan` | 同行评议的空间研究与 UNESCO 资料共同支持隋唐长安/今西安的城市锚点与遗产参照；地图坐标仍是示意 centroid | [Remote Sensing 14 (2022) 3298](https://doi.org/10.3390/rs14143298)；[UNESCO 长安—天山廊道地图](https://whc.unesco.org/en/list/1442/maps/) | 需要正式历史地理 reviewer 确认时间范围、坐标表达和地图文案 |

这 7 条记录在 `content/dao-ru-fo/reviews.json` 中由 `agent:codex-content-audit` 标为 `pre_reviewed`，不计入 completed checks。

## 保持 pending 的证据缺口

| subject | 不足之处 | 正式审核前需要补什么 |
| --- | --- | --- |
| `relation:sima-active-changan` | 《旧唐书》可定位到景云二年（约 711）睿宗召入京；后续开元年间东都洛阳、王屋山活动不能并入长安关系 | 正式历史 reviewer 需核对“京”到长安的城市尺度映射；保留 711 单点锚点，不能恢复成 `c. 713–735` 的持续活动 |
| `relation:kong-active-changan` | 专用来源 `source:changan-guozijian-gazetteer` 的《碑林区志》定位到贞观十四年（640）长安务本坊国子学，孔颖达奉命讲《孝经》并参与《五经正义》教材编定 | 正式历史 reviewer 需核对地方志定位与“参与编定”的措辞；关系时间边界收窄为 640，不外推至 `c. 630–648` |

## 计数与门禁

- 当前审核记录：144 条 = 27 条 schema `passed` + 25 条 agent `pre_reviewed` + 92 条正式角色 `pending`；
- `pre_reviewed` 和 `pending` 都不会进入 completed checks；Public RC 仍为 27 blockers，candidate 仍为 `planning`；
- 本表只减少重复查找，不替代 `role:historical-reviewer`、`role:tradition-reviewer`、`role:bilingual-editor`、`role:rights-editor`、`role:accessibility-editor` 或 `role:lead-curator` 的正式记录。

## 来源入口

- [《新唐书·儒学上》孔颖达传](https://ctext.org/wiki.pl?chapter=451765&if=gb&remap=gb)
- [孔颖达 Ctext 数据条目](https://ctext.org/datawiki.pl?if=gb&remap=gb&res=581200)
- [《周易正义》与孔颖达编纂关系](https://ctext.org/datawiki.pl?if=en&res=335535)
- [司马承祯 Ctext 数据条目](https://ctext.org/datawiki.pl?if=gb&remap=gb&res=211289)
- [《全唐文》司马承祯相关条目](https://ctext.org/wiki.pl?chapter=226793&if=gb)
- [`source:changan-guozijian-gazetteer`：《碑林区志》唐长安国子学纪年（陕西省地方志办公室 PDF）](https://dfz.shaanxi.gov.cn/zslm/fzzlk/xbsxsxz/xbsxz/xas_16198/201405/P020240923623390886739.pdf)
- [UNESCO 长安—天山廊道地图](https://whc.unesco.org/en/list/1442/maps/)
