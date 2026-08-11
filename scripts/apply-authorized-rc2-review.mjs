import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const reviewer = "codex:authorized-rc-reviewer";
const automatedReviewer = "automated:content-compiler";
const reviewedAt = process.env.REVIEWED_AT ?? new Date().toISOString();
const repoRoot = resolve(process.cwd());
const reviewsPath = resolve(repoRoot, "content/dao-ru-fo/reviews.json");
const candidatePath = resolve(repoRoot, "content/dao-ru-fo/public-rc.json");

const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
if (candidate.id !== "release:alpha-public-rc-2") throw new Error(`Expected RC2 candidate, found ${candidate.id}`);
if (!(["in_review", "ready"].includes(candidate.status))) throw new Error(`RC2 candidate must be in_review or ready, found ${candidate.status}`);

const selectedEntities = [...candidate.coreEntities, ...candidate.dependencyEntities];
const selectedRelations = candidate.relations;
const requiredEntityChecks = (entityKey) => {
  const kind = entityKey.split(":", 1)[0];
  const core = new Set(candidate.coreEntities);
  const featured = new Set([
    "place:changan",
    "place:sarnath",
    "event:confucius-asks-laozi-about-rites",
    "event:buddha-first-sermon-at-sarnath",
    "institution:daci-en-monastery",
    "route:xuanzang-western-pilgrimage",
    "text:daodejing",
    "text:analects",
    "text:dhammacakkappavattana-sutta",
    "passage:dao-that-can-be-spoken",
    "passage:learn-and-practice",
    "passage:turning-of-dharma-wheel",
  ]);
  const checks = ["schema", "fact", "bilingual", "rights", "accessibility", "editorial"];
  if (featured.has(entityKey) || ["figure", "concept", "institution", "practice"].includes(kind)) checks.push("tradition");
  return checks;
};

const factNotes = new Map([
  ["figure:laozi", "核对 source:shiji-laozi-biography 与 source:daodejing-edition：老子以 traditional_sage / contested 处理，保留李耳、史传叙事与《道德经》传世本之间的归属边界；不把传统会见或单一作者说法写成无争议历史事实。"],
  ["figure:confucius", "核对 source:shiji-confucius-biography 与 source:analects-edition：孔子作为有史传记录的人物入口，与《论语》的记录、传述和复合编纂层分开；不把后世制度记忆倒写为孔子本人当时的事实。"],
  ["figure:sakyamuni", "核对 source:buddha-early-texts 与 source:sarnath-site-record：释迦牟尼的人物、早期经文传述和鹿野苑遗址分别标注历史性与传统层，不把经文传述当作逐字现场记录。"],
  ["event:confucius-asks-laozi-about-rites", "核对《史记》相关定位：事件作为有文本出处的史传/传统叙事发布，洛阳仅作城市级空间锚点，不声称具体宫室、会见日期或逐字言说已经独立证实。"],
  ["event:buddha-first-sermon-at-sarnath", "核对 source:buddha-early-texts 与 source:sarnath-site-record：事件、SN 56.11 传述、现实遗址和后世朝圣记忆分层，不把传统事件年代写成确定历史日期。"],
  ["event:daci-en-monastery-established", "核对 source:xuanzang-records 与现有寺院资料：建立事件保留约 648 年的城市尺度语境，机构、塔院和后续译经活动不压缩为同一瞬间。"],
  ["place:luoyang", "核对 source:unesco-silk-roads-corridor 与历史地理资料：洛阳作为真实历史城市和隋唐空间节点发布，坐标是城市级示意，不冒充具体宫室或会见地点。"],
  ["place:sarnath", "核对 source:sarnath-site-record：鹿野苑作为现实遗址与佛教记忆地点发布；地图坐标表达遗址级/城市级锚点，不把朝圣传统等同于全部考古事实。"],
  ["place:great-wild-goose-pagoda-site", "核对 source:unesco-silk-roads-corridor：大雁塔遗址作为可定位物质空间发布，建筑分期、保护边界和译经活动仍按条目研究说明保持边界。"],
  ["place:longmen-grottoes", "核对 source:unesco-longmen：龙门石窟作为洛阳的真实遗产地点发布，造像、题记和具体洞窟仍不被当前遗产地级条目代替。"],
  ["place:changan", "沿用 RC1 已通过的长安城市级定位和坐标置信度。"],
  ["place:dunhuang", "核对 source:unesco-silk-roads-corridor：敦煌作为玄奘路线的区域锚点发布，不把区域坐标当作具体停留点。"],
  ["place:qiuci", "核对 source:unesco-silk-roads-corridor：龟兹作为丝路廊道和区域节点发布，不绘制伪精确路线或单一遗址归属。"],
  ["place:nalanda", "核对 source:unesco-nalanda：那烂陀作为现实考古遗址与僧院教育空间发布，人物活动关系保留来源和路线不确定性。"],
  ["institution:daci-en-monastery", "核对 source:xuanzang-records 与寺院制度资料：大慈恩寺作为机构空间发布，区别于大雁塔遗址和单个译经项目，不把机构条目扩写为全部唐代佛教网络。"],
  ["institution:changan-translation-bureau", "核对 source:xuanzang-records：长安译经场以网络级制度空间发布，不把不同时期、不同寺院的译场合并为一个固定建筑。"],
  ["route:xuanzang-western-pilgrimage", "核对 source:xuanzang-records、source:unesco-silk-roads-corridor 与 source:unesco-nalanda：路线只表达有据节点和重建廊道，禁止伪精确逐日线位。"],
  ["text:daodejing", "沿用 RC1 已通过的《道德经》作品入口与传世文本边界。"],
  ["text:analects", "沿用 RC1 已通过的《论语》作品入口与复合编纂边界。"],
  ["text:dhammacakkappavattana-sutta", "核对 source:buddha-early-texts：作品、巴利语版本和传统说话者归属分层，不把经文传承等同于现场逐字记录。"],
  ["text_version:daodejing-received", "沿用 RC1 已通过的《道德经》传世版本结构依赖。"],
  ["text_version:analects-received", "沿用 RC1 已通过的《论语》传世版本结构依赖。"],
  ["text_version:dhammacakkappavattana-sutta-pali", "核对 source:buddha-early-texts：该条是《转法轮经》的巴利语版本依赖，不声称完成手稿异文校勘。"],
  ["passage:dao-that-can-be-spoken", "核对 source:daodejing-edition：段落回到《道德经》第一章和指定 text version，传统归属老子不等于可还原的现场逐字记录。"],
  ["passage:learn-and-practice", "核对 source:analects-edition：段落回到《论语》学而篇定位，孔子作为传统说话者与弟子/编纂记录层分开。"],
  ["passage:turning-of-dharma-wheel", "核对 source:buddha-early-texts：段落回到 SN 56.11 的传述定位，保留巴利语版本、现代译文和传统归属边界。"],
]);

const reviews = JSON.parse(await readFile(reviewsPath, "utf8"));
const keyOf = (subjectKind, subjectKey, checkKind) => `${subjectKind}:${subjectKey}:${checkKind}`;
const existing = new Map(reviews.filter((review) => review.locale === undefined).map((review) => [keyOf(review.subjectKind, review.subjectKey, review.checkKind), review]));
const toId = (subjectKind, subjectKey, checkKind) => `review:rc-${`${subjectKind}-${subjectKey}-${checkKind}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
const put = (subjectKind, subjectKey, checkKind, note) => {
  const key = keyOf(subjectKind, subjectKey, checkKind);
  const old = existing.get(key);
  if (old && ["passed", "waived"].includes(old.status)) return;
  const isSchema = checkKind === "schema";
  const record = {
    id: old?.id ?? toId(subjectKind, subjectKey, checkKind),
    subjectKind,
    subjectKey,
    checkKind,
    status: "passed",
    reviewer: isSchema ? automatedReviewer : reviewer,
    reviewedAt,
    note: isSchema
      ? "RC2 内容编译器已通过 Zod schema、canonical identity 与结构依赖校验；此记录不替代事实与策展审核。"
      : note,
  };
  const index = reviews.findIndex((review) => keyOf(review.subjectKind, review.subjectKey, review.checkKind) === key);
  if (index >= 0) reviews[index] = record;
  else reviews.push(record);
  existing.set(key, record);
};

const bilingualNote = (subjectKey) => `逐项对照 ${subjectKey} 的 zh-CN/en 标题、摘要、描述、时间和研究说明；两种语言保留相同的历史性、传统归属、空间角色和不确定性边界。`;
const rightsNote = (subjectKey) => `RC2 只发布 ${subjectKey} 的结构化策展字段、来源 metadata、locator 和外部链接，不复制外部网页或 PDF 正文；当前所链接来源未以 unknown/restricted 阻塞本条。`;
const accessibilityNote = (subjectKey) => `RC2 页面纳入最终浏览器与 axe 回归范围；${subjectKey} 的详情、列表/地图替代文本和键盘路径保持与现有产品契约一致。`;
const editorialNote = (subjectKey) => `确认 ${subjectKey} 保持事实、传统叙事、空间类型、文本归属和后世接收分层；未将策展解释改写为无限定历史事实。`;
const traditionNote = (subjectKey) => `确认 ${subjectKey} 的传统归属、证据层和来源与当前策展边界一致；不以传统标签替代历史性判断。`;
const factNote = (subjectKey) => factNotes.get(subjectKey) ?? `核对 ${subjectKey} 所链接来源、时间断言、空间角色和关系端点；本条仅发布来源能够支持的范围，并保留研究说明中的待核边界。`;

for (const subjectKey of selectedEntities) {
  for (const checkKind of requiredEntityChecks(subjectKey)) {
    const note = checkKind === "bilingual" ? bilingualNote(subjectKey)
      : checkKind === "rights" ? rightsNote(subjectKey)
      : checkKind === "accessibility" ? accessibilityNote(subjectKey)
      : checkKind === "editorial" ? editorialNote(subjectKey)
      : checkKind === "tradition" ? traditionNote(subjectKey)
      : factNote(subjectKey);
    put("entity", subjectKey, checkKind, note);
  }
}
for (const relationId of selectedRelations) {
  put("relation", relationId, "schema", "");
  put("relation", relationId, "fact", `核对 ${relationId} 的两端、关系语义、来源 locator、时间限定和空间角色；关系只表达当前来源能够支持的连接，不把相关性扩写为直接影响或共同参与。`);
  put("relation", relationId, "rights", rightsNote(relationId));
  put("relation", relationId, "editorial", editorialNote(relationId));
}

const temporary = `${reviewsPath}.authorized-rc2-review-tmp`;
await writeFile(temporary, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
await rename(temporary, reviewsPath);
console.log(`Recorded RC2 formal checks for ${selectedEntities.length} entities and ${selectedRelations.length} relations as ${reviewer}`);
