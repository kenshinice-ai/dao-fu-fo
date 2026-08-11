# Public RC 1｜文本闭包 rights 审计交接

状态：agent 级 rights handoff，未形成正式 `role:rights-editor` approval；不改变 27 个 subject 的 `pending` 状态，也不扩大 Public RC 范围。

本轮覆盖已有文本闭包的 20 个 subject：3 部文本、3 个 text version、3 个 passage、9 条 text/version/passage 结构关系和 2 条 comparative 关系。目标是把“古典原文的历史公版属性”“数字网页/转录”“现代译文与馆方解释”分开，供 rights-editor 逐项签核。

## 证据边界

| 资源层 | 当前处理 | 正式审核动作 |
| --- | --- | --- |
| 《心经》《道德经》《论语》的古典原文 | source records 当前以 `public_domain` 表示底层古典文本的历史权利判断 | 核对实际展示只使用短摘录，并确认展示法域、版本和出处标注；不能把该字段解释成整个外部网页可自由复制 |
| Chinese Text Project 页面、转录、字体和页面编排 | Ctext FAQ 明确区分 site content、字体、转录和译文；页面允许合理数量引用，但网页本身不能整页搬运或批量下载 | 保留 Ctext URL、标题/章节 locator 和 credit；禁止整页镜像、批量抓取或复制无关页面内容 |
| Ctext 英文/现代译文 | 译文版权仍归原译者；本 RC passage 的 `translationEn`、`modernZh` 和 `interpretation` 是馆方展示字段，不能自动称为 Ctext 译文 | 核对每个展示译文的作者/来源；若为项目自撰，记录项目权利；若来自外部译者，改为短引或取得许可 |
| Cambridge comparative method | `source:comparative-method` 当前为 `quotation_only`，只支持比较方法边界 | Public 页面只保留链接、书目信息和项目自己的概述，不复制章节正文或长引 |
| 《碑林区志》地方志 PDF | `source:changan-guozijian-gazetteer` 为 `external_reference_only`，只服务孔颖达—长安关系的事实定位 | 使用 640 年务本坊国子学的短事实摘要、来源链接和 locator；不把 PDF 作为项目托管或全文再发布 |

## 当前 20 个 subject 的统一核验规则

- `text:*`、`text_version:*`：核对作品/版本条目是否只显示必要标题、摘要和来源链接；版本的 `rightsStatus=public_domain` 不能替代具体底本、译者和数字转录权利记录。
- `passage:*`：核对 `profile.originalText` 是短摘录；`translationEn`、`modernZh`、`interpretation` 必须与外部译文分层，不能把馆方译文冒充 Ctext 或古代原文。
- `has_version`、`passage_of`、`quoted_from_version`：这些关系本身不新增可版权文本；rights check 仍需确认页面实际显示的 source credit、locator 和短引范围。
- `comparative_parallel`：只表达策展并置；方法来源是 quotation-only，不能支持共同作者、直接影响或大段复制。
- 所有 20 条记录仍由 `role:rights-editor` 正式决定 `passed` / `failed` / `waived`；agent 备注只减少核对路径，不是批准。

## 正式 reviewer 操作清单

1. 在真实 Public artifact 生成前，逐条检查实际页面字段和外链，而不是只看 source JSON。
2. 为三条 Ctext passage 记录摘录长度、来源 credit、章节定位和使用法域。
3. 为三条英文译文和三条现代中文解释记录作者/项目归属；没有明确权利时保持不发布。
4. 为 Cambridge 和地方志来源保留外部参考/链接模式，不复制 PDF 或章节正文。
5. 在 `reviews.json` 写入 reviewer、`reviewedAt`、状态和说明；未完成的条目继续阻塞 Public RC。

## 来源入口

- [Chinese Text Project FAQ：Copyright and terms of use](https://ctext.org/faq)
- [Ctext《心经》](https://ctext.org/wiki.pl?chapter=412996&if=en)
- [Ctext《道德经》第二十五章](https://ctext.org/text.pl?if=en&node=11616&show=parallel)
- [Ctext《论语》颜渊第十二](https://ctext.org/wiki.pl?chapter=198285&if=en&remap=gb)
- [Cambridge comparative-method chapter](https://www.cambridge.org/core/books/ancient-and-modern-practices-of-citizenship-in-asia-and-the-west/interpreting-dao-between-waymaking-and-bewegen/CAFD486CD1B7104EDDB070DD77CBB970)
- [《碑林区志》唐长安国子学纪年 PDF](https://dfz.shaanxi.gov.cn/zslm/fzzlk/xbsxsxz/xbsxz/xas_16198/201405/P020240923623390886739.pdf)
