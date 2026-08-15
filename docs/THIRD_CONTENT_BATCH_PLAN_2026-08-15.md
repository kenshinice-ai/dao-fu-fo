# 第三批人物—事件—地点—关系—路线冻结计划

日期：2026-08-15  
状态：authoring、批次 verifier、完整工程门禁与 Full Alpha Playwright/axe 已完成；待提交、推送；production 尚未获本批次单独发布确认

## 0. 完成记录

第三批已严格按本文件冻结边界完成，没有加入第 13 位人物或第 4 条路线：

- 新增 12 人物、12 事件、10 地点、3 路线、14 来源、69 关系；
- 当前 Full Alpha 为 465 个编译实体：人物 152、事件 157、地点 90、路线 7，另有既有文本、版本、概念、机构、对象与段落；
- 当前总关系 716、来源 105、音频 3；数据库 bundle 为 468 entities / 716 relations（含 3 个传统字典实体）；
- 现实地图地点 85；symbolic cosmos 为 3 tradition nodes / 11 figure nodes / 5 place nodes / 15 edges；
- `verify:third-batch` 已确认：

```text
Third-batch closure verified:
12 figures, 12 events, 10 places, 3 routes,
69 relations; new-figure interactions=6.
```

- 完整 `npm run check` 通过；Core unit 11/11、Compiler unit 5/5、Web unit 18/18；
- source/read-model alignment 为 465/465 entities、716/716 relations、warnings 0；
- Full Alpha Playwright + axe 为 **63 passed / 1 skipped**，唯一 skipped 仍为 Public RC 专用用例；
- Public artifact 未扩大，继续保持 34 entities / 41 relations / 0 blocker；
- Full Alpha Research 当前透明展示 1535 public blockers；review queue 为 1184 subjects，其中 1109 blocking。这些是 Alpha 研究审核状态，不是程序失败，也不代表 Public RC；
- production 当前仍是第三批之前的 `fb618c05 / 53e8b5d`。本批新增 payload 在 commit/push 后仍需单独、明确的 production 发布确认。

## 1. 批次目的

第三批不再只增加人物卡，而是补足四类当前网络缺口：

1. 孔门弟子与宋明以后儒学接受之间的早期师承桥；
2. 道教历史人物、上清传统、仙传人物与山岳接受地之间的身份分层；
3. 印度唯识人物与玄奘译学网络之间的前后传承；
4. 鸠摩罗什、鉴真、丘处机三条已有重要人物的跨区域路线。

## 2. 固定数量

本批冻结为：

- 人物：12；
- 事件：12；
- 地点：10；
- 路线：3；
- 新增关系：至少 69，最终精确数量由 authoring 完成后写入批次 verifier；
- 新增来源：至少 10 个来源记录，其中路线与坐标来源不得只依赖人物传记摘要。

完成后的预期最低总量：

- 人物：152；
- 事件：157；
- 地点：90；
- 路线：7；
- 关系：至少 716；
- 编译实体：至少 465。

> 注：当前人物总量为 140，因此本批完成后应为 152，不在本批中顺手加入第 13 位人物。

## 3. 冻结人物清单

### 3.1 儒家与经典师承（4）

| slug | 人物 | 主要闭环 | 身份边界 |
|---|---|---|---|
| `yan-hui` | 颜回 | 曲阜孔门学习事件、孔子关系、早期儒家接受 | 历史人物；年代以传统与早期文献范围表达 |
| `zengzi` | 曾子 | 曲阜师承与经典传述、孔子/子思关系 | 历史人物；不把后世《孝经》完整文本直接等同本人定稿 |
| `zisi` | 子思 | 《中庸》传承语境、曾子/孟子接受关系 | 历史人物；文本归属与后世学派谱系分层 |
| `wang-fuzhi` | 王夫之 | 衡阳—船山写作、张载/王阳明等接受关系 | 历史人物；思想影响不等同直接会面 |

### 3.2 道教历史、传统与仙传分层（4）

| slug | 人物 | 主要闭环 | 身份边界 |
|---|---|---|---|
| `ge-xuan` | 葛玄 | 江南道教传承、句容区域、葛洪接受关系 | 历史人物与后世仙传分层，年代保留争议 |
| `wei-huacun` | 魏华存 | 上清传统、茅山接受地、陶弘景后世整理 | 历史人物；上清降授叙事进入传统时间 |
| `lu-dongbin` | 吕洞宾 | 永乐宫记忆、全真接受、王重阳/丘处机网络 | `traditional_sage`；不生成伪历史旅行线 |
| `zhang-sanfeng` | 张三丰 | 武当山传统、内丹接受、吕洞宾后世谱系 | `traditional_sage`；多时期传说不压成单一精确生平 |

### 3.3 印度唯识与宋代禅宗（4）

| slug | 人物 | 主要闭环 | 身份边界 |
|---|---|---|---|
| `asanga` | 无著 | 犍陀罗/阿逾陀唯识形成、世亲与玄奘接受 | 历史人物；年代与活动地使用学术区间 |
| `vasubandhu` | 世亲 | 阿毗达磨—唯识转向、无著与玄奘接受 | 历史人物；不同传记年代和思想阶段分层 |
| `dahui-zonggao` | 大慧宗杲 | 看话禅、临济接受、宋代江南寺院网络 | 历史人物；法系关系不自动推断直接师承 |
| `hongzhi-zhengjue` | 宏智正觉 | 天童山、默照禅、曹洞接受网络 | 历史人物；“默照”标签与后世宗派概括保留来源语境 |

## 4. 冻结事件清单

每位新增人物对应一个可审计事件：

1. `yan-hui-qufu-disciple-circle`
2. `zengzi-classical-transmission`
3. `zisi-zhongyong-transmission`
4. `wang-fuzhi-chuanshan-writing`
5. `ge-xuan-jiangnan-daoist-memory`
6. `wei-huacun-shangqing-transmission`
7. `lu-dongbin-yongle-quanzhen-reception`
8. `zhang-sanfeng-wudang-tradition`
9. `asanga-yogacara-formation`
10. `vasubandhu-abhidharma-yogacara`
11. `dahui-kanhua-chan`
12. `hongzhi-silent-illumination`

事件必须明确 `eventKind`、`historicity`、`eventScope`、时间断言和来源。传统降授、仙传、法系与后世记忆事件不得使用 `documented / direct` 语义。

## 5. 冻结地点清单

| slug | 地点 | 尺度 |
|---|---|---|
| `hengyang` | 衡阳 | 城市尺度；王夫之区域入口 |
| `jurong` | 句容 | 城市/区域尺度；葛玄江南传统入口 |
| `ruicheng-yongle` | 芮城—永乐宫区域 | 后世记忆与全真接受地 |
| `wudang-mountains` | 武当山 | 山岳文化景观与传统关联 |
| `gandhara-peshawar` | 犍陀罗—白沙瓦区域 | 古代区域代理锚点，不等同单一古城址 |
| `ayodhya` | 阿逾陀 | 城市/区域尺度的印度佛教学习入口 |
| `ningbo` | 宁波 | 宋代禅宗与鉴真东渡的区域港口入口 |
| `tiantong-mountain` | 天童山 | 山岳/寺院文化景观尺度 |
| `nara` | 奈良 | 鉴真在日本的制度与寺院接受入口 |
| `samarkand` | 撒马尔罕 | 丘处机西行的中亚区域锚点 |

坐标规则：

- `gandhara-peshawar` 只能作为区域代理点；
- `ruicheng-yongle` 表达后世记忆，不反推吕洞宾历史到访；
- `wudang-mountains` 表达张三丰传统关联，不伪造生平轨迹；
- `ningbo` 与 `nara` 用于鉴真路线的区域锚点，不绘制逐日海路；
- `samarkand` 只表达西行记录中的区域节点，不补全未核路线段。

## 6. 冻结路线清单

### 6.1 `kumarajiva-kucha-changan-corridor`

- 人物：既有 `figure:kumarajiva`；
- 节点：`qiuci → guzang → changan`；
- 时间：约 384–401；
- 类型：译经与强制迁徙背景下的跨区域知识路线；
- 证据：人物传记、译经史与历史地理；
- 边界：不把区域锚点连线解释成逐日道路。

### 6.2 `jianzhen-eastward-transmission-route`

- 人物：既有 `figure:jian-zhen`；
- 节点：`yangzhou → ningbo → nara`；
- 时间：约 742–754；
- 类型：戒律与制度传播路线；
- 证据：鉴真传记、扬州/日本寺院与文化遗产资料；
- 边界：多次失败航行与最终成功东渡不得压成一次直线航程。

### 6.3 `qiu-chuji-western-journey-route`

- 人物：既有 `figure:qiu-chuji`；
- 节点：`ninghai → beijing → samarkand`；
- 时间：约 1220–1224；
- 类型：全真道人西行与政治会见路线；
- 证据：《长春真人西游记》及历史地理；
- 边界：北京仅作为燕京区域锚点；中间草原和中亚路段保留 reconstructed corridor 语义。

## 7. 关系最低闭环

每位新增人物至少：

1. `figure → participated_in → batch event`；
2. `event → occurred_at → place`；
3. 一条 `active_in`、`remembered_in`、`born_in` 或其他受控空间关系；
4. 至少一条与现有 140 人物之一的关系；
5. 至少一条时间断言和一个非 editorial 外部来源。

批次另外至少：

- 6 条新增人物之间的互动/传承关系；
- 3 条既有人物 → 新路线的 `travelled_through`；
- 每条路线至少 3 条 `route_connects`；
- `received_by` 保持“较早来源人物 → 较晚接受人物”的端点方向；
- 传统人物不得出现伪 `born_in` 或伪精确现实路线；
- 事件地点只通过 `participated_in → occurred_at` 形成地图投影。

最低关系计数：

```text
12 figure→event
12 event→place
12 figure→place
12 new→existing figure
 6 new↔new figure
 3 figure→route
 9 route→place
=66
```

另要求至少 3 条文本/制度/接受语境关系，因此总下限为 **69**。

## 8. 来源与审核门禁

- 儒家早期人物：早期经典、正史/传记与现代学术参考分层；
- 王夫之：人物文集/学术史与衡阳地方遗产地理分开；
- 道教人物：历史传记、道藏/仙传与后世宫观记忆分开；
- 印度佛教人物：学术参考、汉译传记与玄奘接受史分开；
- 宋代禅宗：CBETA/灯录、语录与寺院地理分开；
- Nara、Wudang、Samarkand 等遗产地点优先使用机构或 UNESCO 入口；
- 每个 temporal assertion 的 `sourceId` 必须同时出现在对应对象或关系的 `sourceIds`；
- topic-level 来源允许进入 Preview，但不得误标 `precise`；
- 本批仍为 `publicationState=preview`，不自动进入 Public RC。

## 9. 执行顺序

1. 建立至少 10 个来源记录；
2. 创建 10 个地点并核对坐标尺度；
3. 创建 12 人物与 12 事件；
4. 创建 3 条路线；
5. 一次性补齐 canonical relations；
6. 新增 `verify:third-batch`，硬性检查数量、关系闭包、路线节点、来源和身份边界；
7. 更新 Alpha matrix 精确总量；
8. 运行 `npm run check` 与 Full Alpha Playwright/axe；
9. 完成独立 handoff、commit、push；production 部署继续需要明确发布确认。

## 10. 暂停条件

出现以下情况时仅暂停争议条目，不扩大候选池：

- 历史人物与神格/仙传身份需要拆成两个节点；
- 地点只能支持地方传统，无法支持本人活动；
- 路线节点无法从来源区分“经过、停留、后世纪念”；
- 人物关系只能证明后世接受，不能证明直接会面或师承；
- 同名、异名、法号或梵文转写无法稳定归一。
