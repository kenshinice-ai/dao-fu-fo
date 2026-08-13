import type { Locale } from "../types";

const EVIDENCE_LABELS: Record<string, { zh: string; en: string }> = {
  historical_documented: { zh: "有文献依据", en: "Documented history" },
  historical_inferred: { zh: "历史推定", en: "Historical inference" },
  traditional_account: { zh: "传统叙事", en: "Traditional account" },
  mythic_symbolic: { zh: "神话／象征", en: "Mythic or symbolic" },
  later_deification: { zh: "后世神格化", en: "Later deification" },
  literary_representation: { zh: "文学再现", en: "Literary representation" },
  scholarly_interpretation: { zh: "学术解释", en: "Scholarly interpretation" },
};

const CONFIDENCE_LABELS: Record<string, { zh: string; en: string }> = {
  high: { zh: "高置信度", en: "High confidence" },
  medium: { zh: "中等置信度", en: "Medium confidence" },
  low: { zh: "低置信度", en: "Low confidence" },
  unknown: { zh: "待核", en: "Unresolved" },
};

const HISTORICITY_LABELS: Record<string, { zh: string; en: string }> = {
  documented: { zh: "有文献记录", en: "Documented" },
  inferred: { zh: "历史推定", en: "Inferred" },
  contested: { zh: "存在争议", en: "Contested" },
  traditional: { zh: "传统记忆", en: "Traditional memory" },
  mythic: { zh: "神话／象征", en: "Mythic or symbolic" },
};

const FIGURE_CLASS_LABELS: Record<string, { zh: string; en: string }> = {
  historical_person: { zh: "历史人物", en: "Historical person" },
  traditional_sage: { zh: "传统圣贤", en: "Traditional sage" },
  mythic_persona: { zh: "神话人物", en: "Mythic persona" },
  sacred_figure: { zh: "神圣人物", en: "Sacred figure" },
};

const RELATION_LABELS: Record<string, { zh: string; en: string }> = {
  influenced: { zh: "影响", en: "Influenced" },
  contemporary_with: { zh: "同时代语境", en: "Contemporary context" },
  located_in: { zh: "位于", en: "Located in" },
  active_in: { zh: "活动于", en: "Active in" },
  travelled_through: { zh: "经过", en: "Travelled through" },
  translated_or_transmitted: { zh: "翻译／传承", en: "Translated or transmitted" },
  route_connects: { zh: "路线连接", en: "Route connects" },
  participated_in: { zh: "参与", en: "Participated in" },
  occurred_at: { zh: "发生于", en: "Occurred at" },
  attributed_to: { zh: "归属于", en: "Attributed to" },
  received_by: { zh: "被接受于", en: "Received by" },
  remembered_in: { zh: "被记忆于", en: "Remembered in" },
  deified_as: { zh: "神格化为", en: "Deified as" },
  born_in: { zh: "出生于", en: "Born in" },
};

const ENTITY_LABELS: Record<string, { zh: string; en: string }> = {
  figure: { zh: "人物", en: "Figure" },
  event: { zh: "事件", en: "Event" },
  place: { zh: "地点", en: "Place" },
  route: { zh: "路线", en: "Route" },
  text: { zh: "著作", en: "Work" },
  passage: { zh: "言论", en: "Saying" },
  concept: { zh: "概念", en: "Concept" },
  institution: { zh: "机构", en: "Institution" },
  practice: { zh: "实践", en: "Practice" },
  school: { zh: "学派", en: "School" },
  museum_object: { zh: "馆藏对象", en: "Museum object" },
};

const EVENT_KIND_LABELS: Record<string, { zh: string; en: string }> = {
  dynastic_transition: { zh: "朝代转折", en: "Dynastic transition" },
  journey: { zh: "行旅", en: "Journey" },
  editorial_project: { zh: "编纂工程", en: "Editorial project" },
  foundation: { zh: "创建", en: "Foundation" },
  construction: { zh: "营造", en: "Construction" },
  policy: { zh: "制度／政策", en: "Policy" },
  conflict: { zh: "冲突", en: "Conflict" },
  analytical_period: { zh: "研究时期", en: "Analytical period" },
  other: { zh: "历史语境", en: "Historical context" },
};

const EVENT_SCOPE_LABELS: Record<string, { zh: string; en: string }> = {
  personal: { zh: "个人", en: "Personal" },
  local: { zh: "地方", en: "Local" },
  regional: { zh: "区域", en: "Regional" },
  imperial: { zh: "帝国／制度", en: "Imperial" },
  transregional: { zh: "跨区域", en: "Transregional" },
  cosmological: { zh: "宇宙象征", en: "Cosmological" },
};

function humanise(value: string | undefined): string {
  return value?.replaceAll("_", " ").trim() || "—";
}

export function formatEvidence(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh-CN" ? "证据待核" : "Evidence unresolved";
  const label = EVIDENCE_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? value;
}

export function formatConfidence(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh-CN" ? "置信度待核" : "Confidence unresolved";
  const label = CONFIDENCE_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

export function formatHistoricity(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh-CN" ? "现实性待核" : "Historicity unresolved";
  const label = HISTORICITY_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

export function formatFigureClass(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh-CN" ? "人物类别待核" : "Figure class unresolved";
  const label = FIGURE_CLASS_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

export function formatRelationType(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh-CN" ? "关系待命名" : "Unlabelled relation";
  const label = RELATION_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

export function formatEntityKind(value: string, locale: Locale): string {
  const label = ENTITY_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

export function formatEventKind(value: string | undefined, locale: Locale): string {
  if (!value) return formatEntityKind("event", locale);
  const label = EVENT_KIND_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

export function formatEventScope(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh-CN" ? "范围待核" : "Scope unresolved";
  const label = EVENT_SCOPE_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

const INTERACTION_MODE_LABELS: Record<string, { zh: string; en: string }> = {
  teacher_student: { zh: "师承／授受", en: "Teacher–student" },
  lineage_reception: { zh: "谱系／后世接受", en: "Lineage / reception" },
  correspondence: { zh: "通信往来", en: "Correspondence" },
  debate: { zh: "论辩", en: "Debate" },
  collaboration: { zh: "共同协作", en: "Collaboration" },
  institutional_peer: { zh: "制度同侪", en: "Institutional peers" },
  shared_context: { zh: "共同语境", en: "Shared context" },
};

export function formatInteractionMode(value: string | undefined, locale: Locale): string {
  if (!value) return locale === "zh-CN" ? "互动方式待核" : "Interaction unresolved";
  const label = INTERACTION_MODE_LABELS[value];
  return label?.[locale === "zh-CN" ? "zh" : "en"] ?? humanise(value);
}

export function formatEvidenceLine(evidence: string | undefined, confidence: string | undefined, locale: Locale): string {
  return [formatEvidence(evidence, locale), formatConfidence(confidence, locale)].join(" · ");
}
