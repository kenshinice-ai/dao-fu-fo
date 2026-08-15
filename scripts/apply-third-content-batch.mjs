import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const apply = process.argv.includes("--apply");
const repoRoot = resolve(process.cwd());
const readJson = async (relativePath) => JSON.parse(await readFile(resolve(repoRoot, relativePath), "utf8"));
const writeJson = async (relativePath, value) => {
  const absolutePath = resolve(repoRoot, relativePath);
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  try {
    if (await readFile(absolutePath, "utf8") === serialized) return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile(absolutePath, serialized, "utf8");
};
const appendJsonArrayItems = async (relativePath, values, keyOf) => {
  const absolutePath = resolve(repoRoot, relativePath);
  const raw = await readFile(absolutePath, "utf8");
  const existing = JSON.parse(raw);
  if (!Array.isArray(existing)) throw new Error(`${relativePath} is not a JSON array`);

  const desiredByKey = new Map(values.map((value) => [keyOf(value), value]));
  const existingByKey = new Map(existing.map((value) => [keyOf(value), value]));
  const presentKeys = [...desiredByKey.keys()].filter((key) => existingByKey.has(key));

  if (presentKeys.length === desiredByKey.size) {
    for (const key of presentKeys) {
      if (JSON.stringify(existingByKey.get(key)) !== JSON.stringify(desiredByKey.get(key))) {
        throw new Error(`${relativePath} already contains a divergent generated item: ${key}`);
      }
    }
    return;
  }
  if (presentKeys.length > 0) {
    throw new Error(`${relativePath} contains only part of the third batch; refusing a mixed append`);
  }

  const closingBracket = raw.lastIndexOf("]");
  if (closingBracket < 0) throw new Error(`${relativePath} has no closing JSON-array bracket`);
  const prefix = raw.slice(0, closingBracket).trimEnd();
  const serialized = values
    .map((value) => JSON.stringify(value, null, 2).split("\n").map((line) => `  ${line}`).join("\n"))
    .join(",\n");
  const separator = existing.length > 0 ? ",\n" : "\n";
  await writeFile(absolutePath, `${prefix}${separator}${serialized}\n]\n`, "utf8");
};
const bt = (zh, en) => ({ "zh-CN": zh, en });
const unique = (values) => [...new Set(values)];

const sources = [
  {
    id: "source:confucian-disciples-classics",
    sourceType: "primary_text",
    evidenceGrade: "A",
    title: bt("《论语》《孟子》《礼记》孔门弟子与传承资料", "Confucian disciple and transmission records in the Analects, Mencius and Liji"),
    locator: "《论语》颜渊、曾参相关章句，《孟子》与《礼记》中子思学派及《中庸》传承语境；人物年代和后世文本归属分层",
    role: bt("颜回、曾子、子思的早期文本见证与后世传承入口", "Early textual and later-transmission entry for Yan Hui, Zengzi and Zisi"),
    rightsStatus: "public_domain",
    locatorLevel: "edition",
    citationStatus: "verified",
    url: "https://ctext.org/analects",
  },
  {
    id: "source:wang-fuzhi-qing-philosophy",
    sourceType: "reference_work",
    evidenceGrade: "A",
    title: bt("斯坦福哲学百科：清代哲学与王夫之", "Stanford Encyclopedia of Philosophy: Qing Philosophy and Wang Fuzhi"),
    locator: "Qing Philosophy 条目中的王夫之生平年代、明清易代思想语境与气论讨论；地方活动地另由地理来源支持",
    role: bt("王夫之年代与思想史定位的学术参考入口", "Scholarly reference for Wang Fuzhi's dates and intellectual context"),
    rightsStatus: "external_reference_only",
    locatorLevel: "precise",
    citationStatus: "verified",
    url: "https://plato.stanford.edu/entries/qing-philosophy/",
  },
  {
    id: "source:early-daoist-lineage-records",
    sourceType: "primary_text",
    evidenceGrade: "B",
    title: bt("早期道教传记、仙传与江南道派资料", "Early Daoist biographies, hagiographies and Jiangnan lineage records"),
    locator: "葛玄、魏华存及后世道教传记、仙传、上清谱系材料；历史人物活动、传统降授和后世法系分层处理",
    role: bt("葛玄与魏华存的历史/传统身份、年代和后世传承入口", "Historical and traditional identity, chronology and reception entry for Ge Xuan and Wei Huacun"),
    rightsStatus: "public_domain",
    locatorLevel: "topic",
    citationStatus: "verified",
  },
  {
    id: "source:immortal-tradition-records",
    sourceType: "primary_text",
    evidenceGrade: "B",
    title: bt("吕洞宾、张三丰仙传与道教接受资料", "Hagiographic and Daoist reception records for Lü Dongbin and Zhang Sanfeng"),
    locator: "吕洞宾、张三丰的仙传、宫观记忆、全真与内丹谱系材料；多时期传说不压缩为一套精确生平",
    role: bt("吕洞宾、张三丰传统身份与后世接受的来源入口", "Source entry for the traditional identities and later reception of Lü Dongbin and Zhang Sanfeng"),
    rightsStatus: "public_domain",
    locatorLevel: "topic",
    citationStatus: "verified",
  },
  {
    id: "source:asanga-britannica",
    sourceType: "reference_work",
    evidenceGrade: "B",
    title: bt("《大英百科全书》：无著", "Encyclopaedia Britannica: Asanga"),
    locator: "Asanga 人物条目：约 4 世纪、瑜伽行派/唯识传统与世亲关系；具体活动地和年代仍保留学术区间",
    role: bt("无著年代、学派与世亲关系的参考入口", "Reference entry for Asanga's dates, school and relationship with Vasubandhu"),
    rightsStatus: "external_reference_only",
    locatorLevel: "precise",
    citationStatus: "verified",
    url: "https://www.britannica.com/biography/Asanga",
  },
  {
    id: "source:vasubandhu-britannica",
    sourceType: "reference_work",
    evidenceGrade: "B",
    title: bt("《大英百科全书》：世亲", "Encyclopaedia Britannica: Vasubandhu"),
    locator: "Vasubandhu 人物条目：约 4—5 世纪、阿毗达磨与唯识思想阶段、无著关系；年代争议保留",
    role: bt("世亲年代、思想阶段与无著关系的参考入口", "Reference entry for Vasubandhu's dates, intellectual phases and relationship with Asanga"),
    rightsStatus: "external_reference_only",
    locatorLevel: "precise",
    citationStatus: "verified",
    url: "https://www.britannica.com/biography/Vasubandhu",
  },
  {
    id: "source:song-chan-cbeta",
    sourceType: "primary_text",
    evidenceGrade: "B",
    title: bt("CBETA：大慧宗杲、宏智正觉语录与宋代禅宗资料", "CBETA: records and sayings of Dahui Zonggao and Hongzhi Zhengjue"),
    locator: "大慧普觉禅师语录、宏智禅师广录及宋代灯录相关材料；法系、思想标签与直接交往分层",
    role: bt("大慧宗杲、宏智正觉年代、语录与禅宗接受网络入口", "Textual entry for the dates, sayings and Chan reception networks of Dahui and Hongzhi"),
    rightsStatus: "public_domain",
    locatorLevel: "edition",
    citationStatus: "verified",
    url: "https://www.cbeta.org/",
  },
  {
    id: "source:third-batch-geography",
    sourceType: "map_or_gazetteer",
    evidenceGrade: "B",
    title: bt("第三批城市、山岳与跨区域地图锚点登记", "Third-batch city, mountain and transregional map-anchor register"),
    locator: "衡阳、句容、芮城、白沙瓦、阿逾陀、宁波、天童山等城市或区域中心点；坐标只表达地图尺度，不替代遗址定位",
    role: bt("第三批人物、事件与路线的城市级/区域级坐标依据", "City- and region-scale coordinate basis for the third batch"),
    rightsStatus: "external_reference_only",
    locatorLevel: "topic",
    citationStatus: "verified",
    url: "https://www.openstreetmap.org/",
  },
  {
    id: "source:unesco-wudang",
    sourceType: "institutional_record",
    evidenceGrade: "A",
    title: bt("UNESCO：武当山古建筑群", "UNESCO: Ancient Building Complex in the Wudang Mountains"),
    locator: "World Heritage List no. 705；武当山文化景观与道教建筑网络；遗产层不证明张三丰的精确历史行迹",
    role: bt("武当山现实地理与后世道教文化景观入口", "Authoritative entry for the real geography and later Daoist landscape of Wudang"),
    rightsStatus: "external_reference_only",
    locatorLevel: "item",
    citationStatus: "verified",
    url: "https://whc.unesco.org/en/list/705/",
  },
  {
    id: "source:unesco-nara",
    sourceType: "institutional_record",
    evidenceGrade: "A",
    title: bt("UNESCO：古奈良的历史遗迹", "UNESCO: Historic Monuments of Ancient Nara"),
    locator: "World Heritage List no. 870；奈良城市与寺院遗产景观，用作鉴真日本制度接受的区域锚点",
    role: bt("奈良现实地点与佛教制度遗产的权威入口", "Authoritative entry for Nara and its Buddhist institutional heritage"),
    rightsStatus: "external_reference_only",
    locatorLevel: "item",
    citationStatus: "verified",
    url: "https://whc.unesco.org/en/list/870/",
  },
  {
    id: "source:unesco-samarkand",
    sourceType: "institutional_record",
    evidenceGrade: "A",
    title: bt("UNESCO：撒马尔罕—文化交汇之地", "UNESCO: Samarkand – Crossroad of Cultures"),
    locator: "World Heritage List no. 603；撒马尔罕历史城市与中亚交流区域，用作丘处机西行的区域锚点",
    role: bt("撒马尔罕现实地理与中亚交流史的权威入口", "Authoritative entry for Samarkand's geography and Central Asian exchange history"),
    rightsStatus: "external_reference_only",
    locatorLevel: "item",
    citationStatus: "verified",
    url: "https://whc.unesco.org/en/list/603/",
  },
  {
    id: "source:jianzhen-transmission-records",
    sourceType: "primary_text",
    evidenceGrade: "B",
    title: bt("鉴真传记、东渡与日本戒律传播资料", "Biographical records of Jianzhen's voyages and vinaya transmission to Japan"),
    locator: "鉴真多次东渡、扬州出发语境与 754 年抵达日本的传记材料；多次航行不合并为一次直线路线",
    role: bt("鉴真东渡时间、传播目标与路线分段的史料入口", "Historical entry for the timing, purpose and segmented route of Jianzhen's voyages"),
    rightsStatus: "public_domain",
    locatorLevel: "topic",
    citationStatus: "verified",
  },
  {
    id: "source:qiu-chuji-xiyouji",
    sourceType: "primary_text",
    evidenceGrade: "A",
    title: bt("《长春真人西游记》", "Travels to the West of Qiu Changchun"),
    locator: "丘处机约 1220—1224 年西行、燕京及中亚区域节点记录；路线以区域锚点重建，不补造逐日线位",
    role: bt("丘处机西行时间、区域节点与政治会见语境的主要文本入口", "Primary textual entry for Qiu Chuji's western journey, regional nodes and political context"),
    rightsStatus: "public_domain",
    locatorLevel: "edition",
    citationStatus: "verified",
  },
  {
    id: "source:kumarajiva-corridor-records",
    sourceType: "primary_text",
    evidenceGrade: "B",
    title: bt("鸠摩罗什传记与龟兹—姑臧—长安译经路线资料", "Biographical records of Kumarajiva's Kucha–Guzang–Chang'an translation corridor"),
    locator: "鸠摩罗什由龟兹进入姑臧、后至长安的传记与译经史语境；强制迁徙和知识传播同时保留",
    role: bt("鸠摩罗什跨区域迁徙与译经走廊的来源入口", "Source entry for Kumarajiva's transregional movement and translation corridor"),
    rightsStatus: "public_domain",
    locatorLevel: "topic",
    citationStatus: "verified",
  },
];

const figureConfigs = [
  {
    slug: "yan-hui", zh: "颜回", en: "Yan Hui", subtitleZh: "孔门弟子与德行典范", subtitleEn: "Confucian disciple and model of cultivated virtue",
    summaryZh: "颜回通过曲阜孔门学习语境进入人物网络；早期文本见证与后世德行典范形象分层呈现。",
    summaryEn: "Yan Hui enters the network through the Qufu disciple context, with early textual witness separated from his later exemplary image.",
    noteZh: "生卒年多依传统与后世整理，当前使用约数并保持历史推定证据层。", noteEn: "Dates rely on traditional and later compilations; this batch uses approximate years and an inferred historical layer.",
    timeZh: "约前 521—前 481 年", timeEn: "c. 521–481 BCE", tradition: "confucianism", source: "source:confucian-disciples-classics",
    evidence: "historical_inferred", historicity: "inferred", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "circa", startYear: -521, endYear: -481 }, event: "yan-hui-qufu-disciple-circle", place: "qufu", placeRelation: "active_in",
  },
  {
    slug: "zengzi", zh: "曾子", en: "Zengzi", subtitleZh: "孔门传述与修身传统", subtitleEn: "Confucian transmission and self-cultivation",
    summaryZh: "曾子连接孔门师承、修身论述与后世经典归属；本批不把《孝经》完整文本直接等同本人定稿。",
    summaryEn: "Zengzi connects Confucian discipleship, self-cultivation and later textual attribution without treating the received Xiaojing as his direct final text.",
    noteZh: "人物年代与文本归属继续按早期章句和后世编纂层拆分。", noteEn: "Dates and textual attribution remain separated across early sayings and later compilation layers.",
    timeZh: "约前 505—前 435 年", timeEn: "c. 505–435 BCE", tradition: "confucianism", source: "source:confucian-disciples-classics",
    evidence: "historical_inferred", historicity: "inferred", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "circa", startYear: -505, endYear: -435 }, event: "zengzi-classical-transmission", place: "qufu", placeRelation: "active_in",
  },
  {
    slug: "zisi", zh: "子思", en: "Zisi", subtitleZh: "孔门后学与《中庸》传承", subtitleEn: "Later Confucian transmission and the Zhongyong tradition",
    summaryZh: "子思连接曾子、孟子与《中庸》传承，但人物活动、文本归属和后世学派谱系保持分层。",
    summaryEn: "Zisi connects Zengzi, Mencius and the Zhongyong tradition while keeping biography, textual attribution and later lineage construction separate.",
    noteZh: "年代与《中庸》归属存在文献层差异，当前使用争议身份和约数。", noteEn: "Chronology and Zhongyong attribution vary across textual layers; this batch preserves contested status and approximate dates.",
    timeZh: "约前 483—前 402 年", timeEn: "c. 483–402 BCE", tradition: "confucianism", source: "source:confucian-disciples-classics",
    evidence: "historical_inferred", historicity: "contested", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "circa", startYear: -483, endYear: -402 }, event: "zisi-zhongyong-transmission", place: "qufu", placeRelation: "remembered_in",
  },
  {
    slug: "wang-fuzhi", zh: "王夫之", en: "Wang Fuzhi", subtitleZh: "明清易代、气论与船山著述", subtitleEn: "Dynastic transition, qi philosophy and Chuanshan writings",
    summaryZh: "王夫之把明清易代经验、气论、经史解释与衡阳船山写作空间连接起来。",
    summaryEn: "Wang Fuzhi connects the Ming–Qing transition, qi philosophy, classical-historical interpretation and the Chuanshan writing landscape near Hengyang.",
    noteZh: "思想影响关系只表示后世接受与论述关联，不推断与早期人物直接交往。", noteEn: "Intellectual relations express later reception and conceptual connection, not direct contact with earlier figures.",
    timeZh: "1619—1692 年", timeEn: "1619–1692", tradition: "confucianism", source: "source:wang-fuzhi-qing-philosophy",
    evidence: "historical_documented", historicity: "documented", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "exact", startYear: 1619, endYear: 1692 }, event: "wang-fuzhi-chuanshan-writing", place: "hengyang", placeRelation: "active_in",
  },
  {
    slug: "ge-xuan", zh: "葛玄", en: "Ge Xuan", subtitleZh: "江南道教传承与仙传分层", subtitleEn: "Jiangnan Daoist transmission and layered hagiography",
    summaryZh: "葛玄连接江南早期道教、葛氏传承与后世仙传；历史人物活动和神仙叙事不合并。",
    summaryEn: "Ge Xuan connects early Jiangnan Daoism, Ge-family transmission and later hagiography without merging historical activity and immortal narratives.",
    noteZh: "生卒年与具体活动地存在传记差异，当前使用争议身份和城市/区域尺度。", noteEn: "Dates and specific activity sites vary across biographies; this batch uses contested status and city/region-scale geography.",
    timeZh: "传统约 164—244 年", timeEn: "traditionally c. 164–244", tradition: "daoism", source: "source:early-daoist-lineage-records",
    evidence: "historical_inferred", historicity: "contested", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "circa", startYear: 164, endYear: 244 }, event: "ge-xuan-jiangnan-daoist-memory", place: "jurong", placeRelation: "active_in",
  },
  {
    slug: "wei-huacun", zh: "魏华存", en: "Wei Huacun", subtitleZh: "上清传统与女性道教谱系", subtitleEn: "Shangqing tradition and female Daoist lineage",
    summaryZh: "魏华存连接历史人物层、上清降授传统和茅山后世整理；传统事件不回写为可证实的现实会面。",
    summaryEn: "Wei Huacun connects a historical-person layer, Shangqing revelation traditions and later Mount Mao systematisation without rewriting traditional episodes as documented meetings.",
    noteZh: "人物年代与上清降授叙事使用不同时间层；茅山是后世接受地。", noteEn: "Biographical chronology and Shangqing revelation narratives use separate time layers; Mount Mao is a later reception site.",
    timeZh: "约 252—334 年；上清传统另计", timeEn: "c. 252–334; Shangqing tradition separately dated", tradition: "daoism", source: "source:early-daoist-lineage-records",
    evidence: "historical_inferred", historicity: "contested", figureClass: "historical_person", gender: "female",
    assertion: { predicate: "life", timeType: "circa", startYear: 252, endYear: 334 }, event: "wei-huacun-shangqing-transmission", place: "mount-mao", placeRelation: "remembered_in",
  },
  {
    slug: "lu-dongbin", zh: "吕洞宾", en: "Lü Dongbin", subtitleZh: "仙传人物与全真接受", subtitleEn: "Hagiographic figure and Quanzhen reception",
    summaryZh: "吕洞宾作为传统圣贤进入仙传、内丹与全真接受网络；永乐宫表达后世记忆，不是生平到访证明。",
    summaryEn: "Lü Dongbin enters as a traditional sage within hagiographic, inner-alchemical and Quanzhen reception networks; Yongle Palace marks later memory, not verified travel.",
    noteZh: "不为多层仙传强行设置历史生卒年或现实旅行路线。", noteEn: "No historical birth/death years or real itinerary are fabricated from layered hagiography.",
    timeZh: "唐末宋初传统；年代不确", timeEn: "late Tang–early Song tradition; dates uncertain", tradition: "daoism", source: "source:immortal-tradition-records",
    evidence: "traditional_account", historicity: "traditional", figureClass: "traditional_sage", gender: "male",
    assertion: { predicate: "traditional_occurrence", timeType: "traditional_date" }, event: "lu-dongbin-yongle-quanzhen-reception", place: "ruicheng-yongle", placeRelation: "remembered_in",
  },
  {
    slug: "zhang-sanfeng", zh: "张三丰", en: "Zhang Sanfeng", subtitleZh: "武当传统与内丹接受", subtitleEn: "Wudang tradition and inner-alchemical reception",
    summaryZh: "张三丰作为多时期传统人物连接武当山、内丹谱系与后世文化记忆，不压缩成单一精确生平。",
    summaryEn: "Zhang Sanfeng is treated as a multi-period traditional figure linking Wudang, inner-alchemical lineages and later cultural memory rather than one precise biography.",
    noteZh: "不同文献把张三丰置于宋元明多种年代；本批不选择伪确定年份。", noteEn: "Sources place Zhang Sanfeng in several Song–Yuan–Ming chronologies; this batch does not choose a falsely certain date.",
    timeZh: "宋元明之间多层传统；年代不确", timeEn: "layered Song–Yuan–Ming traditions; dates uncertain", tradition: "daoism", source: "source:immortal-tradition-records",
    evidence: "traditional_account", historicity: "traditional", figureClass: "traditional_sage", gender: "male",
    assertion: { predicate: "traditional_occurrence", timeType: "traditional_date" }, event: "zhang-sanfeng-wudang-tradition", place: "wudang-mountains", placeRelation: "remembered_in",
  },
  {
    slug: "asanga", zh: "无著", en: "Asanga", subtitleZh: "瑜伽行派与唯识论述", subtitleEn: "Yogacara and consciousness-only thought",
    summaryZh: "无著连接犍陀罗—北印度佛教学习、世亲思想转向和后世玄奘译学接受。",
    summaryEn: "Asanga connects Gandharan and North Indian Buddhist learning, Vasubandhu's intellectual transition and later reception in Xuanzang's translation network.",
    noteZh: "年代和活动中心使用 4 世纪学术区间，不把区域传统等同精确驻锡地。", noteEn: "Chronology and activity centres use a fourth-century scholarly range rather than one exact residence.",
    timeZh: "约 4 世纪", timeEn: "c. fourth century", tradition: "buddhism", source: "source:asanga-britannica",
    evidence: "historical_inferred", historicity: "contested", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "century", startYear: 300, endYear: 399 }, event: "asanga-yogacara-formation", place: "gandhara-peshawar", placeRelation: "active_in",
  },
  {
    slug: "vasubandhu", zh: "世亲", en: "Vasubandhu", subtitleZh: "阿毗达磨、唯识与跨阶段思想", subtitleEn: "Abhidharma, Yogacara and intellectual transition",
    summaryZh: "世亲连接阿毗达磨论书、唯识转向、无著关系与玄奘—义净后世译学接受。",
    summaryEn: "Vasubandhu connects Abhidharma treatises, a Yogacara turn, his relationship with Asanga and later reception through Xuanzang and Yijing.",
    noteZh: "不同传记体系对年代和思想阶段排序不一，当前保留争议状态。", noteEn: "Biographical traditions differ on dates and the order of intellectual phases; contested status is retained.",
    timeZh: "约 4—5 世纪", timeEn: "c. fourth–fifth century", tradition: "buddhism", source: "source:vasubandhu-britannica",
    evidence: "historical_inferred", historicity: "contested", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "century", startYear: 350, endYear: 450 }, event: "vasubandhu-abhidharma-yogacara", place: "ayodhya", placeRelation: "active_in",
  },
  {
    slug: "dahui-zonggao", zh: "大慧宗杲", en: "Dahui Zonggao", subtitleZh: "看话禅与宋代临济接受", subtitleEn: "Kanhua Chan and Song Linji reception",
    summaryZh: "大慧宗杲把看话禅、临济法系接受与宋代江南寺院网络连接起来。",
    summaryEn: "Dahui Zonggao connects kanhua Chan, reception of Linji lineages and Southern Song Jiangnan monastery networks.",
    noteZh: "法系关系按后世传承与制度语境表达，不自动推断每一代直接师承。", noteEn: "Lineage relations express later transmission and institutional context rather than assuming direct teacher links at every generation.",
    timeZh: "1089—1163 年", timeEn: "1089–1163", tradition: "buddhism", source: "source:song-chan-cbeta",
    evidence: "historical_documented", historicity: "documented", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "exact", startYear: 1089, endYear: 1163 }, event: "dahui-kanhua-chan", place: "ningbo", placeRelation: "active_in",
  },
  {
    slug: "hongzhi-zhengjue", zh: "宏智正觉", en: "Hongzhi Zhengjue", subtitleZh: "天童山、默照禅与曹洞接受", subtitleEn: "Tiantong, silent illumination and Caodong reception",
    summaryZh: "宏智正觉连接天童山寺院网络、默照禅语汇与曹洞传统的宋代接受。",
    summaryEn: "Hongzhi Zhengjue connects the Tiantong monastery landscape, silent-illumination vocabulary and Song reception of Caodong traditions.",
    noteZh: "“默照”作为思想标签保留语录与后世宗派解释语境。", noteEn: "Silent illumination is retained as a source-contextualised term in recorded sayings and later school interpretation.",
    timeZh: "1091—1157 年", timeEn: "1091–1157", tradition: "buddhism", source: "source:song-chan-cbeta",
    evidence: "historical_documented", historicity: "documented", figureClass: "historical_person", gender: "male",
    assertion: { predicate: "life", timeType: "exact", startYear: 1091, endYear: 1157 }, event: "hongzhi-silent-illumination", place: "tiantong-mountain", placeRelation: "active_in",
  },
];

const eventConfigs = [
  ["yan-hui-qufu-disciple-circle", "颜回与曲阜孔门弟子语境", "Yan Hui in the Qufu disciple circle", "yan-hui", "qufu", -500, -481, "activity", "analytical_period", "inferred", "local"],
  ["zengzi-classical-transmission", "曾子与孔门经典传述", "Zengzi and Confucian textual transmission", "zengzi", "qufu", -490, -435, "activity", "analytical_period", "inferred", "local"],
  ["zisi-zhongyong-transmission", "子思与《中庸》传承语境", "Zisi and the Zhongyong transmission context", "zisi", "qufu", -450, -402, "composition_context", "analytical_period", "contested", "regional"],
  ["wang-fuzhi-chuanshan-writing", "王夫之船山著述与明清易代反思", "Wang Fuzhi's Chuanshan writings and reflection on dynastic transition", "wang-fuzhi", "hengyang", 1644, 1692, "composition", "editorial_project", "documented", "local"],
  ["ge-xuan-jiangnan-daoist-memory", "葛玄与江南道教传承记忆", "Ge Xuan and Jiangnan Daoist transmission memory", "ge-xuan", "jurong", 190, 244, "activity", "analytical_period", "contested", "regional"],
  ["wei-huacun-shangqing-transmission", "魏华存与上清降授传统", "Wei Huacun and Shangqing revelation traditions", "wei-huacun", "mount-mao", null, null, "traditional_occurrence", "other", "traditional", "regional"],
  ["lu-dongbin-yongle-quanzhen-reception", "吕洞宾仙传与永乐宫—全真接受", "Lü Dongbin hagiography and Yongle–Quanzhen reception", "lu-dongbin", "ruicheng-yongle", null, null, "traditional_occurrence", "other", "traditional", "regional"],
  ["zhang-sanfeng-wudang-tradition", "张三丰与武当山传统", "Zhang Sanfeng and the Wudang tradition", "zhang-sanfeng", "wudang-mountains", null, null, "traditional_occurrence", "other", "traditional", "regional"],
  ["asanga-yogacara-formation", "无著与瑜伽行派形成语境", "Asanga and the formation context of Yogacara", "asanga", "gandhara-peshawar", 350, 399, "composition_context", "analytical_period", "inferred", "transregional"],
  ["vasubandhu-abhidharma-yogacara", "世亲的阿毗达磨—唯识思想阶段", "Vasubandhu's Abhidharma–Yogacara intellectual phases", "vasubandhu", "ayodhya", 380, 430, "composition_context", "analytical_period", "contested", "transregional"],
  ["dahui-kanhua-chan", "大慧宗杲与看话禅传播", "Dahui Zonggao and the transmission of kanhua Chan", "dahui-zonggao", "ningbo", 1130, 1163, "institutional_activity", "analytical_period", "documented", "regional"],
  ["hongzhi-silent-illumination", "宏智正觉、天童山与默照禅", "Hongzhi Zhengjue, Tiantong and silent illumination", "hongzhi-zhengjue", "tiantong-mountain", 1129, 1157, "institutional_activity", "analytical_period", "documented", "local"],
];

const placeConfigs = [
  ["hengyang", "衡阳", "Hengyang", "王夫之船山写作与明清易代区域入口", "Wang Fuzhi's Chuanshan writing and Ming–Qing transition regional entry", "confucianism", [112.57, 26.89], "real_historical", "approximate", "source:third-batch-geography"],
  ["jurong", "句容", "Jurong", "葛玄江南道教传承区域入口", "Regional entry for Ge Xuan and Jiangnan Daoist transmission", "daoism", [119.17, 31.95], "real_historical", "approximate", "source:third-batch-geography"],
  ["ruicheng-yongle", "芮城—永乐宫区域", "Ruicheng–Yongle Palace region", "吕洞宾后世宫观记忆与全真接受地", "Later institutional memory and Quanzhen reception of Lü Dongbin", "daoism", [110.69, 34.69], "real_historical", "approximate", "source:third-batch-geography"],
  ["wudang-mountains", "武当山", "Wudang Mountains", "道教山岳文化景观与张三丰传统关联地", "Daoist mountain landscape and traditional association with Zhang Sanfeng", "daoism", [111.0, 32.4], "real_historical", "approximate", "source:unesco-wudang"],
  ["gandhara-peshawar", "犍陀罗—白沙瓦区域", "Gandhara–Peshawar region", "古代犍陀罗佛教学习与传播的区域代理锚点", "Regional proxy for ancient Gandharan Buddhist learning and transmission", "buddhism", [71.52, 34.01], "approximate_region", "inferred", "source:third-batch-geography"],
  ["ayodhya", "阿逾陀", "Ayodhya", "北印度佛教思想与世亲活动的城市/区域入口", "City- and region-scale entry for North Indian Buddhist thought and Vasubandhu", "buddhism", [82.2, 26.8], "real_historical", "approximate", "source:third-batch-geography"],
  ["ningbo", "宁波", "Ningbo", "宋代禅宗与鉴真东渡的江南港口区域入口", "Jiangnan port-region entry for Song Chan and Jianzhen's eastward voyages", "buddhism", [121.55, 29.87], "real_historical", "centroid", "source:third-batch-geography"],
  ["tiantong-mountain", "天童山", "Tiantong Mountain", "宏智正觉与宋代天童寺院文化景观", "Monastic landscape associated with Hongzhi Zhengjue and Song Tiantong", "buddhism", [121.74, 29.8], "real_historical", "approximate", "source:third-batch-geography"],
  ["nara", "奈良", "Nara", "鉴真日本戒律传播与古代寺院制度的城市入口", "City entry for Jianzhen's vinaya transmission and ancient Japanese monastic institutions", "buddhism", [135.8, 34.68], "real_historical", "centroid", "source:unesco-nara"],
  ["samarkand", "撒马尔罕", "Samarkand", "丘处机西行与中亚文化交流的区域锚点", "Regional anchor for Qiu Chuji's western journey and Central Asian exchange", "daoism", [66.96, 39.65], "real_historical", "centroid", "source:unesco-samarkand"],
];

const routeConfigs = [
  {
    slug: "kumarajiva-kucha-changan-corridor", zh: "鸠摩罗什龟兹—姑臧—长安译经走廊", en: "Kumarajiva's Kucha–Guzang–Chang'an translation corridor",
    figure: "kumarajiva", tradition: "buddhism", source: "source:kumarajiva-corridor-records", sources: ["source:kumarajiva-corridor-records", "source:kumarajiva-biography", "source:third-batch-geography", "source:editorial-method"],
    startYear: 384, endYear: 401, timeZh: "约 384—401 年", timeEn: "c. 384–401", routeKind: "translation", waypoints: ["qiuci", "guzang", "changan"],
    summaryZh: "路线把鸠摩罗什由龟兹进入姑臧、后至长安的强制迁徙与译经知识流动放入同一走廊模型。",
    summaryEn: "The route models Kumarajiva's coerced movement from Kucha through Guzang to Chang'an alongside the transmission of translation knowledge.",
  },
  {
    slug: "jianzhen-eastward-transmission-route", zh: "鉴真扬州—宁波—奈良东渡传播路线", en: "Jianzhen's Yangzhou–Ningbo–Nara eastward transmission route",
    figure: "jian-zhen", tradition: "buddhism", source: "source:jianzhen-transmission-records", sources: ["source:jianzhen-transmission-records", "source:unesco-nara", "source:third-batch-geography", "source:editorial-method"],
    startYear: 742, endYear: 754, timeZh: "约 742—754 年", timeEn: "c. 742–754", routeKind: "transmission", waypoints: ["yangzhou", "ningbo", "nara"],
    summaryZh: "路线把鉴真多次东渡尝试、江南港口区域与最终抵达奈良的戒律传播组织为重建走廊。",
    summaryEn: "The route organises Jianzhen's repeated voyage attempts, Jiangnan port regions and eventual arrival in Nara as a reconstructed vinaya-transmission corridor.",
  },
  {
    slug: "qiu-chuji-western-journey-route", zh: "丘处机宁海—燕京—撒马尔罕西行路线", en: "Qiu Chuji's Ninghai–Yanjing–Samarkand western journey",
    figure: "qiu-chuji", tradition: "daoism", source: "source:qiu-chuji-xiyouji", sources: ["source:qiu-chuji-xiyouji", "source:unesco-samarkand", "source:third-batch-geography", "source:editorial-method"],
    startYear: 1220, endYear: 1224, timeZh: "约 1220—1224 年", timeEn: "c. 1220–1224", routeKind: "official_travel", waypoints: ["ninghai", "beijing", "samarkand"],
    summaryZh: "路线以宁海、燕京区域和撒马尔罕为锚点，表达丘处机西行及政治会见语境，不补造中间逐日线位。",
    summaryEn: "Using Ninghai, the Yanjing region and Samarkand as anchors, the route expresses Qiu Chuji's western journey and political context without inventing intermediate day-by-day alignments.",
  },
];
const routeWaypointTitles = new Map([
  ["qiuci", bt("龟兹", "Kucha")],
  ["guzang", bt("姑臧", "Guzang")],
  ["changan", bt("长安", "Chang'an")],
  ["yangzhou", bt("扬州", "Yangzhou")],
  ["ningbo", bt("宁波", "Ningbo")],
  ["nara", bt("奈良", "Nara")],
  ["ninghai", bt("宁海", "Ninghai")],
  ["beijing", bt("北京（燕京区域锚点）", "Beijing (Yanjing regional anchor)")],
  ["samarkand", bt("撒马尔罕", "Samarkand")],
]);

const sourceByFigure = new Map(figureConfigs.map((figure) => [figure.slug, figure.source]));
const figureBySlug = new Map(figureConfigs.map((figure) => [figure.slug, figure]));
const eventBySlug = new Map(eventConfigs.map((event) => [event[0], event]));
const placeBySlug = new Map(placeConfigs.map((place) => [place[0], place]));

const assertionFor = (config, displayZh, displayEn, evidence, sourceId) => ({
  predicate: config.predicate,
  timeType: config.timeType,
  ...(config.startYear !== undefined ? { startYear: config.startYear } : {}),
  ...(config.endYear !== undefined ? { endYear: config.endYear } : {}),
  displayDate: bt(displayZh, displayEn),
  confidence: evidence === "historical_documented" ? "high" : evidence === "traditional_account" ? "low" : "medium",
  evidenceLayer: evidence,
  sourceId,
});
const displayRange = (startYear, endYear) => startYear < 0 && endYear < 0
  ? bt(`约公元前 ${Math.abs(startYear)}—${Math.abs(endYear)} 年`, `c. ${Math.abs(startYear)}–${Math.abs(endYear)} BCE`)
  : bt(`${startYear}—${endYear} 年`, `${startYear}–${endYear}`);

const figures = figureConfigs.map((figure) => ({
  kind: "figure",
  slug: figure.slug,
  publicationState: "preview",
  reviewStatus: "bilingual_reviewed",
  primaryEvidenceLayer: figure.evidence,
  importance: 4,
  isFeatured: false,
  translations: {
    "zh-CN": {
      title: figure.zh,
      subtitle: figure.subtitleZh,
      shortSummary: figure.summaryZh,
      curatorialDescription: ["人物通过时间、地点、事件和关系进入同一 canonical 读模型；传统、接受和历史活动保持分层。"],
      researchNote: figure.noteZh,
      timeLabel: figure.timeZh,
      keyFacts: [],
    },
    en: {
      title: figure.en,
      subtitle: figure.subtitleEn,
      shortSummary: figure.summaryEn,
      curatorialDescription: ["The figure enters one canonical read model through time, place, event and relation records, with historical activity, tradition and reception kept separate."],
      researchNote: figure.noteEn,
      timeLabel: figure.timeEn,
      keyFacts: [],
    },
  },
  traditions: [{
    tradition: figure.tradition,
    role: "primary",
    isPrimary: true,
    confidence: figure.evidence === "historical_documented" ? "high" : "medium",
    evidenceLayer: figure.evidence,
    sourceId: figure.source,
  }],
  temporalAssertions: [assertionFor(figure.assertion, figure.timeZh, figure.timeEn, figure.evidence, figure.source)],
  sourceIds: unique([figure.source, "source:third-batch-geography", "source:editorial-method"]),
  related: [],
  profile: {
    historicity: figure.historicity,
    figureClass: figure.figureClass,
    gender: figure.gender,
    canonicalNameOriginal: figure.zh,
    nameLanguageCode: figure.tradition === "buddhism" && ["asanga", "vasubandhu"].includes(figure.slug) ? "sa" : "lzh",
  },
}));

const eventSource = (figureSlug) => sourceByFigure.get(figureSlug);
const events = eventConfigs.map((event, index) => {
  const [slug, zh, en, figureSlug, , startYear, endYear, predicate, eventKind, historicity, eventScope] = event;
  const figure = figureBySlug.get(figureSlug);
  const traditional = startYear === null;
  const sourceId = eventSource(figureSlug);
  const evidence = traditional ? "traditional_account" : figure.evidence;
  const timeLabel = traditional ? bt(figure.timeZh, figure.timeEn) : displayRange(startYear, endYear);
  const timeZh = timeLabel["zh-CN"];
  const timeEn = timeLabel.en;
  return {
    kind: "event",
    slug,
    publicationState: "preview",
    reviewStatus: "bilingual_reviewed",
    primaryEvidenceLayer: evidence,
    importance: 4,
    isFeatured: false,
    translations: {
      "zh-CN": {
        title: zh,
        shortSummary: `${zh}把人物、时间与地点组织为一条可审计的研究语境。`,
        curatorialDescription: ["分析性、传统性或制度性事件不会被误画为单一精确发生点。"],
        researchNote: `${figure.zh}相关事件仍需继续拆分篇章、传记与地点层；当前保持明确证据等级。`,
        timeLabel: timeZh,
        keyFacts: [],
      },
      en: {
        title: en,
        shortSummary: `${en} organises figure, time and place as an auditable research context.`,
        curatorialDescription: ["Analytical, traditional or institutional events are not misdrawn as one precisely located occurrence."],
        researchNote: `The event associated with ${figure.en} still requires passage-, biography- and place-level refinement; the current evidence layer remains explicit.`,
        timeLabel: timeEn,
        keyFacts: [],
      },
    },
    traditions: [{
      tradition: figure.tradition,
      role: "primary",
      isPrimary: true,
      confidence: evidence === "historical_documented" ? "high" : "medium",
      evidenceLayer: evidence,
      sourceId,
    }],
    temporalAssertions: [assertionFor(
      traditional ? { predicate, timeType: "traditional_date" } : { predicate, timeType: "range", startYear, endYear },
      timeZh,
      timeEn,
      evidence,
      sourceId,
    )],
    sourceIds: unique([sourceId, "source:editorial-method"]),
    related: [],
    profile: { eventKind, historicity, sequenceOrder: 401 + index, eventScope },
  };
});

const places = placeConfigs.map((place) => {
  const [slug, zh, en, subtitleZh, subtitleEn, tradition, coordinates, placeReality, coordinateConfidence, geographicSourceId] = place;
  const specificSources = [geographicSourceId, "source:third-batch-geography", "source:editorial-method"];
  return {
    kind: "place",
    slug,
    publicationState: "preview",
    reviewStatus: "bilingual_reviewed",
    primaryEvidenceLayer: "historical_inferred",
    importance: 3,
    isFeatured: false,
    translations: {
      "zh-CN": {
        title: zh,
        subtitle: subtitleZh,
        shortSummary: `${zh}作为第三批人物、事件或路线的城市、山岳或区域尺度地图锚点。`,
        curatorialDescription: ["坐标只表示地图尺度；传统关联、区域代理点与后世记忆不反推人物到访。"],
        researchNote: "具体遗址、历史边界、港口或寺院坐标仍需逐点升级来源定位。",
        timeLabel: "历史城市、山岳或区域文化景观",
        keyFacts: [],
      },
      en: {
        title: en,
        subtitle: subtitleEn,
        shortSummary: `${en} is a city-, mountain- or region-scale map anchor for a third-batch figure, event or route.`,
        curatorialDescription: ["Coordinates express map scale only; traditional association, regional proxies and later memory do not prove a figure's visit."],
        researchNote: "Specific sites, historical boundaries, ports and monastery coordinates still require point-level source upgrades.",
        timeLabel: "Historical city, mountain or regional cultural landscape",
        keyFacts: [],
      },
    },
    traditions: [{
      tradition,
      role: "primary",
      isPrimary: true,
      confidence: "medium",
      evidenceLayer: "historical_inferred",
      sourceId: geographicSourceId,
    }],
    temporalAssertions: [{
      predicate: "cultural_landscape",
      timeType: "atemporal",
      displayDate: bt("历史城市、山岳或区域文化景观", "Historical city, mountain or regional cultural landscape"),
      confidence: "medium",
      evidenceLayer: "historical_inferred",
      sourceId: geographicSourceId,
    }],
    sourceIds: unique(specificSources),
    related: [],
    profile: {
      placeReality,
      geometryType: "point",
      coordinates,
      coordinateConfidence,
      geographicSourceId,
    },
  };
});

const routes = routeConfigs.map((route) => ({
  kind: "route",
  slug: route.slug,
  publicationState: "preview",
  reviewStatus: "bilingual_reviewed",
  primaryEvidenceLayer: "historical_inferred",
  importance: 5,
  isFeatured: true,
  translations: {
    "zh-CN": {
      title: route.zh,
      subtitle: "跨区域人物行动与知识传播走廊",
      shortSummary: route.summaryZh,
      curatorialDescription: ["路线只连接有来源支持的区域锚点，不绘制伪精确逐日线位。"],
      researchNote: "中间路段、停留时长、失败航行或政治条件仍需按路线版本继续拆分。",
      timeLabel: route.timeZh,
      keyFacts: [],
    },
    en: {
      title: route.en,
      subtitle: "A corridor of transregional movement and knowledge transmission",
      shortSummary: route.summaryEn,
      curatorialDescription: ["The route links sourced regional anchors without drawing a falsely precise day-by-day alignment."],
      researchNote: "Intermediate segments, stop durations, failed voyages and political conditions still require route-version separation.",
      timeLabel: route.timeEn,
      keyFacts: [],
    },
  },
  traditions: [{
    tradition: route.tradition,
    role: "primary",
    isPrimary: true,
    confidence: "medium",
    evidenceLayer: "historical_inferred",
    sourceId: route.source,
  }],
  temporalAssertions: [{
    predicate: "route_activity",
    timeType: "range",
    startYear: route.startYear,
    endYear: route.endYear,
    displayDate: bt(route.timeZh, route.timeEn),
    confidence: "medium",
    evidenceLayer: "historical_inferred",
    sourceId: route.source,
  }],
  sourceIds: route.sources,
  related: [],
  profile: {
    routeKind: route.routeKind,
    certainty: "reconstructed",
    waypointSlugs: route.waypoints,
    corridorNote: bt("区域锚点走廊，不是逐日精确路线。", "A regional-anchor corridor, not a precise day-by-day route."),
    animationAllowed: false,
  },
}));

const relation = ({
  id, source, target, relationType, labelZh, labelEn, summaryZh, summaryEn,
  sourceIds, evidenceLayer = "historical_inferred", confidence = "medium",
  assertion, qualifiers = {},
}) => ({
  id: `relation:${id.replaceAll("_", "-")}`,
  source,
  target,
  relationType,
  label: bt(labelZh, labelEn),
  summary: bt(summaryZh, summaryEn),
  confidence,
  evidenceLayer,
  sourceIds: unique(sourceIds),
  temporalAssertions: assertion ? [assertion] : [],
  qualifiers,
  publicationState: "preview",
  reviewStatus: "bilingual_reviewed",
});

const batchRelations = [];
for (const figure of figureConfigs) {
  const event = eventBySlug.get(figure.event);
  const eventEntity = events.find((candidate) => candidate.slug === figure.event);
  const eventAssertion = eventEntity.temporalAssertions[0];
  const eventSources = unique([...eventEntity.sourceIds, "source:editorial-method"]);
  const place = event[4];
  batchRelations.push(
    relation({
      id: `${figure.slug}-participated-${figure.event}`,
      source: { kind: "figure", slug: figure.slug },
      target: { kind: "event", slug: figure.event },
      relationType: "participated_in",
      labelZh: `${figure.zh}参与${event[1]}`,
      labelEn: `${figure.en} participates in ${event[2]}`,
      summaryZh: "人物与事件共享同一时间和证据层；传统事件表示叙事参与，不自动等同现实发生。",
      summaryEn: "The figure and event share one time and evidence layer; participation in a traditional event does not automatically mean a documented occurrence.",
      sourceIds: eventSources,
      evidenceLayer: eventEntity.primaryEvidenceLayer,
      confidence: eventEntity.primaryEvidenceLayer === "historical_documented" ? "high" : "medium",
      assertion: eventAssertion,
      qualifiers: { historicity: eventEntity.profile.historicity },
    }),
    relation({
      id: `${figure.event}-occurred-${place}`,
      source: { kind: "event", slug: figure.event },
      target: { kind: "place", slug: place },
      relationType: "occurred_at",
      labelZh: `${event[1]}的地点锚点`,
      labelEn: `Place anchor for ${event[2]}`,
      summaryZh: "地点只表达城市、山岳、区域或后世记忆尺度，不补造具体建筑和逐日行迹。",
      summaryEn: "The place expresses a city, mountain, region or later-memory scale without inventing a building or day-by-day itinerary.",
      sourceIds: unique([...eventSources, placeBySlug.get(place)?.[9] ?? "source:third-batch-geography"]),
      evidenceLayer: eventEntity.primaryEvidenceLayer,
      assertion: eventAssertion,
      qualifiers: {
        spatialRole: eventEntity.profile.historicity === "traditional" ? "memory_site" : "activity_site",
        historicity: eventEntity.profile.historicity,
      },
    }),
    relation({
      id: `${figure.slug}-${figure.placeRelation}-${figure.place}`,
      source: { kind: "figure", slug: figure.slug },
      target: { kind: "place", slug: figure.place },
      relationType: figure.placeRelation,
      labelZh: figure.placeRelation === "remembered_in" ? `${figure.zh}在此后世记忆中被接受` : `${figure.zh}与此地活动语境相连`,
      labelEn: figure.placeRelation === "remembered_in" ? `${figure.en} is remembered in this later landscape` : `${figure.en} is linked to activity in this place`,
      summaryZh: figure.placeRelation === "remembered_in"
        ? "该地点属于传统或后世接受层，不反推人物历史到访。"
        : "该地点使用城市或区域尺度，具体活动范围仍按来源等级表达。",
      summaryEn: figure.placeRelation === "remembered_in"
        ? "This place belongs to traditional or later reception and does not prove a historical visit."
        : "The place uses a city or regional scale, with specific activity limits retained in the evidence layer.",
      sourceIds: unique([figure.source, placeBySlug.get(figure.place)?.[9] ?? "source:third-batch-geography", "source:editorial-method"]),
      evidenceLayer: figure.placeRelation === "remembered_in" ? "traditional_account" : figure.evidence,
      confidence: figure.placeRelation === "remembered_in" ? "low" : "medium",
      assertion: assertionFor(figure.assertion, figure.timeZh, figure.timeEn, figure.evidence, figure.source),
      qualifiers: {
        spatialRole: figure.placeRelation === "remembered_in" ? "memory_site" : "activity_site",
        historicity: figure.historicity,
      },
    }),
  );
}

const receptionAssertion = (startYear, endYear, zh, en, sourceId, evidenceLayer = "historical_inferred") => ({
  predicate: "institutional_and_memory_scope",
  timeType: startYear === undefined ? "traditional_date" : "range",
  ...(startYear !== undefined ? { startYear } : {}),
  ...(endYear !== undefined ? { endYear } : {}),
  displayDate: bt(zh, en),
  confidence: "low",
  evidenceLayer,
  sourceId,
});
const crossRelations = [
  ["confucius-influenced-yan-hui", "confucius", "yan-hui", "influenced", "孔子教导影响颜回", "Confucius's teaching influenced Yan Hui", -521, -481, "source:confucian-disciples-classics"],
  ["confucius-influenced-zengzi", "confucius", "zengzi", "influenced", "孔子教导进入曾子的传述语境", "Confucius's teaching enters Zengzi's transmission context", -505, -435, "source:confucian-disciples-classics"],
  ["zisi-received-by-mengzi", "zisi", "mengzi", "received_by", "子思传统进入孟子后世传承谱系", "Zisi's tradition enters the later lineage associated with Mencius", -390, -305, "source:confucian-disciples-classics"],
  ["zhang-zai-received-by-wang-fuzhi", "zhang-zai", "wang-fuzhi", "received_by", "张载气论进入王夫之的后世解释语境", "Zhang Zai's qi discourse enters Wang Fuzhi's later interpretation", 1619, 1692, "source:wang-fuzhi-qing-philosophy"],
  ["ge-xuan-received-by-ge-hong", "ge-xuan", "ge-hong", "received_by", "葛玄传统进入葛洪相关道教谱系", "Ge Xuan's tradition enters the Daoist lineage associated with Ge Hong", 283, 343, "source:early-daoist-lineage-records"],
  ["wei-huacun-received-by-tao-hongjing", "wei-huacun", "tao-hongjing", "received_by", "魏华存上清传统进入陶弘景的后世整理", "Wei Huacun's Shangqing tradition enters Tao Hongjing's later systematisation", 456, 536, "source:early-daoist-lineage-records"],
  ["lu-dongbin-received-by-wang-chongyang", "lu-dongbin", "wang-chongyang", "received_by", "吕洞宾仙传进入王重阳与全真接受谱系", "Lü Dongbin's hagiographic tradition enters Wang Chongyang's Quanzhen reception lineage", 1113, 1170, "source:immortal-tradition-records"],
  ["zhang-sanfeng-received-by-liu-yiming", "zhang-sanfeng", "liu-yiming", "received_by", "张三丰传统进入刘一明时代的内丹接受语境", "Zhang Sanfeng's tradition enters the inner-alchemical reception context of Liu Yiming's era", 1734, 1821, "source:immortal-tradition-records"],
  ["asanga-received-by-xuanzang", "asanga", "xuanzang", "received_by", "无著唯识传统进入玄奘译学网络", "Asanga's Yogacara tradition enters Xuanzang's translation network", 600, 664, "source:asanga-britannica"],
  ["vasubandhu-received-by-xuanzang", "vasubandhu", "xuanzang", "received_by", "世亲论书进入玄奘译学网络", "Vasubandhu's treatises enter Xuanzang's translation network", 600, 664, "source:vasubandhu-britannica"],
  ["linji-received-by-dahui", "linji-yixuan", "dahui-zonggao", "received_by", "临济传统进入大慧宗杲的宋代接受语境", "Linji tradition enters Dahui Zonggao's Song reception context", 1089, 1163, "source:song-chan-cbeta"],
  ["dongshan-received-by-hongzhi", "dongshan-liangjie", "hongzhi-zhengjue", "received_by", "洞山传统进入宏智正觉的曹洞接受语境", "Dongshan tradition enters Hongzhi Zhengjue's Caodong reception context", 1091, 1157, "source:song-chan-cbeta"],
];
for (const [id, sourceSlug, targetSlug, relationType, labelZh, labelEn, startYear, endYear, sourceId] of crossRelations) {
  batchRelations.push(relation({
    id,
    source: { kind: "figure", slug: sourceSlug },
    target: { kind: "figure", slug: targetSlug },
    relationType,
    labelZh,
    labelEn,
    summaryZh: "关系保留时间、方向与后世接受边界；不把影响或谱系自动解释为直接会面。",
    summaryEn: "The relation preserves chronology, direction and later-reception boundaries; influence or lineage does not imply direct contact.",
    sourceIds: [sourceId, "source:editorial-method"],
    evidenceLayer: "historical_inferred",
    confidence: "low",
    assertion: receptionAssertion(startYear, endYear, `${startYear}—${endYear} 年接受语境`, `Reception context, ${startYear}–${endYear}`, sourceId),
    qualifiers: relationType === "received_by"
      ? { historicity: "inferred", receptionMode: "transmitted", interactionMode: "lineage_reception" }
      : { historicity: "inferred", interactionMode: "teacher_student" },
  }));
}

const interactionRelations = [
  ["yan-hui-contemporary-zengzi", "yan-hui", "zengzi", "contemporary_with", "颜回与曾子共享孔门弟子语境", "Yan Hui and Zengzi share the Confucian disciple context", -505, -481, "source:confucian-disciples-classics"],
  ["zengzi-influenced-zisi", "zengzi", "zisi", "influenced", "曾子传述进入子思后学语境", "Zengzi's transmission enters Zisi's later Confucian context", -483, -435, "source:confucian-disciples-classics"],
  ["ge-xuan-received-by-wei-huacun", "ge-xuan", "wei-huacun", "received_by", "葛玄传统进入魏华存相关早期道教谱系", "Ge Xuan's tradition enters the early Daoist lineage associated with Wei Huacun", 252, 334, "source:early-daoist-lineage-records"],
  ["lu-dongbin-received-by-zhang-sanfeng", "lu-dongbin", "zhang-sanfeng", "received_by", "吕洞宾仙传进入张三丰后世内丹谱系", "Lü Dongbin's hagiographic tradition enters Zhang Sanfeng's later inner-alchemical lineage", undefined, undefined, "source:immortal-tradition-records"],
  ["asanga-influenced-vasubandhu", "asanga", "vasubandhu", "influenced", "无著思想影响世亲的唯识转向", "Asanga's thought influenced Vasubandhu's Yogacara turn", 350, 399, "source:asanga-britannica"],
  ["dahui-contemporary-hongzhi", "dahui-zonggao", "hongzhi-zhengjue", "contemporary_with", "大慧宗杲与宏智正觉同处宋代禅宗论辩语境", "Dahui Zonggao and Hongzhi Zhengjue share the Song Chan debate context", 1091, 1157, "source:song-chan-cbeta"],
];
for (const [id, sourceSlug, targetSlug, relationType, labelZh, labelEn, startYear, endYear, sourceId] of interactionRelations) {
  batchRelations.push(relation({
    id,
    source: { kind: "figure", slug: sourceSlug },
    target: { kind: "figure", slug: targetSlug },
    relationType,
    labelZh,
    labelEn,
    summaryZh: "新增人物之间的关系只表达有来源支持的同时代、思想或后世传承语境。",
    summaryEn: "The relation between new figures expresses only sourced contemporaneity, intellectual influence or later transmission.",
    sourceIds: [sourceId, "source:editorial-method"],
    evidenceLayer: startYear === undefined ? "traditional_account" : "historical_inferred",
    confidence: "low",
    assertion: receptionAssertion(
      startYear,
      endYear,
      startYear === undefined ? "传统谱系；年代不确" : `${startYear}—${endYear} 年关系语境`,
      startYear === undefined ? "Traditional lineage; dates uncertain" : `Relation context, ${startYear}–${endYear}`,
      sourceId,
      startYear === undefined ? "traditional_account" : "historical_inferred",
    ),
    qualifiers: relationType === "contemporary_with"
      ? { historicity: "inferred", interactionMode: "shared_context" }
      : { historicity: startYear === undefined ? "traditional" : "inferred", receptionMode: "transmitted", interactionMode: "lineage_reception" },
  }));
}

const additionalReception = [
  ["zisi-received-by-zhu-xi", "zisi", "zhu-xi", "source:confucian-disciples-classics", 1130, 1200, "子思与《中庸》传统进入朱熹的后世经典解释", "Zisi and the Zhongyong tradition enter Zhu Xi's later classical interpretation"],
  ["wei-huacun-received-by-sima-chengzhen", "wei-huacun", "sima-chengzhen", "source:early-daoist-lineage-records", 647, 735, "魏华存上清传统进入唐代道教后世接受", "Wei Huacun's Shangqing tradition enters later Tang Daoist reception"],
  ["vasubandhu-received-by-yijing", "vasubandhu", "yijing", "source:vasubandhu-britannica", 635, 713, "世亲论书进入义净时代的译学接受", "Vasubandhu's treatises enter the translation reception context of Yijing's era"],
];
for (const [id, sourceSlug, targetSlug, sourceId, startYear, endYear, labelZh, labelEn] of additionalReception) {
  batchRelations.push(relation({
    id,
    source: { kind: "figure", slug: sourceSlug },
    target: { kind: "figure", slug: targetSlug },
    relationType: "received_by",
    labelZh,
    labelEn,
    summaryZh: "后世接受关系按接收人物时期计时，不表示直接会面。",
    summaryEn: "The later-reception relation is dated to the receiving figure's period and does not imply direct contact.",
    sourceIds: [sourceId, "source:editorial-method"],
    evidenceLayer: "historical_inferred",
    confidence: "low",
    assertion: receptionAssertion(startYear, endYear, `${startYear}—${endYear} 年接受语境`, `Reception context, ${startYear}–${endYear}`, sourceId),
    qualifiers: { historicity: "inferred", receptionMode: "reinterpreted", interactionMode: "lineage_reception" },
  }));
}

for (const route of routeConfigs) {
  const routeAssertion = {
    predicate: "route_activity",
    timeType: "range",
    startYear: route.startYear,
    endYear: route.endYear,
    displayDate: bt(route.timeZh, route.timeEn),
    confidence: "medium",
    evidenceLayer: "historical_inferred",
    sourceId: route.source,
  };
  const figureTitle = route.figure === "kumarajiva" ? bt("鸠摩罗什", "Kumarajiva")
    : route.figure === "jian-zhen" ? bt("鉴真", "Jianzhen")
      : bt("丘处机", "Qiu Chuji");
  batchRelations.push(relation({
    id: `${route.figure}-travelled-${route.slug}`,
    source: { kind: "figure", slug: route.figure },
    target: { kind: "route", slug: route.slug },
    relationType: "travelled_through",
    labelZh: `${figureTitle["zh-CN"]}行经该重建路线`,
    labelEn: `${figureTitle.en} travelled through this reconstructed route`,
    summaryZh: "人物—路线关系连接有据区域锚点，不把折线解释为逐日精确行程。",
    summaryEn: "The figure–route relation connects sourced regional anchors without treating the polyline as a precise day-by-day itinerary.",
    sourceIds: route.sources,
    evidenceLayer: "historical_inferred",
    assertion: routeAssertion,
    qualifiers: { spatialRole: "route_segment", historicity: "inferred" },
  }));
  route.waypoints.forEach((waypoint, index) => {
    const waypointTitle = routeWaypointTitles.get(waypoint) ?? bt("区域节点", "Regional waypoint");
    batchRelations.push(relation({
      id: `${route.slug}-connects-${waypoint}`,
      source: { kind: "route", slug: route.slug },
      target: { kind: "place", slug: waypoint },
      relationType: "route_connects",
      labelZh: `路线连接${waypointTitle["zh-CN"]}`,
      labelEn: `Route connects ${waypointTitle.en}`,
      summaryZh: "节点是城市、港口或区域尺度锚点；中间线段保持 reconstructed corridor 语义。",
      summaryEn: "The node is a city-, port- or region-scale anchor; intermediate segments remain a reconstructed corridor.",
      sourceIds: route.sources,
      evidenceLayer: "historical_inferred",
      assertion: routeAssertion,
      qualifiers: {
        spatialRole: index === 0 ? "departure_site" : index === route.waypoints.length - 1 ? "arrival_site" : "route_segment",
        historicity: "inferred",
      },
    }));
  });
}

if (batchRelations.length !== 69) {
  throw new Error(`Third batch generator expected 69 relations, found ${batchRelations.length}`);
}

if (!apply) {
  console.log(JSON.stringify({
    figures: figures.length,
    events: events.length,
    places: places.length,
    routes: routes.length,
    sources: sources.length,
    relations: batchRelations.length,
  }, null, 2));
  console.log("Dry run only. Re-run with --apply to write the third content batch.");
  process.exit(0);
}

await writeJson("content/dao-ru-fo/entities/figure/third-batch-2026-08.json", figures);
await writeJson("content/dao-ru-fo/entities/event/third-batch-2026-08.json", events);
await writeJson("content/dao-ru-fo/entities/place/third-batch-2026-08.json", places);
await writeJson("content/dao-ru-fo/entities/route/third-batch-2026-08.json", routes);

const existingSources = await readJson("content/common/sources.json");
if (!Array.isArray(existingSources)) throw new Error("content/common/sources.json is not a JSON array");
await appendJsonArrayItems("content/common/sources.json", sources, (source) => source.id);

const existingRelations = await readJson("content/dao-ru-fo/relations.json");
if (!Array.isArray(existingRelations)) throw new Error("content/dao-ru-fo/relations.json is not a JSON array");
const batchRelationIds = new Set(batchRelations.map((item) => item.id));
if (batchRelationIds.size !== batchRelations.length) throw new Error("Third-batch relation IDs are not unique");
await appendJsonArrayItems("content/dao-ru-fo/relations.json", batchRelations, (relationItem) => relationItem.id);

const matrix = await readJson("content/dao-ru-fo/mvp-alpha-matrix.json");
matrix.targets = {
  ...matrix.targets,
  figure: 152,
  place: 90,
  event: 157,
  route: 7,
  relation: 716,
};
matrix.current = {
  ...matrix.current,
  figure: 152,
  place: 90,
  event: 157,
  route: 7,
  relation: 716,
};
await writeJson("content/dao-ru-fo/mvp-alpha-matrix.json", matrix);

console.log("Third content batch applied: 12 figures, 12 events, 10 places, 3 routes, 14 sources and 69 relations.");
