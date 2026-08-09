import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  AudioRecordSchema,
  ContentProfileSchema,
  ContentQualityReportSchema,
  ContentReportSchema,
  ContentVisibilitySchema,
  DatabaseImportBundleSchema,
  EntityContentSchema,
  PassageProfileSchema,
  PlaceProfileSchema,
  ReadModelRelationIndexSchema,
  ReadModelRealMapSchema,
  ReadModelTimelineSchema,
  ReadModelGraphSchema,
  ReadModelEntityArtifactSchema,
  ReadModelAudioIndexSchema,
  ReadModelManifestSchema,
  ReadModelProfileSchema,
  ReadModelChecksumsSchema,
  ReadModelRoutesManifestSchema,
  ReadModelReviewQueueSchema,
  ReadModelSourceIndexSchema,
  ReviewCheckRecordSchema,
  ReadModelSearchIndexSchema,
  SourceRecordSchema,
  TextVersionProfileSchema,
  TraditionContentSchema,
  RelationRecordSchema,
  RouteProfileSchema,
  type ContentProfile,
  type ContentVisibility,
  type EntityContent,
  type AudioRecord,
  type ReadModelEntityArtifact,
  type Locale,
  type RelationRecord,
  type ReviewCheckKind,
  type ReviewCheckRecord,
  type SourceRecord,
  type TraditionContent,
} from "@drf-museum/domain-schema";

const SCHEMA_VERSION = "2.0" as const;
const DEFAULT_NAMESPACE = "0f8f2f0c-4f55-5e8e-8a4b-4c52f8d7b4b2";
const LOCALES: Locale[] = ["zh-CN", "en"];

export interface CompileOptions {
  repoRoot?: string;
  outputDirectory?: string;
  namespace?: string;
  visibility?: ContentVisibility;
  databaseBundlePath?: string;
}

type EntityArtifact = ReadModelEntityArtifact;

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listJsonFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

function uuidBytes(value: string): Buffer {
  const hex = value.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error(`Invalid UUID namespace: ${value}`);
  return Buffer.from(hex, "hex");
}

function uuidV5(namespace: string, name: string): string {
  const hash = createHash("sha1")
    .update(Buffer.concat([uuidBytes(namespace), Buffer.from(name, "utf8")]))
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function isVerifiedClaimSource(source: SourceRecord): boolean {
  return source.id !== "source:editorial-method" &&
    source.evidenceGrade !== "D" &&
    ["edition", "item", "precise"].includes(source.locatorLevel) &&
    source.citationStatus === "verified";
}

const ENTITY_REVIEW_CHECKS: ReviewCheckKind[] = ["schema", "fact", "bilingual", "rights", "editorial"];
const RELATION_REVIEW_CHECKS: ReviewCheckKind[] = ["schema", "fact", "rights", "editorial"];
const AUDIO_REVIEW_CHECKS: ReviewCheckKind[] = ["schema", "bilingual", "rights", "accessibility", "editorial"];

function requiredEntityChecks(entity: EntityContent): ReviewCheckKind[] {
  return entity.isFeatured || ["figure", "concept", "institution", "practice"].includes(entity.kind)
    ? [...ENTITY_REVIEW_CHECKS, "tradition"]
    : ENTITY_REVIEW_CHECKS;
}

function validationMessage(path: string, issues: Array<{ path: PropertyKey[]; message: string }>): string {
  return `${path}: ${issues.map((issue) => `${issue.path.join(".") || "root"} ${issue.message}`).join("; ")}`;
}

function primaryTradition(entity: EntityContent): EntityArtifact["tradition"] {
  if (entity.traditions.length > 1 && entity.traditions.every((item) => item.role === "syncretic")) return "convergence";
  return entity.traditions.find((item) => item.isPrimary)?.tradition ?? entity.traditions[0]?.tradition ?? "convergence";
}

function sourceIdsFor(entity: EntityContent): string[] {
  return [...new Set([
    ...entity.sourceIds,
    ...entity.traditions.map((item) => item.sourceId),
    ...entity.temporalAssertions.map((item) => item.sourceId),
  ])];
}

function toArtifact(entity: EntityContent, locale: Locale, sourceMap: Map<string, SourceRecord>, entityMap: Map<string, EntityContent>, namespace: string): EntityArtifact {
  const translation = entity.translations[locale];
  const sources = sourceIdsFor(entity).map((id) => {
    const source = sourceMap.get(id);
    if (!source) throw new Error(`Missing source ${id} for ${entity.kind}/${entity.slug}`);
    return {
      title: source.title[locale],
      locator: source.locator,
      grade: source.evidenceGrade,
      role: source.role[locale],
      ...(source.url ? { url: source.url } : {}),
    };
  });

  const related = entity.related.map((item) => {
    const target = entityMap.get(`${item.kind}:${item.slug}`);
    if (!target) throw new Error(`Missing relation target ${item.kind}/${item.slug} from ${entity.kind}/${entity.slug}`);
    return {
      kind: item.kind,
      slug: item.slug,
      title: item.title[locale],
      relation: item.relation[locale],
    };
  });

  return ReadModelEntityArtifactSchema.parse({
    id: uuidV5(namespace, `${entity.kind}:${entity.slug}`),
    locale,
    kind: entity.kind,
    slug: entity.slug,
    title: translation.title,
    ...(translation.subtitle ? { subtitle: translation.subtitle } : {}),
    tradition: primaryTradition(entity),
    evidence: entity.primaryEvidenceLayer,
    timeLabel: translation.timeLabel,
    shortSummary: translation.shortSummary,
    curatorialDescription: translation.curatorialDescription,
    researchNote: translation.researchNote,
    keyFacts: translation.keyFacts.map((fact) => ({ label: fact.label[locale], value: fact.value[locale] })),
    ...(translation.quote
      ? {
          quote: {
            original: translation.quote.original,
            interpretation: translation.quote.interpretation[locale],
            locator: translation.quote.locator,
          },
        }
      : {}),
    related,
    sources,
    profile: entity.profile,
    publicationState: entity.publicationState,
    reviewStatus: entity.reviewStatus,
  });
}

export async function compileContent(options: CompileOptions = {}) {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const contentRoot = resolve(repoRoot, "content");
  const profilePath = resolve(contentRoot, "dao-ru-fo/profile.json");
  const traditionsPath = resolve(contentRoot, "dao-ru-fo/traditions.json");
  const relationsPath = resolve(contentRoot, "dao-ru-fo/relations.json");
  const audioPath = resolve(contentRoot, "dao-ru-fo/audio.json");
  const reviewsPath = resolve(contentRoot, "dao-ru-fo/reviews.json");
  const sourcesPath = resolve(contentRoot, "common/sources.json");
  const entitiesRoot = resolve(contentRoot, "dao-ru-fo/entities");
  const outputDirectory = resolve(options.outputDirectory ?? join(repoRoot, ".artifacts/content/v2"));
  const databaseBundlePath = options.databaseBundlePath ? resolve(repoRoot, options.databaseBundlePath) : undefined;
  const namespace = options.namespace ?? DEFAULT_NAMESPACE;
  const visibility = ContentVisibilitySchema.parse(options.visibility ?? "preview");
  if (databaseBundlePath && visibility !== "preview") throw new Error("Database import bundles may only be generated from preview source content");

  const profileResult = ContentProfileSchema.safeParse(await readJson(profilePath));
  if (!profileResult.success) throw new Error(validationMessage(profilePath, profileResult.error.issues));
  const profile: ContentProfile = profileResult.data;

  const sourceResult = SourceRecordSchema.array().safeParse(await readJson(sourcesPath));
  if (!sourceResult.success) throw new Error(validationMessage(sourcesPath, sourceResult.error.issues));
  const sources = sourceResult.data;
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  if (sourceMap.size !== sources.length) throw new Error("Duplicate source IDs are not allowed");

  const traditionResult = TraditionContentSchema.array().safeParse(await readJson(traditionsPath));
  if (!traditionResult.success) throw new Error(validationMessage(traditionsPath, traditionResult.error.issues));
  const traditions: TraditionContent[] = traditionResult.data;

  const relationResult = RelationRecordSchema.array().safeParse(await readJson(relationsPath));
  if (!relationResult.success) throw new Error(validationMessage(relationsPath, relationResult.error.issues));
  const relations: RelationRecord[] = relationResult.data;

  const audioResult = AudioRecordSchema.array().safeParse(await readJson(audioPath));
  if (!audioResult.success) throw new Error(validationMessage(audioPath, audioResult.error.issues));
  const audio: AudioRecord[] = audioResult.data;

  const reviewResult = ReviewCheckRecordSchema.array().safeParse(await readJson(reviewsPath));
  if (!reviewResult.success) throw new Error(validationMessage(reviewsPath, reviewResult.error.issues));
  const reviews: ReviewCheckRecord[] = reviewResult.data;
  const reviewKeys = new Set<string>();
  for (const review of reviews) {
    const key = `${review.subjectKind}:${review.subjectKey}:${review.checkKind}:${review.locale ?? "all"}`;
    if (reviewKeys.has(key)) throw new Error(`Duplicate review check ${key}`);
    reviewKeys.add(key);
  }
  const reviewsFor = (subjectKind: ReviewCheckRecord["subjectKind"], subjectKey: string) =>
    reviews.filter((review) => review.subjectKind === subjectKind && review.subjectKey === subjectKey);
  const missingChecks = (required: ReviewCheckKind[], completed: ReviewCheckRecord[]) => {
    const done = new Set(completed.filter((review) => ["passed", "waived"].includes(review.status)).map((review) => review.checkKind));
    return required.filter((check) => !done.has(check));
  };

  const entityFiles = await listJsonFiles(entitiesRoot);
  const entities: EntityContent[] = [];
  const errors: string[] = [];
  for (const path of entityFiles) {
    const raw = await readJson(path);
    const candidates = Array.isArray(raw) ? raw : [raw];
    for (const [index, candidate] of candidates.entries()) {
      const sourceLabel = Array.isArray(raw) ? `${path}[${index}]` : path;
      const result = EntityContentSchema.safeParse(candidate);
      if (!result.success) errors.push(validationMessage(sourceLabel, result.error.issues));
      else entities.push(result.data);
    }
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const entityMap = new Map<string, EntityContent>();
  for (const entity of entities) {
    const key = `${entity.kind}:${entity.slug}`;
    if (entityMap.has(key)) errors.push(`Duplicate entity ${key}`);
    entityMap.set(key, entity);
    if (entity.publicationState === "public" && entity.reviewStatus !== "publishable") {
      errors.push(`${key}: public entities must be publishable`);
    }
    for (const sourceId of sourceIdsFor(entity)) {
      if (!sourceMap.has(sourceId)) errors.push(`${key}: unknown source ${sourceId}`);
      if (entity.publicationState === "public" && ["unknown", "restricted"].includes(sourceMap.get(sourceId)?.rightsStatus ?? "unknown")) {
        errors.push(`${key}: public entities cannot use uncleared source ${sourceId}`);
      }
    }
    if (entity.publicationState === "public") {
      const linkedSources = sourceIdsFor(entity).map((sourceId) => sourceMap.get(sourceId)).filter((source): source is SourceRecord => Boolean(source));
      if (!linkedSources.some(isVerifiedClaimSource)) {
        errors.push(`${key}: public entities require at least one verified edition/item/precise source locator`);
      }
      const missing = missingChecks(requiredEntityChecks(entity), reviewsFor("entity", key));
      if (missing.length > 0) errors.push(`${key}: public entities require completed review checks: ${missing.join(", ")}`);
    }
  }
  for (const entity of entities) {
    const key = `${entity.kind}:${entity.slug}`;
    for (const relation of entity.related) {
      if (!entityMap.has(`${relation.kind}:${relation.slug}`)) {
        errors.push(`${key}: relation target ${relation.kind}:${relation.slug} is not in the content batch`);
      }
    }
    if (entity.kind === "text_version") {
      const profile = TextVersionProfileSchema.parse(entity.profile);
      if (!entityMap.has(`text:${profile.textSlug}`)) errors.push(`${key}: text version points to missing text:${profile.textSlug}`);
    }
    if (entity.kind === "passage") {
      const profile = PassageProfileSchema.parse(entity.profile);
      if (!entityMap.has(`text:${profile.textSlug}`)) errors.push(`${key}: passage points to missing text:${profile.textSlug}`);
      if (!entityMap.has(`text_version:${profile.textVersionSlug}`)) {
        errors.push(`${key}: passage points to missing text_version:${profile.textVersionSlug}`);
      }
    }
    if (entity.kind === "place") {
      const place = PlaceProfileSchema.parse(entity.profile);
      if (place.geographicSourceId && !sourceMap.has(place.geographicSourceId)) errors.push(`${key}: unknown geographic source ${place.geographicSourceId}`);
      if (place.geographicSourceId && !sourceIdsFor(entity).includes(place.geographicSourceId)) errors.push(`${key}: geographic source must also appear in sourceIds`);
    }
    if (entity.kind === "route") {
      const route = RouteProfileSchema.parse(entity.profile);
      for (const placeSlug of route.waypointSlugs) {
        if (!entityMap.has(`place:${placeSlug}`)) errors.push(`${key}: route waypoint points to missing place:${placeSlug}`);
      }
    }
  }
  for (const tradition of traditions) {
    for (const sourceId of tradition.sourceIds) {
      if (!sourceMap.has(sourceId)) errors.push(`tradition ${tradition.slug}: unknown source ${sourceId}`);
    }
  }
  const relationIds = new Set<string>();
  for (const relation of relations) {
    if (relationIds.has(relation.id)) errors.push(`Duplicate relation ${relation.id}`);
    relationIds.add(relation.id);
    for (const endpoint of [relation.source, relation.target]) {
      if (!entityMap.has(`${endpoint.kind}:${endpoint.slug}`)) {
        errors.push(`${relation.id}: endpoint ${endpoint.kind}:${endpoint.slug} is not in the content batch`);
      }
    }
    for (const sourceId of relation.sourceIds) {
      if (!sourceMap.has(sourceId)) errors.push(`${relation.id}: unknown source ${sourceId}`);
      if (relation.publicationState === "public" && ["unknown", "restricted"].includes(sourceMap.get(sourceId)?.rightsStatus ?? "unknown")) {
        errors.push(`${relation.id}: public relations cannot use uncleared source ${sourceId}`);
      }
    }
    if (relation.publicationState === "public") {
      const linkedSources = relation.sourceIds.map((sourceId) => sourceMap.get(sourceId)).filter((source): source is SourceRecord => Boolean(source));
      if (!linkedSources.some(isVerifiedClaimSource)) {
        errors.push(`${relation.id}: public relations require a verified edition/item/precise source locator`);
      }
      const missing = missingChecks(RELATION_REVIEW_CHECKS, reviewsFor("relation", relation.id));
      if (missing.length > 0) errors.push(`${relation.id}: public relations require completed review checks: ${missing.join(", ")}`);
    }
    for (const assertion of relation.temporalAssertions) {
      if (!sourceMap.has(assertion.sourceId)) errors.push(`${relation.id}: unknown temporal source ${assertion.sourceId}`);
    }
  }
  for (const audioRecord of audio) {
    for (const sourceId of audioRecord.sourceIds) {
      if (!sourceMap.has(sourceId)) errors.push(`${audioRecord.id}: unknown source ${sourceId}`);
    }
    if (audioRecord.publicationState === "public" && audioRecord.reviewStatus !== "publishable") {
      errors.push(`${audioRecord.id}: public audio must be publishable`);
    }
    if (audioRecord.publicationState === "public" && !["ready", "published"].includes(audioRecord.assetStatus)) {
      errors.push(`${audioRecord.id}: public audio must have a ready or published asset`);
    }
    if (audioRecord.publicationState === "public" && ["unknown", "restricted"].includes(audioRecord.rightsStatus)) {
      errors.push(`${audioRecord.id}: public audio cannot have uncleared rights`);
    }
    if (audioRecord.publicationState === "public") {
      const missing = missingChecks(AUDIO_REVIEW_CHECKS, reviewsFor("audio", audioRecord.id));
      if (missing.length > 0) errors.push(`${audioRecord.id}: public audio requires completed review checks: ${missing.join(", ")}`);
    }
  }
  const validReviewSubjects = new Set([
    ...entities.map((entity) => `entity:${entity.kind}:${entity.slug}`),
    ...relations.map((relation) => `relation:${relation.id}`),
    ...audio.map((record) => `audio:${record.id}`),
  ]);
  for (const review of reviews) {
    if (!validReviewSubjects.has(`${review.subjectKind}:${review.subjectKey}`)) errors.push(`${review.id}: unknown review subject ${review.subjectKind}:${review.subjectKey}`);
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));

  if (databaseBundlePath) {
    const sourceUuidMap = new Map(sources.map((source) => [source.id, uuidV5(namespace, `source:${source.id}`)]));
    const entityUuid = (kind: string, slug: string) => uuidV5(namespace, `${kind}:${slug}`);
    const databaseEntities = [
      ...traditions.map((tradition) => ({
        id: entityUuid("tradition", tradition.slug), kind: "tradition" as const, slug: tradition.slug,
        publicationState: "preview" as const, reviewStatus: "bilingual_reviewed" as const,
        primaryEvidenceLayer: "scholarly_interpretation" as const, importance: 5, isFeatured: true, contentVersion: profile.contentVersion,
      })),
      ...entities.map((entity) => ({
        id: entityUuid(entity.kind, entity.slug), kind: entity.kind, slug: entity.slug, publicationState: entity.publicationState,
        reviewStatus: entity.reviewStatus, primaryEvidenceLayer: entity.primaryEvidenceLayer, importance: entity.importance,
        isFeatured: entity.isFeatured, contentVersion: profile.contentVersion,
      })),
    ];
    const translations = [
      ...traditions.flatMap((tradition) => LOCALES.map((locale) => ({
        entityId: entityUuid("tradition", tradition.slug), locale, title: tradition.translations[locale],
        shortSummary: locale === "zh-CN" ? "顶级传统导航与研究分类实体。" : "Top-level tradition navigation and research entity.",
        curatorialDescription: locale === "zh-CN" ? "该顺序只控制策展导航，不表达传统之间的价值高低。" : "Its order controls curatorial navigation and does not express a hierarchy of value.",
        researchNote: locale === "zh-CN" ? "子传统、历史称谓和边界将在后续批次独立建模。" : "Sub-traditions, historical names and boundaries will be modelled separately.",
        timeLabel: locale === "zh-CN" ? "跨时期传统分类" : "Transhistorical tradition category", keyFacts: [],
      }))),
      ...entities.flatMap((entity) => LOCALES.map((locale) => {
        const translation = entity.translations[locale];
        return {
          entityId: entityUuid(entity.kind, entity.slug), locale, title: translation.title,
          ...(translation.subtitle ? { subtitle: translation.subtitle } : {}), shortSummary: translation.shortSummary,
          curatorialDescription: translation.curatorialDescription.join("\n\n"), researchNote: translation.researchNote,
          timeLabel: translation.timeLabel, keyFacts: translation.keyFacts, ...(translation.quote ? { quote: translation.quote } : {}),
        };
      })),
    ];
    const entitySources = [
      ...traditions.flatMap((tradition) => tradition.sourceIds.map((sourceId, index) => ({
        entityId: entityUuid("tradition", tradition.slug), sourceId: sourceUuidMap.get(sourceId)!, supportRole: "contextualises" as const,
        claimSummary: sourceMap.get(sourceId)!.role["zh-CN"], isPrimary: index === 0,
      }))),
      ...entities.flatMap((entity) => sourceIdsFor(entity).map((sourceId, index) => ({
        entityId: entityUuid(entity.kind, entity.slug), sourceId: sourceUuidMap.get(sourceId)!, supportRole: "contextualises" as const,
        claimSummary: sourceMap.get(sourceId)!.role["zh-CN"], isPrimary: index === 0,
      }))),
    ];
    const bundle = DatabaseImportBundleSchema.parse({
      schemaVersion: "1.0", profile: profile.id, contentVersion: profile.contentVersion, idNamespace: namespace,
      sources: sources.map((source) => ({
        id: sourceUuidMap.get(source.id), canonicalKey: source.id, sourceType: source.sourceType, evidenceGrade: source.evidenceGrade,
        titleOriginal: source.title["zh-CN"], titleZh: source.title["zh-CN"], titleEn: source.title.en, locator: source.locator,
        citationZh: `${source.title["zh-CN"]}。${source.locator}`,
        citationEn: `${source.title.en}. ${source.locator}`,
        rightsStatus: source.rightsStatus, locatorLevel: source.locatorLevel, citationStatus: source.citationStatus,
        ...(source.url ? { url: source.url } : {}),
      })),
      entities: databaseEntities,
      translations,
      profiles: [
        ...traditions.map((tradition) => ({ entityId: entityUuid("tradition", tradition.slug), kind: "tradition" as const, value: { traditionLevel: 0, traditionKind: "top_level", sortOrder: tradition.sortOrder } })),
        ...entities.map((entity) => ({ entityId: entityUuid(entity.kind, entity.slug), kind: entity.kind, value: entity.profile })),
      ],
      entitySources,
      entityTraditions: entities.flatMap((entity) => entity.traditions.map((assignment) => ({
        entityId: entityUuid(entity.kind, entity.slug), traditionId: entityUuid("tradition", assignment.tradition), role: assignment.role,
        isPrimary: assignment.isPrimary, confidence: assignment.confidence, evidenceLayer: assignment.evidenceLayer,
        sourceId: sourceUuidMap.get(assignment.sourceId)!, ...(assignment.note ? { note: assignment.note } : {}),
      }))),
      temporalAssertions: entities.flatMap((entity) => entity.temporalAssertions.map((assertion, index) => ({
        id: uuidV5(namespace, `temporal:${entity.kind}:${entity.slug}:${index}`), entityId: entityUuid(entity.kind, entity.slug),
        predicate: assertion.predicate, timeType: assertion.timeType, ...(assertion.startYear !== undefined ? { startYear: assertion.startYear } : {}),
        ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}), displayDate: assertion.displayDate,
        confidence: assertion.confidence, evidenceLayer: assertion.evidenceLayer, sourceId: sourceUuidMap.get(assertion.sourceId)!,
      }))),
      relations: relations.map((relation) => ({
        id: uuidV5(namespace, relation.id), canonicalKey: relation.id,
        sourceEntityId: entityUuid(relation.source.kind, relation.source.slug), targetEntityId: entityUuid(relation.target.kind, relation.target.slug),
        relationType: relation.relationType, label: relation.label, summary: relation.summary, confidence: relation.confidence,
        evidenceLayer: relation.evidenceLayer, publicationState: relation.publicationState, reviewStatus: relation.reviewStatus,
        temporalAssertions: relation.temporalAssertions,
        sourceIds: relation.sourceIds.map((sourceId) => sourceUuidMap.get(sourceId)!),
      })),
      reviews,
      audio,
    });
    await writeJson(databaseBundlePath, bundle);
  }

  const visibleEntities = visibility === "public"
    ? entities.filter((entity) => entity.publicationState === "public" && entity.reviewStatus === "publishable")
    : entities;
  const visibleEntityMap = new Map(visibleEntities.map((entity) => [`${entity.kind}:${entity.slug}`, entity]));
  const visibleRelations = visibility === "public"
    ? relations.filter((relation) => (
        relation.publicationState === "public" &&
        relation.reviewStatus === "publishable" &&
        visibleEntityMap.has(`${relation.source.kind}:${relation.source.slug}`) &&
        visibleEntityMap.has(`${relation.target.kind}:${relation.target.slug}`)
      ))
    : relations;
  const visibleAudio = visibility === "public"
    ? audio.filter((audioRecord) => (
        audioRecord.publicationState === "public" &&
        audioRecord.reviewStatus === "publishable" &&
        ["ready", "published"].includes(audioRecord.assetStatus)
      ))
    : audio;
  const visibleSourceIds = new Set([
    ...visibleEntities.flatMap(sourceIdsFor),
    ...visibleRelations.flatMap((relation) => [
      ...relation.sourceIds,
      ...relation.temporalAssertions.map((assertion) => assertion.sourceId),
    ]),
    ...visibleAudio.flatMap((record) => record.sourceIds),
  ]);
  const visibleSources = visibility === "public" ? sources.filter((source) => visibleSourceIds.has(source.id)) : sources;

  const reviewQueue = ReadModelReviewQueueSchema.parse({
    contentVersion: profile.contentVersion,
    items: [
      ...visibleEntities.map((entity) => ({ subjectKind: "entity" as const, subjectKey: `${entity.kind}:${entity.slug}`, publicationState: entity.publicationState, reviewStatus: entity.reviewStatus, requiredChecks: requiredEntityChecks(entity) })),
      ...visibleRelations.map((relation) => ({ subjectKind: "relation" as const, subjectKey: relation.id, publicationState: relation.publicationState, reviewStatus: relation.reviewStatus, requiredChecks: RELATION_REVIEW_CHECKS })),
      ...visibleAudio.map((record) => ({ subjectKind: "audio" as const, subjectKey: record.id, publicationState: record.publicationState, reviewStatus: record.reviewStatus, requiredChecks: AUDIO_REVIEW_CHECKS })),
    ].map((subject) => {
      const completed = reviewsFor(subject.subjectKind, subject.subjectKey);
      const completedChecks = [...new Set(completed.filter((review) => ["passed", "waived"].includes(review.status)).map((review) => review.checkKind))];
      const failedChecks = [...new Set(completed.filter((review) => review.status === "failed").map((review) => review.checkKind))];
      const missing = missingChecks(subject.requiredChecks, completed);
      return { ...subject, completedChecks, missingChecks: missing, failedChecks, blocking: missing.length > 0 || failedChecks.length > 0 };
    }),
  });

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(join(outputDirectory, "entities"), { recursive: true });
  await mkdir(join(outputDirectory, "relations"), { recursive: true });
  await mkdir(join(outputDirectory, "audio"), { recursive: true });

  const publicationStates: Record<string, number> = {};
  const reviewStatuses: Record<string, number> = {};
  const evidenceLayers: Record<string, number> = {};
  const traditionCounts: Record<string, number> = {};
  const sourceRights: Record<string, number> = {};
  const sourceLocatorLevels: Record<string, number> = {};
  for (const entity of visibleEntities) {
    increment(publicationStates, entity.publicationState);
    increment(reviewStatuses, entity.reviewStatus);
    increment(evidenceLayers, entity.primaryEvidenceLayer);
    for (const assignment of entity.traditions) increment(traditionCounts, assignment.tradition);
  }
  for (const source of visibleSources) {
    increment(sourceRights, source.rightsStatus);
    increment(sourceLocatorLevels, source.locatorLevel);
  }
  const placeholderEntities = visibleEntities
    .filter((entity) => entity.profile.collectionStatus === "placeholder")
    .map((entity) => `${entity.kind}:${entity.slug}`)
    .sort();
  const publicBlockers: Array<{ code: string; subject: string; detail: string }> = [];
  for (const entity of visibleEntities) {
    const subject = `${entity.kind}:${entity.slug}`;
    if (entity.publicationState !== "public") publicBlockers.push({ code: "NOT_PUBLIC", subject, detail: `publicationState=${entity.publicationState}` });
    if (entity.reviewStatus !== "publishable") publicBlockers.push({ code: "NOT_PUBLISHABLE", subject, detail: `reviewStatus=${entity.reviewStatus}` });
    const linkedSources = sourceIdsFor(entity).map((sourceId) => sourceMap.get(sourceId)).filter((source): source is SourceRecord => Boolean(source));
    if (!linkedSources.some(isVerifiedClaimSource)) {
      publicBlockers.push({ code: "NO_VERIFIED_LOCATOR", subject, detail: "No verified edition/item/precise source locator" });
    }
    if (linkedSources.some((source) => ["unknown", "restricted"].includes(source.rightsStatus))) {
      publicBlockers.push({ code: "SOURCE_RIGHTS_BLOCKED", subject, detail: "At least one linked source has unknown or restricted rights" });
    }
    const queueItem = reviewQueue.items.find((item) => item.subjectKind === "entity" && item.subjectKey === subject);
    if (queueItem?.blocking) publicBlockers.push({ code: "REVIEW_CHECKS_INCOMPLETE", subject, detail: `missing=${queueItem.missingChecks.join(",")}; failed=${queueItem.failedChecks.join(",")}` });
  }
  const warnings = [
    ...placeholderEntities.map((subject) => ({ code: "OBJECT_PLACEHOLDER", subject, detail: "Collection, accession, provenance and media rights are incomplete" })),
    ...visibleSources.filter((source) => source.locatorLevel === "collection" || source.locatorLevel === "topic" || source.citationStatus !== "verified")
      .map((source) => ({ code: "SOURCE_LOCATOR_DRAFT", subject: source.id, detail: `locatorLevel=${source.locatorLevel}; citationStatus=${source.citationStatus}` })),
  ];
  const qualityReport = ContentQualityReportSchema.parse({
    schemaVersion: "1.0", profile: profile.id, contentVersion: profile.contentVersion, visibility,
    counts: { entities: visibleEntities.length, relations: visibleRelations.length, audio: visibleAudio.length, sources: visibleSources.length },
    publicationStates, reviewStatuses, evidenceLayers, traditions: traditionCounts, sourceRights, sourceLocatorLevels,
    placeholderEntities, publicBlockers, warnings,
  });

  const indexes: Record<Locale, Array<{ id: string; kind: string; slug: string; title: string; context: string; tradition: string }>> = {
    "zh-CN": [],
    en: [],
  };
  const entityCounts: Record<string, number> = {};
  for (const entity of [...visibleEntities].sort((a, b) => `${a.kind}:${a.slug}`.localeCompare(`${b.kind}:${b.slug}`))) {
    entityCounts[entity.kind] = (entityCounts[entity.kind] ?? 0) + 1;
    for (const locale of LOCALES) {
      const artifact = toArtifact(entity, locale, sourceMap, visibleEntityMap, namespace);
      await writeJson(join(outputDirectory, "entities", entity.kind, `${entity.slug}.${locale}.json`), artifact);
      indexes[locale].push({
        id: artifact.id,
        kind: artifact.kind,
        slug: artifact.slug,
        title: artifact.title,
        context: artifact.shortSummary,
        tradition: artifact.tradition,
      });
    }
  }

  for (const locale of LOCALES) {
    await writeJson(join(outputDirectory, "relations", `${locale}.json`), ReadModelRelationIndexSchema.parse({
      locale,
      items: visibleRelations.map((relation) => ({
        id: relation.id,
        source: relation.source,
        target: relation.target,
        relationType: relation.relationType,
        label: relation.label[locale],
        summary: relation.summary[locale],
        confidence: relation.confidence,
        evidenceLayer: relation.evidenceLayer,
        sourceIds: relation.sourceIds,
        publicationState: relation.publicationState,
        reviewStatus: relation.reviewStatus,
      })),
    }));
    await writeJson(join(outputDirectory, "audio", `${locale}.json`), ReadModelAudioIndexSchema.parse({
      locale,
      items: visibleAudio.map((audioRecord) => ({
        id: audioRecord.id,
        title: audioRecord.title[locale],
        description: audioRecord.description[locale],
        durationSeconds: audioRecord.durationSeconds,
        transcript: audioRecord.transcript[locale],
        assetStatus: audioRecord.assetStatus,
        publicationState: audioRecord.publicationState,
        reviewStatus: audioRecord.reviewStatus,
        rightsStatus: audioRecord.rightsStatus,
        sourceIds: audioRecord.sourceIds,
      })),
    }));
  }

  for (const locale of LOCALES) {
    await writeJson(join(outputDirectory, "profile", `${locale}.json`), ReadModelProfileSchema.parse({
      id: profile.id,
      locale,
      contentVersion: profile.contentVersion,
      releaseStage: profile.releaseStage,
      capabilities: profile.capabilities,
      topTraditions: profile.topTraditions,
      ...profile.translations[locale],
    }));
    await writeJson(join(outputDirectory, "search", locale, "index.json"), ReadModelSearchIndexSchema.parse({
      locale,
      items: indexes[locale],
    }));
    await writeJson(join(outputDirectory, "sources", locale, "index.json"), ReadModelSourceIndexSchema.parse({
      locale,
      items: visibleSources.map((source) => ({
        id: source.id, title: source.title[locale], locator: source.locator, evidenceGrade: source.evidenceGrade,
        rightsStatus: source.rightsStatus, locatorLevel: source.locatorLevel, citationStatus: source.citationStatus,
        role: source.role[locale], ...(source.url ? { url: source.url } : {}),
        entityCount: visibleEntities.filter((entity) => sourceIdsFor(entity).includes(source.id)).length,
      })),
    }));

    const mapFeatures = visibleEntities.filter((entity) => entity.kind === "place").flatMap((entity) => {
      const place = PlaceProfileSchema.parse(entity.profile);
      if (!place.coordinates || place.placeReality === "sacred_symbolic") return [];
      return [{
        type: "Feature" as const,
        id: uuidV5(namespace, `${entity.kind}:${entity.slug}`),
        geometry: { type: "Point" as const, coordinates: place.coordinates },
        properties: {
          kind: "place" as const, slug: entity.slug, title: entity.translations[locale].title,
          summary: entity.translations[locale].shortSummary, tradition: primaryTradition(entity),
          placeReality: place.placeReality, coordinateConfidence: place.coordinateConfidence,
          evidenceLayer: entity.primaryEvidenceLayer, sourceId: place.geographicSourceId ?? entity.sourceIds[0],
        },
      }];
    });
    await writeJson(join(outputDirectory, "maps", "real", `overview.${locale}.geojson`), ReadModelRealMapSchema.parse({
      type: "FeatureCollection", locale, features: mapFeatures,
    }));
    await writeJson(join(outputDirectory, "maps", "real", `suitang.${locale}.geojson`), ReadModelRealMapSchema.parse({
      type: "FeatureCollection", locale, features: mapFeatures,
    }));

    const timelineEvents = visibleEntities.flatMap((entity) => entity.temporalAssertions.flatMap((assertion, index) => {
      if (assertion.startYear === undefined) return [];
      const assertionEnd = assertion.endYear ?? assertion.startYear;
      if (assertionEnd < 581 || assertion.startYear > 907) return [];
      return [{
        id: uuidV5(namespace, `timeline:${entity.kind}:${entity.slug}:${index}`), kind: entity.kind, slug: entity.slug,
        title: entity.translations[locale].title, summary: entity.translations[locale].shortSummary,
        tradition: primaryTradition(entity), predicate: assertion.predicate, type: assertion.timeType,
        year: assertion.startYear, ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
        displayDate: assertion.displayDate[locale], confidence: assertion.confidence, evidenceLayer: assertion.evidenceLayer, sourceId: assertion.sourceId,
      }];
    })).sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
    await writeJson(join(outputDirectory, "timeline", `suitang.${locale}.json`), ReadModelTimelineSchema.parse({
      locale, title: locale === "zh-CN" ? "隋唐三传统时间切片" : "Sui–Tang timeline across three traditions",
      startYear: 581, endYear: 907, events: timelineEvents,
    }));

    const graphKeys = [...new Set(visibleRelations.flatMap((relation) => [
      `${relation.source.kind}:${relation.source.slug}`, `${relation.target.kind}:${relation.target.slug}`,
    ]))].sort();
    const graphNodes = graphKeys.map((key, index) => {
      const entity = visibleEntityMap.get(key)!;
      const angle = (index / Math.max(1, graphKeys.length)) * Math.PI * 2 - Math.PI / 2;
      return {
        id: key, kind: entity.kind, slug: entity.slug, label: entity.translations[locale].title,
        tradition: primaryTradition(entity), x: 490 + Math.cos(angle) * 215, y: 290 + Math.sin(angle) * 215,
      };
    });
    await writeJson(join(outputDirectory, "graphs", "three-traditions", `overview.${locale}.json`), ReadModelGraphSchema.parse({
      locale, graphType: "three-traditions", title: locale === "zh-CN" ? "三传统关系网络" : "Three-traditions relation network",
      question: locale === "zh-CN" ? "人物、文本、制度与地点如何发生联系？" : "How are figures, texts, institutions and places connected?",
      nodes: graphNodes,
      edges: visibleRelations.map((relation) => ({
        id: relation.id, source: `${relation.source.kind}:${relation.source.slug}`, target: `${relation.target.kind}:${relation.target.slug}`,
        label: relation.label[locale], summary: relation.summary[locale], relationType: relation.relationType,
        evidence: relation.evidenceLayer, confidence: relation.confidence, sourceIds: relation.sourceIds,
      })),
    }));
  }
  await writeJson(join(outputDirectory, "traditions.json"), traditions);

  const report = ContentReportSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    profile: profile.id,
    visibility,
    contentVersion: profile.contentVersion,
    entityCounts,
    sourceCount: visibleSources.length,
    traditionCount: traditions.length,
    relationCount: visibleRelations.length,
    audioCount: visibleAudio.length,
    publicEntityCount: entities.filter((entity) => entity.publicationState === "public").length,
  });
  await writeJson(join(outputDirectory, "manifest", "content-report.json"), report);
  await writeJson(join(outputDirectory, "manifest", "content-version.json"), ReadModelManifestSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    profile: profile.id,
    visibility,
    contentVersion: profile.contentVersion,
    releaseStage: profile.releaseStage,
    locales: LOCALES,
    entityCounts,
    sourceCount: visibleSources.length,
    traditionCount: traditions.length,
    relationCount: visibleRelations.length,
    audioCount: visibleAudio.length,
    idNamespace: namespace,
  }));

  await writeJson(join(outputDirectory, "manifest", "quality-report.json"), qualityReport);
  await writeJson(join(outputDirectory, "manifest", "review-queue.json"), reviewQueue);
  await writeJson(join(outputDirectory, "manifest", "routes.json"), ReadModelRoutesManifestSchema.parse({
    contentVersion: profile.contentVersion,
    locales: LOCALES,
    routes: visibleEntities.map((entity) => ({ kind: entity.kind, slug: entity.slug, locales: LOCALES, publicationState: entity.publicationState })),
  }));

  const checksumFiles = (await listJsonFiles(outputDirectory)).filter((path) => !path.endsWith("/checksums.json"));
  const checksums: Record<string, { sha256: string; bytes: number }> = {};
  for (const path of checksumFiles) {
    const value = await readFile(path);
    checksums[relative(outputDirectory, path)] = { sha256: createHash("sha256").update(value).digest("hex"), bytes: value.length };
  }
  await writeJson(join(outputDirectory, "manifest", "checksums.json"), ReadModelChecksumsSchema.parse({
    algorithm: "sha256", contentVersion: profile.contentVersion, files: checksums,
  }));

  return { outputDirectory, visibility, entityCounts, sourceCount: visibleSources.length, traditionCount: traditions.length, relationCount: visibleRelations.length, audioCount: visibleAudio.length, publicBlockerCount: publicBlockers.length };
}
