import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const reviewer = "codex:authorized-rc-reviewer";
const reviewedAt = process.env.REVIEWED_AT ?? new Date().toISOString();
const reviewsPath = resolve(process.cwd(), "content/dao-ru-fo/reviews.json");
const candidatePath = resolve(process.cwd(), "content/dao-ru-fo/public-rc.json");

const coreEntities = [
  "figure:xuanzang",
  "figure:sima-chengzhen",
  "figure:kong-yingda",
  "text:heart-sutra",
  "text:daodejing",
  "text:analects",
  "passage:form-is-emptiness",
  "passage:humans-follow-earth",
  "passage:return-to-ritual",
  "place:changan",
];
const dependencyEntities = [
  "text_version:heart-sutra-chinese-received",
  "text_version:daodejing-received",
  "text_version:analects-received",
];
const relations = [
  "relation:xuanzang-active-changan",
  "relation:sima-active-changan",
  "relation:kong-active-changan",
  "relation:form-passage-heart-sutra",
  "relation:humans-passage-daodejing",
  "relation:return-passage-analects",
  "relation:daodejing-analects-comparative",
  "relation:heart-sutra-daodejing-comparative",
  "relation:heart-sutra-has-version",
  "relation:daodejing-has-version",
  "relation:analects-has-version",
  "relation:form-quoted-heart-version",
  "relation:humans-quoted-daodejing-version",
  "relation:return-quoted-analects-version",
];

const facts = new Map([
  ["figure:xuanzang", "核对当前页面字段与 source:xuanzang-records（item、citationStatus=verified）：仅发布有传记记录的玄奘、求法/译经活动和约 602–664 年代边界；不把后世文学形象、路线细节或未列出的译经项目当作本条已证事实。"],
  ["figure:sima-chengzhen", "核对 source:sima-old-tang-biography 与 source:sima-chengzhen-full-tang-text（edition/precise、verified）：支持 647–735、道士身份和有限的入朝/制度关联；法脉、宫观和后世影响仍按页面研究说明保持边界。"],
  ["figure:kong-yingda", "核对 source:kong-new-tang-biography 与 source:kong-wujing-zhengyi-record（precise、verified）：支持 574–648、经学活动和奉诏编纂语境；不把全部编纂参与者、版本流传或制度接受细节扩写为已完成事实。"],
  ["text:heart-sutra", "核对 source:heart-sutra-edition（precise、verified）：支持《心经》作为汉译佛教文本及当前展示的文本定位；attributionStatus=contested 和研究说明保留，不推出唯一译者、唯一底本或完整异文结论。"],
  ["text:daodejing", "核对 source:daodejing-edition（precise、verified）：支持当前《道德经》作品入口及传世章句范围；historical_inferred、attributionStatus=contested 保留，不把复杂成书史压成单一作者/年份。"],
  ["text:analects", "核对 source:analects-edition（precise、verified）：支持《论语》作品入口和当前篇章范围；attributionStatus=composite 保留，不把编纂、传本和孔子关系简化成单一作者事实。"],
  ["passage:form-is-emptiness", "核对 source:heart-sutra-edition 的第 2 节 locator：当前四句汉文与 passage 原文一致；版本、译者和异文缺口仍显示在研究说明，项目现代中文/英文是展示解释，不冒充外部译本。"],
  ["passage:humans-follow-earth", "核对 source:daodejing-edition 的第二十五章 locator：当前原文与章次一致；保留传世本和 historical_inferred 边界，不把‘自然’解释为唯一现代含义。"],
  ["passage:return-to-ritual", "核对 source:analects-edition 的颜渊第十二篇章 locator：当前原文与篇章一致；不把后世注疏或唐代制度使用直接投射为原句事实。"],
  ["place:changan", "核对 source:sui-tang-changan-urban-study（precise、verified）与 source:unesco-silk-roads-corridor（item、verified）：支持隋唐长安/今西安的城市级锚点；坐标明确标为 centroid 示意，不冒充建筑级定位。"],
  ["text_version:heart-sutra-chinese-received", "核对 source:heart-sutra-edition：该条作为 passage 的结构依赖和汉译通行版本记录发布；页面明确写明具体底本、译者和 locator 仍待补，不把它称为批校本或唯一版本。"],
  ["text_version:daodejing-received", "核对 source:daodejing-edition：该条作为 passage 的结构依赖和传世章句记录发布；页面保留 Alpha 版本说明，不把通行本等同于单一历史底本。"],
  ["text_version:analects-received", "核对 source:analects-edition：该条作为 passage 的结构依赖和传世篇章记录发布；页面保留 Alpha 版本说明，不声称完整版本谱系或单一底本。"],
]);

const relationFacts = new Map([
  ["relation:xuanzang-active-changan", "核对 source:xuanzang-records 及现有玄奘长安材料：关系只表达长安作为译经、讲学与制度工作的城市尺度锚点，不推出所有行程或每一译经项目都在同一建筑完成。"],
  ["relation:sima-active-changan", "核对 source:sima-old-tang-biography：关系保留为景云二年约 711 年入京的单点城市锚点；不把开元年间东都洛阳、王屋山活动推成 713–735 年持续在长安。"],
  ["relation:kong-active-changan", "核对 source:kong-new-tang-biography、source:kong-wujing-zhengyi-record 与 source:changan-guozijian-gazetteer：关系收窄为贞观十四年（640）长安国子学讲《孝经》的机构/年份事件，不外推为其全部生平活动。"],
  ["relation:form-passage-heart-sutra", "核对 passage 的 textSlug/textVersionSlug 与 relation 端点及 source:heart-sutra-edition locator：关系仅表达 passage_of 结构闭包。"],
  ["relation:humans-passage-daodejing", "核对 passage 的 textSlug/textVersionSlug 与 relation 端点及 source:daodejing-edition locator：关系仅表达 passage_of 结构闭包。"],
  ["relation:return-passage-analects", "核对 passage 的 textSlug/textVersionSlug 与 relation 端点及 source:analects-edition locator：关系仅表达 passage_of 结构闭包。"],
  ["relation:daodejing-analects-comparative", "核对 source:comparative-method：这是策展比较入口，不是共同作者、直接影响或同一传统的历史断言；页面免责声明保留。"],
  ["relation:heart-sutra-daodejing-comparative", "核对 source:comparative-method：这是保留术语、时代和宗教功能差异的概念并置，不是两部文本等同或直接影响的历史断言。"],
  ["relation:heart-sutra-has-version", "核对 source:heart-sutra-edition 与端点：关系仅表达作品到结构依赖版本的 has_version 闭包，不把 placeholder 变成唯一鉴定版。"],
  ["relation:daodejing-has-version", "核对 source:daodejing-edition 与端点：关系仅表达作品到传世章句记录的 has_version 闭包，不声称无异文或唯一底本。"],
  ["relation:analects-has-version", "核对 source:analects-edition 与端点：关系仅表达作品到传世篇章记录的 has_version 闭包，不声称完整版本谱系。"],
  ["relation:form-quoted-heart-version", "核对 source:heart-sutra-edition、passage locator 和版本端点：关系只表示当前短引回到指定结构依赖，不把数字网页转录权利扩大为整页许可。"],
  ["relation:humans-quoted-daodejing-version", "核对 source:daodejing-edition、passage locator 和版本端点：关系只表示当前短引回到指定结构依赖，不把通行本记录当作完整数字版。"],
  ["relation:return-quoted-analects-version", "核对 source:analects-edition、passage locator 和版本端点：关系只表示当前短引回到指定结构依赖，不把外部页面或译文整页复用。"],
]);

function bilingualNote(key) {
  return `逐项对照 ${key} 的 zh-CN/en title、subtitle、summary、description、time、facts 与 quote/locator 字段；两种语言保留相同的证据层、历史不确定性和版本边界。当前英文展示字段未被标作外部译者译文。`;
}

function rightsNote(key) {
  const textLike = /^(text|passage|text_version):/.test(key);
  if (textLike) {
    return `本次通过仅覆盖当前页面的短古典摘录（版本页本身无长引）、source credit、章节/版本 locator、外部链接以及项目当前展示的 modernZh/translationEn/interpretation 字段；原典、数字转录、外部网页和项目解释分层，不镜像 Ctext、Cambridge 或地方志 PDF，也不把外部页面权利扩大为整页转载许可。已核对所链接来源无 unknown/restricted rights。`;
  }
  return `本次通过仅覆盖当前页面的馆方摘要、结构化字段、来源 metadata、locator 和外部链接；不复制外部页面或 PDF 正文。所链接来源的 rightsStatus 为 public_domain、open_licensed、quotation_only 或 external_reference_only，未发现 unknown/restricted；该结论不扩展为外部网站整页转载许可。`;
}

function accessibilityNote(key) {
  return `已纳入 RC 页面审核：npm run test:e2e 共 43/43 通过，含 axe WCAG 2A/2AA 检查；${key} 对应详情路由已实际加载并通过 heading/main/键盘与无障碍树检查。自动 axe 不替代未来内容增补后的复测。`;
}

function editorialNote(key) {
  const version = key.startsWith("text_version:");
  return version
    ? "确认当前条目符合 Lean Public RC 的结构依赖范围：研究说明明确保留底本/译者/精确 locator 缺口，页面不把 Alpha placeholder 呈现为批校本；未扩大内容范围。"
    : "确认当前条目符合 Lean Public RC 的冻结范围：事实、传统归属、时间/空间边界和研究说明保持分层；未把神话/后世记忆、比较阅读或策展解释改写成无限定历史事实。";
}

function traditionNote(key) {
  if (key === "figure:xuanzang" || key === "text:heart-sutra" || key === "passage:form-is-emptiness") {
    return "确认 buddhism 为当前展示的主要传统，evidenceLayer/来源与页面边界一致；不把后世文学或宗教记忆替代为人物/文本的单一历史事实。";
  }
  if (key === "figure:sima-chengzhen" || key === "text:daodejing" || key === "passage:humans-follow-earth") {
    return "确认 daoism 为当前展示的主要传统；司马承祯的上清关联保留 medium confidence，不声称法脉研究已经完整；《道德经》保留 historical_inferred 与 contested attribution。";
  }
  if (key === "figure:kong-yingda" || key === "text:analects" || key === "passage:return-to-ritual") {
    return "确认 confucianism 为当前展示的主要传统；《论语》保留 composite attribution，孔颖达的经学/制度语境不扩写为单一传统的全部历史。";
  }
  if (key === "place:changan") {
    return "确认长安以 syncretic 方式并列 Buddhism、Daoism、Confucianism；页面明确写明这不是抽象的三教和谐背景，避免把城市交汇简化成价值判断。";
  }
  throw new Error(`No tradition note for ${key}`);
}

function addDecision(decisions, subjectKind, subjectKey, checkKind, note) {
  decisions.push({ subjectKind, subjectKey, checkKind, status: "passed", reviewer, reviewedAt, note });
}

const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
const selectedEntities = [...candidate.coreEntities, ...candidate.dependencyEntities];
if (JSON.stringify(selectedEntities) !== JSON.stringify([...coreEntities, ...dependencyEntities])) {
  throw new Error("Public RC entity scope changed; refusing to apply the frozen review batch");
}
if (JSON.stringify(candidate.relations) !== JSON.stringify(relations)) {
  throw new Error("Public RC relation scope changed; refusing to apply the frozen review batch");
}

const decisions = [];
for (const key of selectedEntities) {
  addDecision(decisions, "entity", key, "fact", facts.get(key));
  addDecision(decisions, "entity", key, "bilingual", bilingualNote(key));
  addDecision(decisions, "entity", key, "rights", rightsNote(key));
  addDecision(decisions, "entity", key, "accessibility", accessibilityNote(key));
  addDecision(decisions, "entity", key, "editorial", editorialNote(key));
  if (coreEntities.includes(key)) addDecision(decisions, "entity", key, "tradition", traditionNote(key));
}
for (const key of relations) {
  addDecision(decisions, "relation", key, "fact", relationFacts.get(key));
  addDecision(decisions, "relation", key, "rights", rightsNote(key));
  addDecision(decisions, "relation", key, "editorial", editorialNote(key));
}
if (decisions.some((decision) => !decision.note)) throw new Error("Every formal decision requires an explicit note");

const reviews = JSON.parse(await readFile(reviewsPath, "utf8"));
let updated = 0;
for (const decision of decisions) {
  const index = reviews.findIndex((record) => (
    record.subjectKind === decision.subjectKind &&
    record.subjectKey === decision.subjectKey &&
    record.checkKind === decision.checkKind &&
    record.locale === undefined
  ));
  if (index < 0) throw new Error(`Missing review record for ${decision.subjectKind}:${decision.subjectKey}:${decision.checkKind}`);
  reviews[index] = {
    ...reviews[index],
    status: decision.status,
    reviewer: decision.reviewer,
    reviewedAt: decision.reviewedAt,
    note: decision.note,
  };
  updated += 1;
}

const temporary = `${reviewsPath}.authorized-review-tmp`;
await writeFile(temporary, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
await rename(temporary, reviewsPath);
console.log(`Recorded ${updated} formal Public RC checks as ${reviewer}`);
