import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const contentRoot = join(repoRoot, "content");
const daoRoot = join(contentRoot, "dao-ru-fo");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const relationPath = join(daoRoot, "relations.json");
const sourcePath = join(contentRoot, "common/sources.json");
const relations = await readJson(relationPath);
const sources = await readJson(sourcePath);

const entityFiles = [];
for (const kind of await readdir(join(daoRoot, "entities"))) {
  for (const file of await readdir(join(daoRoot, "entities", kind))) {
    if (file.endsWith(".json")) entityFiles.push(join(daoRoot, "entities", kind, file));
  }
}
const entities = (await Promise.all(entityFiles.map(readJson))).flatMap((value) => Array.isArray(value) ? value : [value]);
const entityMap = new Map(entities.map((entity) => [`${entity.kind}:${entity.slug}`, entity]));
const placeTitles = new Map(entities.filter((entity) => entity.kind === "place").map((entity) => [entity.slug, {
  zh: entity.translations["zh-CN"].title,
  en: entity.translations.en.title,
}]));
const batchFigures = new Set((await readJson(join(daoRoot, "entities/figure/second-100-batch-2026-08.json"))).map((entity) => entity.slug));

function endpointKey(endpoint) {
  return `${endpoint.kind}:${endpoint.slug}`;
}

function historicalRange(entity) {
  const assertion = entity?.temporalAssertions?.find((item) => ["life", "activity"].includes(item.predicate))
    ?? entity?.temporalAssertions?.find((item) => item.startYear !== undefined);
  return assertion?.startYear === undefined ? undefined : {
    startYear: assertion.startYear,
    ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
  };
}

function rangesOverlap(left, right) {
  return (left.endYear ?? left.startYear) >= right.startYear
    && (right.endYear ?? right.startYear) >= left.startYear;
}

function yearLabel(year) {
  if (year < 0) return { zh: `前 ${Math.abs(year)} 年`, en: `${Math.abs(year)} BCE` };
  return { zh: `${year} 年`, en: `${year} CE` };
}

function rangeLabel(range, approximate = false) {
  const start = yearLabel(range.startYear);
  const end = range.endYear === undefined ? undefined : yearLabel(range.endYear);
  const zh = end && end.zh !== start.zh ? `${start.zh.replace(/ 年$/, "")}—${end.zh}` : start.zh;
  const en = end && end.en !== start.en ? `${start.en.replace(/ BCE| CE$/, "")}–${end.en}` : start.en;
  return {
    zh: `${approximate ? "约 " : ""}${zh}`,
    en: `${approximate ? "c. " : ""}${en}`,
  };
}

function setTemporalRange(assertion, range, displayDate, sourceId) {
  return {
    ...assertion,
    ...(range.startYear !== undefined ? { startYear: range.startYear } : {}),
    ...(range.endYear !== undefined ? { endYear: range.endYear } : {}),
    ...(range.endYear === undefined ? { endYear: undefined } : {}),
    displayDate: displayDate ?? assertion.displayDate,
    ...(sourceId ? { sourceId } : {}),
  };
}

const relationByFigureEvent = new Map();
for (const relation of relations) {
  if (relation.relationType !== "participated_in" || relation.source.kind !== "figure" || relation.target.kind !== "event") continue;
  relationByFigureEvent.set(relation.source.slug, relation);
}

let reversedReception = 0;
let receptionDatesFixed = 0;
let locationDatesFixed = 0;
let birthDatesFixed = 0;
let localizedLabels = 0;
let temporalSourcesAttached = 0;
let englishLabelsFixed = 0;

for (const relation of relations) {
  const sourceKey = endpointKey(relation.source);
  const targetKey = endpointKey(relation.target);
  const sourceEntity = entityMap.get(sourceKey);
  const targetEntity = entityMap.get(targetKey);

  const sourceIds = new Set(relation.sourceIds ?? []);
  for (const assertion of relation.temporalAssertions ?? []) {
    if (!sourceIds.has(assertion.sourceId)) {
      sourceIds.add(assertion.sourceId);
      temporalSourcesAttached += 1;
    }
  }

  if (relation.relationType === "received_by" && relation.source.kind === "figure" && relation.target.kind === "figure") {
    let source = relation.source;
    let target = relation.target;
    const sourceRange = historicalRange(sourceEntity);
    const targetRange = historicalRange(targetEntity);
    if (sourceRange && targetRange && sourceRange.startYear > targetRange.startYear) {
      [source, target] = [target, source];
      relation.source = source;
      relation.target = target;
      const sourceTitle = entityMap.get(endpointKey(source))?.translations["zh-CN"].title ?? source.slug;
      const targetTitle = entityMap.get(endpointKey(target))?.translations["zh-CN"].title ?? target.slug;
      const sourceTitleEn = entityMap.get(endpointKey(source))?.translations.en.title ?? source.slug;
      const targetTitleEn = entityMap.get(endpointKey(target))?.translations.en.title ?? target.slug;
      relation.label = {
        "zh-CN": `${sourceTitle}进入${targetTitle}的后世解释语境`,
        en: `${sourceTitleEn}'s tradition enters ${targetTitleEn}'s later interpretive context`,
      };
      relation.summary = {
        "zh-CN": `${sourceTitle}作为较早的思想或文本来源进入${targetTitle}的后世解释语境；该关系不表示两人直接交往。`,
        en: `${sourceTitleEn} is treated as an earlier intellectual or textual source in ${targetTitleEn}'s later interpretive context; this does not imply direct contact.`,
      };
      reversedReception += 1;
    }
    if (/[\u3400-\u9fff]/u.test(`${relation.label?.en ?? ""} ${relation.summary?.en ?? ""}`)) {
      const sourceTitle = entityMap.get(endpointKey(relation.source))?.translations["zh-CN"].title ?? relation.source.slug;
      const targetTitle = entityMap.get(endpointKey(relation.target))?.translations["zh-CN"].title ?? relation.target.slug;
      const sourceTitleEn = entityMap.get(endpointKey(relation.source))?.translations.en.title ?? relation.source.slug;
      const targetTitleEn = entityMap.get(endpointKey(relation.target))?.translations.en.title ?? relation.target.slug;
      relation.label = {
        "zh-CN": `${sourceTitle}进入${targetTitle}的后世解释语境`,
        en: `${sourceTitleEn}'s tradition enters ${targetTitleEn}'s later interpretive context`,
      };
      relation.summary = {
        "zh-CN": `${sourceTitle}作为较早的思想或文本来源进入${targetTitle}的后世解释语境；该关系不表示两人直接交往。`,
        en: `${sourceTitleEn} is treated as an earlier intellectual or textual source in ${targetTitleEn}'s later interpretive context; this does not imply direct contact.`,
      };
      englishLabelsFixed += 1;
    }
    const receivingEntity = entityMap.get(endpointKey(relation.target));
    const receivingRange = historicalRange(receivingEntity);
    if (receivingRange) {
      relation.temporalAssertions = (relation.temporalAssertions ?? []).map((assertion) => {
        if (assertion.startYear === undefined || rangesOverlap(receivingRange, { startYear: assertion.startYear, ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}) })) return assertion;
        receptionDatesFixed += 1;
        const display = rangeLabel(receivingRange, assertion.timeType === "circa");
        return setTemporalRange(assertion, receivingRange, { "zh-CN": `${display.zh}的后世接受语境`, en: `${display.en} later-reception context` });
      });
    }
    relation.qualifiers = { ...(relation.qualifiers ?? {}), interactionMode: relation.qualifiers?.interactionMode ?? "lineage_reception" };
  }

  if (relation.source.kind === "figure" && batchFigures.has(relation.source.slug) && relation.relationType === "active_in") {
    const participation = relationByFigureEvent.get(relation.source.slug);
    const event = participation ? entityMap.get(endpointKey(participation.target)) : undefined;
    const eventAssertion = event?.temporalAssertions?.find((assertion) => assertion.startYear !== undefined);
    if (eventAssertion) {
      const nextTemporalAssertions = (relation.temporalAssertions ?? []).map((assertion) => setTemporalRange(
        { ...assertion, timeType: eventAssertion.timeType === "exact" ? "exact" : "range" },
        { startYear: eventAssertion.startYear, ...(eventAssertion.endYear !== undefined ? { endYear: eventAssertion.endYear } : {}) },
        eventAssertion.displayDate,
        eventAssertion.sourceId,
      ));
      if (JSON.stringify(nextTemporalAssertions) !== JSON.stringify(relation.temporalAssertions ?? [])) locationDatesFixed += 1;
      relation.temporalAssertions = nextTemporalAssertions;
      sourceIds.add(eventAssertion.sourceId);
    }
  }

  if (relation.source.kind === "figure" && relation.relationType === "born_in") {
    const figureRange = historicalRange(sourceEntity);
    const birthAssertion = relation.temporalAssertions?.find((assertion) => assertion.startYear !== undefined);
    const invalidBirthRange = birthAssertion
      && (birthAssertion.predicate !== "birth"
        || birthAssertion.endYear === undefined
        || birthAssertion.endYear - birthAssertion.startYear > 1);
    if (figureRange && invalidBirthRange) {
      birthDatesFixed += 1;
      const birthRange = { startYear: figureRange.startYear, endYear: figureRange.startYear };
      const approximate = (sourceEntity.temporalAssertions.find((assertion) => ["life", "activity"].includes(assertion.predicate))?.timeType ?? "circa") === "circa";
      const display = rangeLabel(birthRange, approximate);
      relation.temporalAssertions = (relation.temporalAssertions ?? []).map((assertion) => setTemporalRange(
        { ...assertion, predicate: "birth" },
        birthRange,
        { "zh-CN": `${display.zh}的出生地语境`, en: `${display.en} birthplace context` },
        assertion.sourceId,
      ));
    }
  }

  for (const [slug, titles] of placeTitles) {
    if (relation.label?.["zh-CN"]?.includes(slug)) {
      relation.label["zh-CN"] = relation.label["zh-CN"].replaceAll(slug, titles.zh);
      localizedLabels += 1;
    }
  }
  relation.sourceIds = [...sourceIds];
}

const locatorDowngrades = new Set(["source:han-philology-records", "source:buddhist-transmission-records"]);
for (const source of sources) {
  if (locatorDowngrades.has(source.id) && source.locatorLevel === "precise") source.locatorLevel = "topic";
}

const zhangRelation = relations.find((relation) => relation.id === "relation:zhang-jixian-received-zhang-yu-chu");
if (zhangRelation?.temporalAssertions?.[0]) zhangRelation.temporalAssertions[0].sourceId = "source:daoist-yuan-ming-records";
if (zhangRelation && !zhangRelation.sourceIds.includes("source:daoist-yuan-ming-records")) zhangRelation.sourceIds.push("source:daoist-yuan-ming-records");

await writeJson(relationPath, relations);
await writeJson(sourcePath, sources);
console.log(JSON.stringify({ reversedReception, receptionDatesFixed, locationDatesFixed, birthDatesFixed, localizedLabels, temporalSourcesAttached, englishLabelsFixed }, null, 2));
