import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  AudioRecordSchema,
  ComparisonSetSchema,
  ContentProfileSchema,
  ContentQualityReportSchema,
  ContentReportSchema,
  ContentVisibilitySchema,
  DatabaseImportBundleSchema,
  EntityContentSchema,
  FigureProfileSchema,
  InstitutionProfileSchema,
  PassageProfileSchema,
  PlaceProfileSchema,
  PublicReleaseCandidateSchema,
  ReadModelRelationIndexSchema,
  ReadModelRealMapSchema,
  ReadModelTimelineSchema,
  ReadModelGraphSchema,
  ReadModelEntityArtifactSchema,
  ReadModelAudioIndexSchema,
  ReadModelManifestSchema,
  ReadModelProfileSchema,
  ReadModelChecksumsSchema,
  ReadModelComparisonSchema,
  ReadModelTextReadingSchema,
  ReadModelRoutesManifestSchema,
  ReadModelReviewQueueSchema,
  ReadModelSacredCosmosSchema,
  ReadModelSourceIndexSchema,
  ReviewCheckRecordSchema,
  ReadModelSearchIndexSchema,
  SourceRecordSchema,
  TextVersionProfileSchema,
  TextReadingSetSchema,
  TraditionContentSchema,
  RelationRecordSchema,
  RouteProfileSchema,
  type ContentProfile,
  type ContentVisibility,
  type ComparisonSet,
  type TextReadingSet,
  type EntityContent,
  type AudioRecord,
  type PublicReleaseCandidate,
  type ReadModelEntityArtifact,
  type Locale,
  type RelationRecord,
  type ReviewCheckKind,
  type ReviewCheckRecord,
  type ReviewStatus,
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

const ENTITY_REVIEW_CHECKS: ReviewCheckKind[] = ["schema", "fact", "bilingual", "rights", "accessibility", "editorial"];
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
  const variantSourceIds = entity.kind === "passage"
    ? PassageProfileSchema.parse(entity.profile).variantReadings.flatMap((variant) => variant.sourceIds)
    : [];
  return [...new Set([
    ...entity.sourceIds,
    ...entity.traditions.map((item) => item.sourceId),
    ...entity.temporalAssertions.map((item) => item.sourceId),
    ...variantSourceIds,
  ])];
}

function entityKey(kind: string, slug: string): string {
  return `${kind}:${slug}`;
}

function normalisedProfile(entity: EntityContent): Record<string, unknown> {
  if (entity.kind === "figure") return FigureProfileSchema.parse(entity.profile);
  if (entity.kind === "passage") return PassageProfileSchema.parse(entity.profile);
  return entity.profile;
}

function structuralDependencies(entity: EntityContent): string[] {
  if (entity.kind === "text_version") {
    const profile = TextVersionProfileSchema.parse(entity.profile);
    return [entityKey("text", profile.textSlug)];
  }
  if (entity.kind === "passage") {
    const profile = PassageProfileSchema.parse(entity.profile);
    return [entityKey("text", profile.textSlug), entityKey("text_version", profile.textVersionSlug)];
  }
  if (entity.kind === "institution") {
    const profile = InstitutionProfileSchema.parse(entity.profile);
    return profile.physicalPlaceSlug ? [entityKey("place", profile.physicalPlaceSlug)] : [];
  }
  if (entity.kind === "route") {
    const profile = RouteProfileSchema.parse(entity.profile);
    return profile.waypointSlugs.map((slug) => entityKey("place", slug));
  }
  return [];
}

function toArtifact(entity: EntityContent, locale: Locale, sourceMap: Map<string, SourceRecord>, entityMap: Map<string, EntityContent>, namespace: string): EntityArtifact {
  const translation = entity.translations[locale];
  const sources = sourceIdsFor(entity).map((id) => {
    const source = sourceMap.get(id);
    if (!source) throw new Error(`Missing source ${id} for ${entity.kind}/${entity.slug}`);
    return {
      id: source.id,
      title: source.title[locale],
      locator: source.locator,
      grade: source.evidenceGrade,
      role: source.role[locale],
      ...(source.url ? { url: source.url } : {}),
    };
  });

  const related = entity.related.flatMap((item) => {
    const target = entityMap.get(`${item.kind}:${item.slug}`);
    if (!target) return [];
    return [{
      kind: item.kind,
      slug: item.slug,
      title: item.title[locale],
      relation: item.relation[locale],
    }];
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
    profile: normalisedProfile(entity),
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
  const textReadingsPath = resolve(contentRoot, "dao-ru-fo/text-readings.json");
  const comparisonsPath = resolve(contentRoot, "dao-ru-fo/comparisons.json");
  const reviewsPath = resolve(contentRoot, "dao-ru-fo/reviews.json");
  const releaseCandidatePath = resolve(contentRoot, "dao-ru-fo/public-rc.json");
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

  const releaseCandidateResult = PublicReleaseCandidateSchema.safeParse(await readJson(releaseCandidatePath));
  if (!releaseCandidateResult.success) throw new Error(validationMessage(releaseCandidatePath, releaseCandidateResult.error.issues));
  const releaseCandidate: PublicReleaseCandidate = releaseCandidateResult.data;
  if (releaseCandidate.profile !== profile.id) throw new Error("Public release candidate profile must match content profile");
  if (releaseCandidate.contentVersion !== profile.contentVersion) {
    throw new Error(`Public release candidate ${releaseCandidate.id} targets ${releaseCandidate.contentVersion}, current content is ${profile.contentVersion}`);
  }

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

  const comparisonsResult = ComparisonSetSchema.array().safeParse(await readJson(comparisonsPath));
  if (!comparisonsResult.success) throw new Error(validationMessage(comparisonsPath, comparisonsResult.error.issues));
  const comparisons: ComparisonSet[] = comparisonsResult.data;
  if (new Set(comparisons.map((comparison) => comparison.slug)).size !== comparisons.length) {
    throw new Error("Duplicate comparison set slugs are not allowed");
  }

  const textReadingsResult = TextReadingSetSchema.array().safeParse(await readJson(textReadingsPath));
  if (!textReadingsResult.success) throw new Error(validationMessage(textReadingsPath, textReadingsResult.error.issues));
  const textReadings: TextReadingSet[] = textReadingsResult.data;
  if (new Set(textReadings.map((reading) => reading.slug)).size !== textReadings.length) {
    throw new Error("Duplicate text reading set slugs are not allowed");
  }

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
  const readModelReviewCheck = (review: ReviewCheckRecord) => ({
    id: review.id,
    checkKind: review.checkKind,
    status: review.status,
    reviewer: review.reviewer,
    ...(review.reviewedAt ? { reviewedAt: review.reviewedAt } : {}),
    ...(review.note ? { note: review.note } : {}),
  });
  const reviewEvidenceFor = (
    subjectKind: ReviewCheckRecord["subjectKind"],
    subjectKey: string,
    reviewStatus: ReviewStatus,
    requiredChecks: ReviewCheckKind[],
  ) => {
    const checks = reviewsFor(subjectKind, subjectKey);
    const completedChecks = [...new Set(checks.filter((review) => ["passed", "waived"].includes(review.status)).map((review) => review.checkKind))];
    const failedChecks = [...new Set(checks.filter((review) => review.status === "failed").map((review) => review.checkKind))];
    const missingChecksForSubject = missingChecks(requiredChecks, checks);
    return {
      subjectKind,
      subjectKey,
      reviewStatus,
      requiredChecks,
      completedChecks,
      missingChecks: missingChecksForSubject,
      failedChecks,
      blocking: missingChecksForSubject.length > 0 || failedChecks.length > 0,
      checks: checks.map(readModelReviewCheck),
    };
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
      for (const variant of profile.variantReadings) {
        for (const sourceId of variant.sourceIds) {
          if (!sourceMap.has(sourceId)) errors.push(`${key}: variant ${variant.id} points to unknown source ${sourceId}`);
        }
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

  const allEntityKeys = new Set(entities.map((entity) => entityKey(entity.kind, entity.slug)));
  for (const comparison of comparisons) {
    for (const key of comparison.entityKeys) {
      if (!allEntityKeys.has(key)) errors.push(`${comparison.slug}: comparison entity ${key} is not in the content batch`);
    }
  }
  for (const reading of textReadings) {
    for (const key of reading.passageKeys) {
      if (!allEntityKeys.has(key)) errors.push(`${reading.slug}: text reading passage ${key} is not in the content batch`);
    }
    if (reading.readingMode === "same_text_versions") {
      const selectedPassages = reading.passageKeys
        .map((key) => entityMap.get(key))
        .filter((entity): entity is EntityContent => Boolean(entity && entity.kind === "passage"));
      const textSlugs = [...new Set(selectedPassages.map((passage) => PassageProfileSchema.parse(passage.profile).textSlug))];
      const versionSlugs = new Set(selectedPassages.map((passage) => PassageProfileSchema.parse(passage.profile).textVersionSlug));
      if (reading.textSlug && textSlugs.some((textSlug) => textSlug !== reading.textSlug)) {
        errors.push(`${reading.slug}: same-text reading passages must all point to text:${reading.textSlug}`);
      }
      if (versionSlugs.size < 2) {
        errors.push(`${reading.slug}: same-text reading must include at least two distinct text versions`);
      }
    }
  }
  const selectedEntityKeys = new Set([...releaseCandidate.coreEntities, ...releaseCandidate.dependencyEntities]);
  for (const key of selectedEntityKeys) {
    if (!allEntityKeys.has(key)) errors.push(`${releaseCandidate.id}: selected entity ${key} is not in the content batch`);
  }
  const relationMap = new Map(relations.map((relation) => [relation.id, relation]));
  const selectedRelationIds = new Set(releaseCandidate.relations);
  const excludedRelationIds = new Set(releaseCandidate.excludedRelations.map((relation) => relation.id));
  for (const relationId of [...selectedRelationIds, ...excludedRelationIds]) {
    if (!relationMap.has(relationId)) errors.push(`${releaseCandidate.id}: selected relation ${relationId} is not in the content batch`);
  }
  for (const relationId of selectedRelationIds) {
    const relation = relationMap.get(relationId);
    if (!relation) continue;
    for (const endpoint of [relation.source, relation.target]) {
      if (!selectedEntityKeys.has(entityKey(endpoint.kind, endpoint.slug))) {
        errors.push(`${releaseCandidate.id}: selected relation ${relationId} requires ${entityKey(endpoint.kind, endpoint.slug)}`);
      }
    }
  }
  for (const relation of relations) {
    const source = entityKey(relation.source.kind, relation.source.slug);
    const target = entityKey(relation.target.kind, relation.target.slug);
    if (selectedEntityKeys.has(source) && selectedEntityKeys.has(target) && !selectedRelationIds.has(relation.id) && !excludedRelationIds.has(relation.id)) {
      errors.push(`${releaseCandidate.id}: internal relation ${relation.id} must be selected or explicitly excluded with a reason`);
    }
  }
  for (const key of selectedEntityKeys) {
    const entity = entityMap.get(key);
    if (!entity) continue;
    for (const dependency of structuralDependencies(entity)) {
      if (!selectedEntityKeys.has(dependency)) errors.push(`${releaseCandidate.id}: ${key} requires structural dependency ${dependency}`);
    }
  }
  const coreTraditions = new Set(releaseCandidate.coreEntities.flatMap((key) => {
    const entity = entityMap.get(key);
    return entity ? [primaryTradition(entity)] : [];
  }));
  for (const tradition of ["daoism", "confucianism", "buddhism"] as const) {
    if (!coreTraditions.has(tradition)) errors.push(`${releaseCandidate.id}: core selection must represent ${tradition}`);
  }
  const audioMap = new Map(audio.map((record) => [record.id, record]));
  for (const audioId of releaseCandidate.audio) {
    if (!audioMap.has(audioId)) errors.push(`${releaseCandidate.id}: selected audio ${audioId} is not in the content batch`);
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
    const relationUuid = (id: string) => uuidV5(namespace, id);
    const audioUuid = (id: string) => uuidV5(namespace, id);
    const selectionChecksumSha256 = createHash("sha256").update(JSON.stringify({
      coreEntities: releaseCandidate.coreEntities,
      dependencyEntities: releaseCandidate.dependencyEntities,
      relations: releaseCandidate.relations,
      excludedRelations: releaseCandidate.excludedRelations,
      audio: releaseCandidate.audio,
    })).digest("hex");
    const releaseCandidateId = uuidV5(namespace, releaseCandidate.id);
    const parseEntityKey = (key: string) => {
      const separator = key.indexOf(":");
      return { kind: key.slice(0, separator), slug: key.slice(separator + 1) };
    };
    const releaseCandidateSubjects = [
      ...releaseCandidate.coreEntities.map((key, index) => ({
        releaseCandidateId, subjectKind: "entity" as const, subjectId: entityUuid(parseEntityKey(key).kind, parseEntityKey(key).slug), role: "core" as const, sortOrder: index,
      })),
      ...releaseCandidate.dependencyEntities.map((key, index) => ({
        releaseCandidateId, subjectKind: "entity" as const, subjectId: entityUuid(parseEntityKey(key).kind, parseEntityKey(key).slug), role: "dependency" as const, sortOrder: index,
      })),
      ...releaseCandidate.relations.map((id, index) => ({
        releaseCandidateId, subjectKind: "relation" as const, subjectId: relationUuid(id), role: "supporting" as const, sortOrder: index,
      })),
      ...releaseCandidate.audio.map((id, index) => ({
        releaseCandidateId, subjectKind: "audio" as const, subjectId: audioUuid(id), role: "supporting" as const, sortOrder: index,
      })),
    ];
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
        ...entities.map((entity) => ({ entityId: entityUuid(entity.kind, entity.slug), kind: entity.kind, value: normalisedProfile(entity) })),
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
        id: relationUuid(relation.id), canonicalKey: relation.id,
        sourceEntityId: entityUuid(relation.source.kind, relation.source.slug), targetEntityId: entityUuid(relation.target.kind, relation.target.slug),
        relationType: relation.relationType, label: relation.label, summary: relation.summary, confidence: relation.confidence,
        evidenceLayer: relation.evidenceLayer, publicationState: relation.publicationState, reviewStatus: relation.reviewStatus,
        temporalAssertions: relation.temporalAssertions, qualifiers: relation.qualifiers,
        sourceIds: relation.sourceIds.map((sourceId) => sourceUuidMap.get(sourceId)!),
      })),
      reviews,
      audio,
      releaseCandidates: [{
        id: releaseCandidateId, canonicalKey: releaseCandidate.id, status: releaseCandidate.status,
        targetReleaseStage: releaseCandidate.targetReleaseStage, contentVersion: releaseCandidate.contentVersion,
        titleZh: releaseCandidate.title["zh-CN"], titleEn: releaseCandidate.title.en,
        scopeZh: releaseCandidate.scope["zh-CN"], scopeEn: releaseCandidate.scope.en,
        selectionChecksumSha256,
      }],
      releaseCandidateSubjects,
      promotions: releaseCandidate.promotion ? [{
        id: uuidV5(namespace, releaseCandidate.promotion.id), releaseCandidateId,
        promotedBy: releaseCandidate.promotion.promotedBy, promotedAt: releaseCandidate.promotion.promotedAt,
        sourceChecksumSha256: releaseCandidate.promotion.sourceChecksumSha256,
        artifactChecksumSha256: releaseCandidate.promotion.artifactChecksumSha256,
        targetVisibility: "public" as const,
      }] : [],
    });
    await writeJson(databaseBundlePath, bundle);
  }

  const visibleEntities = visibility === "public"
    ? entities.filter((entity) => entity.publicationState === "public" && entity.reviewStatus === "publishable")
    : entities;
  const visibleEntityMap = new Map(visibleEntities.map((entity) => [`${entity.kind}:${entity.slug}`, entity]));
  const visibleComparisons = comparisons.filter((comparison) => comparison.entityKeys.every((key) => visibleEntityMap.has(key)));
  const visibleTextReadings = textReadings.filter((reading) => reading.passageKeys.every((key) => visibleEntityMap.has(key)));
  if (visibility === "public") {
    for (const entity of visibleEntities) {
      for (const dependency of structuralDependencies(entity)) {
        if (!visibleEntityMap.has(dependency)) {
          errors.push(`${entityKey(entity.kind, entity.slug)}: public artifact requires public structural dependency ${dependency}`);
        }
      }
    }
    if (errors.length > 0) throw new Error(errors.join("\n"));
  }
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
      return { ...subject, completedChecks, missingChecks: missing, failedChecks, checks: completed.map(readModelReviewCheck), blocking: missing.length > 0 || failedChecks.length > 0 };
    }),
  });

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(join(outputDirectory, "entities"), { recursive: true });
  await mkdir(join(outputDirectory, "relations"), { recursive: true });
  await mkdir(join(outputDirectory, "audio"), { recursive: true });
  await mkdir(join(outputDirectory, "comparisons"), { recursive: true });
  await mkdir(join(outputDirectory, "text-readings"), { recursive: true });

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
        temporalAssertions: relation.temporalAssertions.map((assertion) => ({
          predicate: assertion.predicate,
          timeType: assertion.timeType,
          ...(assertion.startYear !== undefined ? { startYear: assertion.startYear } : {}),
          ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
          displayDate: assertion.displayDate[locale],
          confidence: assertion.confidence,
          evidenceLayer: assertion.evidenceLayer,
          sourceId: assertion.sourceId,
        })),
        qualifiers: relation.qualifiers,
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
      const temporalAssertions = entity.temporalAssertions.filter((assertion) => assertion.startYear !== undefined && assertion.endYear !== undefined);
      const temporalRange = temporalAssertions.length > 0
        ? {
            startYear: Math.min(...temporalAssertions.map((assertion) => assertion.startYear!)),
            endYear: Math.max(...temporalAssertions.map((assertion) => assertion.endYear!)),
          }
        : undefined;
      return [{
        type: "Feature" as const,
        id: uuidV5(namespace, `${entity.kind}:${entity.slug}`),
        geometry: { type: "Point" as const, coordinates: place.coordinates },
        properties: {
          kind: "place" as const, slug: entity.slug, title: entity.translations[locale].title,
          summary: entity.translations[locale].shortSummary, tradition: primaryTradition(entity),
          placeReality: place.placeReality, coordinateConfidence: place.coordinateConfidence,
          evidenceLayer: entity.primaryEvidenceLayer, sourceId: place.geographicSourceId ?? entity.sourceIds[0],
          ...(temporalRange ? { temporalRange } : {}),
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
      return [{
        id: uuidV5(namespace, `timeline:${entity.kind}:${entity.slug}:${index}`), kind: entity.kind, slug: entity.slug,
        title: entity.translations[locale].title, summary: entity.translations[locale].shortSummary,
        tradition: primaryTradition(entity), predicate: assertion.predicate, type: assertion.timeType,
        year: assertion.startYear, ...(assertion.endYear !== undefined ? { endYear: assertion.endYear } : {}),
        displayDate: assertion.displayDate[locale], confidence: assertion.confidence, evidenceLayer: assertion.evidenceLayer, sourceId: assertion.sourceId,
      }];
    })).sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
    const historicalStartYear = timelineEvents[0]?.year ?? 1;
    const historicalEndYear = timelineEvents.reduce((latest, event) => Math.max(latest, event.endYear ?? event.year), historicalStartYear);
    const writeTimeline = (name: string, title: string, startYear: number, endYear: number, events: typeof timelineEvents) =>
      writeJson(join(outputDirectory, "timeline", `${name}.${locale}.json`), ReadModelTimelineSchema.parse({
        locale, title, startYear, endYear, events,
      }));
    await writeTimeline(
      "overview",
      locale === "zh-CN" ? "道·儒·佛全历史时间轴" : "Dao–Ru–Fo historical space-time",
      historicalStartYear,
      historicalEndYear,
      timelineEvents,
    );
    const suitangEvents = timelineEvents.filter((event) => (event.endYear ?? event.year) >= 581 && event.year <= 907);
    await writeTimeline(
      "suitang",
      locale === "zh-CN" ? "隋唐三传统时间切片" : "Sui–Tang timeline across three traditions",
      581,
      907,
      suitangEvents,
    );

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

    const cosmosLayout = {
      daoism: { x: 300, y: 190, zone: "daoist_tradition" },
      confucianism: { x: 510, y: 330, zone: "confucian_tradition" },
      buddhism: { x: 720, y: 190, zone: "buddhist_tradition" },
    } as const;
    const symbolicPlaceEntities = visibleEntities.filter((entity) => {
      if (entity.kind !== "place") return false;
      const place = PlaceProfileSchema.parse(entity.profile);
      return place.placeReality === "sacred_symbolic" && place.canvasX !== undefined && place.canvasY !== undefined && place.cosmosZone;
    });
    const symbolicPlaceNodes = symbolicPlaceEntities.map((entity) => {
      const place = PlaceProfileSchema.parse(entity.profile);
      return {
        id: entityKey(entity.kind, entity.slug),
        kind: "place" as const,
        slug: entity.slug,
        label: entity.translations[locale].title,
        shortLabel: entity.translations[locale].title.slice(0, 6),
        summary: entity.translations[locale].shortSummary,
        tradition: primaryTradition(entity),
        zone: place.cosmosZone!,
        x: place.canvasX!,
        y: place.canvasY!,
        evidenceLayer: entity.primaryEvidenceLayer,
        sourceIds: sourceIdsFor(entity),
      };
    });
    const symbolicPlaceIds = new Set(symbolicPlaceNodes.map((node) => node.id));
    const symbolicFigureEntities = visibleEntities.filter((entity) => {
      if (entity.kind !== "figure") return false;
      const figure = FigureProfileSchema.parse(entity.profile);
      return ["traditional_sage", "sacred_figure", "mythic_persona"].includes(figure.figureClass);
    });
    const symbolicFigureNodes = symbolicFigureEntities.map((entity, index) => {
      const anchorRelation = visibleRelations.find((relation) =>
        relation.source.kind === "figure" && relation.source.slug === entity.slug &&
        ["remembered_in", "deified_as"].includes(relation.relationType) &&
        relation.target.kind === "place" && symbolicPlaceIds.has(entityKey(relation.target.kind, relation.target.slug)),
      );
      const anchor = anchorRelation
        ? symbolicPlaceNodes.find((node) => node.id === entityKey(anchorRelation.target.kind, anchorRelation.target.slug))
        : undefined;
      const fallbackX = 110 + (index % 7) * 126;
      const fallbackY = 478 + Math.floor(index / 7) * 52;
      return {
        id: entityKey(entity.kind, entity.slug),
        kind: "figure" as const,
        slug: entity.slug,
        label: entity.translations[locale].title,
        shortLabel: entity.translations[locale].title.slice(0, 5),
        summary: entity.translations[locale].shortSummary,
        tradition: primaryTradition(entity),
        zone: anchor?.zone ?? "symbolic_figure",
        x: anchor ? anchor.x : fallbackX,
        y: anchor ? Math.min(540, anchor.y + 64) : fallbackY,
        evidenceLayer: entity.primaryEvidenceLayer,
        sourceIds: sourceIdsFor(entity),
      };
    });
    const cosmosNodes = [
      ...traditions.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((tradition) => {
        const layout = cosmosLayout[tradition.slug];
        return {
          id: `tradition:${tradition.slug}`,
          kind: "tradition" as const,
          slug: tradition.slug,
          label: tradition.translations[locale],
          shortLabel: tradition.slug === "daoism" ? (locale === "zh-CN" ? "道" : "Dao") : tradition.slug === "confucianism" ? (locale === "zh-CN" ? "儒" : "Ru") : (locale === "zh-CN" ? "佛" : "Fo"),
          summary: locale === "zh-CN"
            ? "传统名称节点；不把不同传统压缩成一套统一神学。"
            : "A tradition node; distinct traditions are not collapsed into one theology.",
          tradition: tradition.slug,
          zone: layout.zone,
          x: layout.x,
          y: layout.y,
          evidenceLayer: "scholarly_interpretation" as const,
          sourceIds: tradition.sourceIds,
        };
      }),
      {
        id: "symbolic:encounter",
        kind: "symbolic_node" as const,
        slug: "encounter",
        label: locale === "zh-CN" ? "相遇" : "Encounter",
        shortLabel: locale === "zh-CN" ? "相遇" : "Encounter",
        summary: locale === "zh-CN" ? "策展比较节点，不是共同神学实体。" : "A curatorial comparison node, not a shared theological entity.",
        tradition: "convergence" as const,
        zone: "comparative_encounter",
        x: 510,
        y: 260,
        evidenceLayer: "scholarly_interpretation" as const,
        sourceIds: ["source:editorial-method"],
      },
      ...symbolicPlaceNodes,
      ...symbolicFigureNodes,
    ];
    const cosmosNodeIds = new Set(cosmosNodes.map((node) => node.id));
    const traditionEdgeIds = new Set(cosmosNodes.filter((node) => node.kind === "tradition").map((node) => node.id));
    const cosmosEdges = [
      ...traditions.map((tradition) => ({
        id: `cosmos:frame:${tradition.slug}`,
        source: "symbolic:encounter",
        target: `tradition:${tradition.slug}`,
        relationType: "comparative_parallel" as const,
        label: locale === "zh-CN" ? "比较框架" : "Comparative frame",
        summary: locale === "zh-CN" ? "表示相遇与并置，不表示教义等同。" : "Marks encounter and juxtaposition, not doctrinal equivalence.",
        confidence: "high" as const,
        evidenceLayer: "scholarly_interpretation" as const,
        sourceIds: ["source:editorial-method"],
      })),
      ...visibleRelations.flatMap((relation) => {
        if (relation.relationType !== "comparative_parallel") return [];
        const sourceEntity = visibleEntityMap.get(entityKey(relation.source.kind, relation.source.slug));
        const targetEntity = visibleEntityMap.get(entityKey(relation.target.kind, relation.target.slug));
        if (!sourceEntity || !targetEntity) return [];
        const sourceTradition = primaryTradition(sourceEntity);
        const targetTradition = primaryTradition(targetEntity);
        const sourceNode = `tradition:${sourceTradition}`;
        const targetNode = `tradition:${targetTradition}`;
        if (sourceTradition === "convergence" || targetTradition === "convergence" || sourceTradition === targetTradition || !traditionEdgeIds.has(sourceNode) || !traditionEdgeIds.has(targetNode)) return [];
        return [{
          id: relation.id,
          source: sourceNode,
          target: targetNode,
          relationType: relation.relationType,
          label: relation.label[locale],
          summary: relation.summary[locale],
          confidence: relation.confidence,
          evidenceLayer: relation.evidenceLayer,
          sourceIds: relation.sourceIds,
        }];
      }),
      ...visibleRelations.flatMap((relation) => {
        if (!["remembered_in", "deified_as", "received_by", "represented_by"].includes(relation.relationType)) return [];
        const source = entityKey(relation.source.kind, relation.source.slug);
        const target = entityKey(relation.target.kind, relation.target.slug);
        if (!cosmosNodeIds.has(source) || !cosmosNodeIds.has(target)) return [];
        return [{
          id: relation.id,
          source,
          target,
          relationType: relation.relationType,
          label: relation.label[locale],
          summary: relation.summary[locale],
          confidence: relation.confidence,
          evidenceLayer: relation.evidenceLayer,
          sourceIds: relation.sourceIds,
        }];
      }),
    ];
    await writeJson(join(outputDirectory, "maps", "cosmos", `overview.${locale}.json`), ReadModelSacredCosmosSchema.parse({
      locale,
      layer: "sacred_symbolic",
      title: locale === "zh-CN" ? "道·儒·佛象征空间" : "Dao–Ru–Fo symbolic space",
      description: locale === "zh-CN"
        ? "以传统节点、比较关系和策展相遇点呈现象征空间；它不使用现实经纬度。"
        : "A symbolic space of tradition nodes, comparative relations and a curatorial encounter point; it uses no real-world coordinates.",
      disclaimer: locale === "zh-CN"
        ? "象征空间不是现实地图，也不把道、儒、佛压缩成同一套宇宙观。"
        : "Symbolic space is not a real map and does not collapse Daoist, Confucian and Buddhist cosmologies into one system.",
      nodes: cosmosNodes,
      edges: cosmosEdges,
    }));

    const relationTypesForAxis = {
      speech: new Set(["attributed_to", "represented_by"]),
      space: new Set(["located_in", "active_in", "travelled_through", "occurred_at", "route_connects", "institutional_context"]),
      events: new Set(["participated_in", "influenced"]),
      texts: new Set(["has_version", "passage_of", "quoted_from_version", "commented_on", "translated_or_transmitted", "attributed_to", "received_by", "represented_by"]),
      reception: new Set(["received_by", "remembered_in", "deified_as", "represented_by", "influenced"]),
    } as const;
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
    const keyForRelationEndpoint = (endpoint: RelationRecord["source"]) => entityKey(endpoint.kind, endpoint.slug);
    const relationForKey = (relation: RelationRecord, key: string) => {
      const sourceKey = keyForRelationEndpoint(relation.source);
      const targetKey = keyForRelationEndpoint(relation.target);
      return sourceKey === key || targetKey === key;
    };
    const otherKeyForRelation = (relation: RelationRecord, key: string) => {
      const sourceKey = keyForRelationEndpoint(relation.source);
      const targetKey = keyForRelationEndpoint(relation.target);
      return sourceKey === key ? targetKey : sourceKey;
    };

    for (const comparison of visibleComparisons) {
      const selectedKeys = new Set(comparison.entityKeys);
      const selectedEntities = comparison.entityKeys.map((key) => visibleEntityMap.get(key)).filter((entity): entity is EntityContent => Boolean(entity));
      const selectedRelationSet = visibleRelations.filter((relation) => {
        const sourceKey = keyForRelationEndpoint(relation.source);
        const targetKey = keyForRelationEndpoint(relation.target);
        return selectedKeys.has(sourceKey) && selectedKeys.has(targetKey);
      });
      const relationDescription = (relation: RelationRecord, selectedKey: string) => {
        const otherKey = otherKeyForRelation(relation, selectedKey);
        const other = visibleEntityMap.get(otherKey);
        const qualifier = [
          relation.qualifiers.spatialRole,
          relation.qualifiers.attributionStatus,
          relation.qualifiers.receptionMode,
        ].filter(Boolean).join(" · ");
        return `${relation.label[locale]} → ${other?.translations[locale].title ?? otherKey}${qualifier ? ` · ${qualifier}` : ""}`;
      };
      const notRecorded = (entity: EntityContent, value: string) => ({
        entityKey: entityKey(entity.kind, entity.slug),
        status: "not_recorded" as const,
        value,
        details: [],
        sourceIds: [],
      });
      const relationCell = (
        entity: EntityContent,
        axis: keyof typeof relationTypesForAxis,
        emptyValue: string,
        relationFilter?: (relation: RelationRecord, other: EntityContent | undefined) => boolean,
      ) => {
        const key = entityKey(entity.kind, entity.slug);
        const matches = visibleRelations.filter((relation) => {
          if (!relationForKey(relation, key)) return false;
          if (!relationTypesForAxis[axis].has(relation.relationType)) return false;
          const other = visibleEntityMap.get(otherKeyForRelation(relation, key));
          return relationFilter ? relationFilter(relation, other) : true;
        });
        if (matches.length === 0) return notRecorded(entity, emptyValue);
        return {
          entityKey: key,
          status: "derived" as const,
          value: locale === "zh-CN" ? `${matches.length} 条关系` : `${matches.length} relation${matches.length === 1 ? "" : "s"}`,
          details: unique(matches.map((relation) => relationDescription(relation, key))),
          evidenceLayer: matches[0].evidenceLayer,
          confidence: matches[0].confidence,
          sourceIds: unique(matches.flatMap((relation) => relation.sourceIds)),
        };
      };
      const axisCells = (axis: (typeof comparison.axes)[number]["id"]) => selectedEntities.map((entity) => {
        const key = entityKey(entity.kind, entity.slug);
        if (axis === "historicity") {
          const profile = entity.kind === "figure" ? FigureProfileSchema.parse(entity.profile) : undefined;
          const values = [
            typeof profile?.historicity === "string" ? profile.historicity : undefined,
            typeof profile?.figureClass === "string" ? profile.figureClass : undefined,
          ].filter((value): value is Exclude<typeof value, undefined> => Boolean(value));
          if (values.length === 0) return notRecorded(entity, locale === "zh-CN" ? "当前档案未声明人物历史性" : "This record does not state a figure historicity");
          return {
            entityKey: key,
            status: "recorded" as const,
            value: values.join(" · "),
            details: [entity.primaryEvidenceLayer],
            evidenceLayer: entity.primaryEvidenceLayer,
            sourceIds: sourceIdsFor(entity),
          };
        }
        if (axis === "tradition") {
          const details = entity.traditions.map((assignment) => {
            const tradition = traditions.find((candidate) => candidate.slug === assignment.tradition);
            const note = assignment.note?.[locale];
            return `${tradition?.translations[locale] ?? assignment.tradition} · ${assignment.role}${note ? ` · ${note}` : ""}`;
          });
          return {
            entityKey: key,
            status: "recorded" as const,
            value: unique(details).join(" / "),
            details: unique(details),
            evidenceLayer: entity.traditions[0].evidenceLayer,
            confidence: entity.traditions[0].confidence,
            sourceIds: unique(entity.traditions.map((assignment) => assignment.sourceId)),
          };
        }
        if (axis === "time") {
          const assertions = entity.temporalAssertions;
          if (assertions.length === 0) return notRecorded(entity, locale === "zh-CN" ? "当前档案没有时间断言" : "This record has no temporal assertion");
          const details = unique(assertions.map((assertion) => `${assertion.predicate}: ${assertion.displayDate[locale]}`));
          return {
            entityKey: key,
            status: "recorded" as const,
            value: unique(assertions.map((assertion) => assertion.displayDate[locale])).join("；"),
            details,
            evidenceLayer: assertions[0].evidenceLayer,
            confidence: assertions[0].confidence,
            sourceIds: unique(assertions.map((assertion) => assertion.sourceId)),
          };
        }
        if (axis === "speech") return relationCell(entity, "speech", locale === "zh-CN" ? "当前关系集中未记录言说归属" : "No speech-attribution link is recorded in the current relation set");
        if (axis === "space") return relationCell(entity, "space", locale === "zh-CN" ? "当前关系集中未记录空间节点" : "No spatial node is recorded in the current relation set", (_relation, other) => Boolean(other && ["place", "institution", "route"].includes(other.kind)));
        if (axis === "events") return relationCell(entity, "events", locale === "zh-CN" ? "当前关系集中未记录事件连接" : "No event connection is recorded in the current relation set", (_relation, other) => other?.kind === "event");
        if (axis === "texts") return relationCell(entity, "texts", locale === "zh-CN" ? "当前关系集中未记录文本连接" : "No text connection is recorded in the current relation set", (_relation, other) => Boolean(other && ["text", "text_version", "passage"].includes(other.kind)));
        if (axis === "reception") return relationCell(entity, "reception", locale === "zh-CN" ? "当前关系集中未记录后世接收" : "No later-reception link is recorded in the current relation set");
        const sourceDetails = unique(sourceIdsFor(entity).map((sourceId) => {
          const source = sourceMap.get(sourceId);
          return source ? `${source.title[locale]} · ${source.evidenceGrade} · ${source.locator}` : sourceId;
        }));
        return {
          entityKey: key,
          status: "recorded" as const,
          value: locale === "zh-CN" ? `${sourceDetails.length} 个来源` : `${sourceDetails.length} source${sourceDetails.length === 1 ? "" : "s"}`,
          details: sourceDetails,
          evidenceLayer: entity.primaryEvidenceLayer,
          sourceIds: sourceIdsFor(entity),
        };
      });

      const bridgeMap = new Map<string, { entityKeys: Set<string>; relationTypes: Set<RelationRecord["relationType"]>; summaries: Set<string>; sourceIds: Set<string> }>();
      for (const relation of visibleRelations) {
        const sourceKey = keyForRelationEndpoint(relation.source);
        const targetKey = keyForRelationEndpoint(relation.target);
        const selectedEndpoint = selectedKeys.has(sourceKey) ? sourceKey : selectedKeys.has(targetKey) ? targetKey : undefined;
        const bridgeKey = selectedEndpoint === sourceKey ? targetKey : selectedEndpoint === targetKey ? sourceKey : undefined;
        if (!selectedEndpoint || !bridgeKey || selectedKeys.has(bridgeKey)) continue;
        const bridge = bridgeMap.get(bridgeKey) ?? { entityKeys: new Set<string>(), relationTypes: new Set<RelationRecord["relationType"]>(), summaries: new Set<string>(), sourceIds: new Set<string>() };
        bridge.entityKeys.add(selectedEndpoint);
        bridge.relationTypes.add(relation.relationType);
        bridge.summaries.add(relation.summary[locale]);
        relation.sourceIds.forEach((sourceId) => bridge.sourceIds.add(sourceId));
        bridgeMap.set(bridgeKey, bridge);
      }
      const bridges = [...bridgeMap.entries()]
        .filter(([, bridge]) => bridge.entityKeys.size >= 2)
        .map(([key, bridge]) => {
          const entity = visibleEntityMap.get(key);
          if (!entity) return undefined;
          return {
            key,
            kind: entity.kind,
            slug: entity.slug,
            title: entity.translations[locale].title,
            entityKeys: [...bridge.entityKeys].sort(),
            relationTypes: [...bridge.relationTypes].sort(),
            summaries: [...bridge.summaries].sort(),
            sourceIds: [...bridge.sourceIds].sort(),
          };
        })
        .filter((bridge): bridge is NonNullable<typeof bridge> => Boolean(bridge));

      await writeJson(join(outputDirectory, "comparisons", `${comparison.slug}.${locale}.json`), ReadModelComparisonSchema.parse({
        schemaVersion: "1.0",
        locale,
        slug: comparison.slug,
        title: comparison.title[locale],
        question: comparison.question[locale],
        disclaimer: comparison.disclaimer[locale],
        entities: selectedEntities.map((entity) => ({
          key: entityKey(entity.kind, entity.slug),
          kind: entity.kind,
          slug: entity.slug,
          title: entity.translations[locale].title,
          tradition: primaryTradition(entity),
          evidence: entity.primaryEvidenceLayer,
          timeLabel: entity.translations[locale].timeLabel,
          summary: entity.translations[locale].shortSummary,
          sourceIds: sourceIdsFor(entity),
        })),
        axes: comparison.axes.map((axis) => ({
          id: axis.id,
          label: axis.label[locale],
          description: axis.description[locale],
          cells: axisCells(axis.id),
        })),
        directRelations: selectedRelationSet.map((relation) => ({
          id: relation.id,
          source: relation.source,
          target: relation.target,
          relationType: relation.relationType,
          label: relation.label[locale],
          summary: relation.summary[locale],
          confidence: relation.confidence,
          evidenceLayer: relation.evidenceLayer,
          sourceIds: relation.sourceIds,
        })),
        bridges,
      }));
    }

    for (const reading of visibleTextReadings) {
      const uniqueReadingValues = (values: string[]) => [...new Set(values.filter(Boolean))];
      const selectedPassages = reading.passageKeys
        .map((key) => visibleEntityMap.get(key))
        .filter((entity): entity is EntityContent => Boolean(entity && entity.kind === "passage"));
      const readingItems = selectedPassages.map((passage) => {
        const passageProfile = PassageProfileSchema.parse(passage.profile);
        const text = visibleEntityMap.get(entityKey("text", passageProfile.textSlug));
        const version = visibleEntityMap.get(entityKey("text_version", passageProfile.textVersionSlug));
        if (!text || !version) throw new Error(`${reading.slug}: passage ${entityKey(passage.kind, passage.slug)} has an unresolved text/version dependency`);
        const versionProfile = TextVersionProfileSchema.parse(version.profile);
        const passageKey = entityKey(passage.kind, passage.slug);
        const sourceIds = uniqueReadingValues([
          ...sourceIdsFor(passage),
          ...sourceIdsFor(text),
          ...sourceIdsFor(version),
        ]);
        const contextKeys = new Set([
          passageKey,
          entityKey(text.kind, text.slug),
          entityKey(version.kind, version.slug),
        ]);
        const contextReviewRelations = visibleRelations.filter((relation) =>
          contextKeys.has(keyForRelationEndpoint(relation.source)) || contextKeys.has(keyForRelationEndpoint(relation.target))
        );
        const reviewEvidence = [
          reviewEvidenceFor("entity", passageKey, passage.reviewStatus, requiredEntityChecks(passage)),
          reviewEvidenceFor("entity", entityKey(text.kind, text.slug), text.reviewStatus, requiredEntityChecks(text)),
          reviewEvidenceFor("entity", entityKey(version.kind, version.slug), version.reviewStatus, requiredEntityChecks(version)),
          ...contextReviewRelations.map((relation) => reviewEvidenceFor("relation", relation.id, relation.reviewStatus, RELATION_REVIEW_CHECKS)),
        ];
        return {
          key: passageKey,
          kind: "passage" as const,
          slug: passage.slug,
          title: passage.translations[locale].title,
          ...(passage.translations[locale].subtitle ? { subtitle: passage.translations[locale].subtitle } : {}),
          tradition: primaryTradition(passage),
          evidence: passage.primaryEvidenceLayer,
          timeLabel: passage.translations[locale].timeLabel,
          sourceIds,
          text: {
            key: entityKey(text.kind, text.slug),
            slug: text.slug,
            title: text.translations[locale].title,
            summary: text.translations[locale].shortSummary,
          },
          version: {
            key: entityKey(version.kind, version.slug),
            slug: version.slug,
            title: version.translations[locale].title,
            versionKind: versionProfile.versionKind,
            languageCode: versionProfile.languageCode,
            citationLabel: versionProfile.citationLabel,
            rightsStatus: versionProfile.rightsStatus,
          },
          passage: {
            title: passage.translations[locale].title,
            passageKind: passageProfile.passageKind,
            locatorOriginal: passageProfile.locatorOriginal,
            locatorNormalised: passageProfile.locatorNormalised,
            originalText: passageProfile.originalText,
            punctuatedText: passageProfile.punctuatedText,
            modernZh: passageProfile.modernZh,
            translationEn: passageProfile.translationEn,
            ritualSensitivity: passageProfile.ritualSensitivity,
            attributionStatus: passageProfile.attributionStatus,
            variantReadings: passageProfile.variantReadings.map((variant) => ({
              id: variant.id,
              kind: variant.kind,
              status: variant.status,
              label: variant.label[locale],
              form: variant.form,
              note: variant.note[locale],
              sourceIds: variant.sourceIds,
            })),
          },
          reviewEvidence,
        };
      });
      const cellFor = (item: (typeof readingItems)[number], axis: (typeof reading.axes)[number]["id"]) => {
        const passage = selectedPassages.find((candidate) => entityKey(candidate.kind, candidate.slug) === item.key)!;
        const sourceIds = item.sourceIds;
        const withReviewEvidence = (cell: Record<string, unknown>) => ({ ...cell, reviewEvidence: item.reviewEvidence });
        const attributionRelations = visibleRelations.filter((relation) => (
          relation.relationType === "attributed_to" && (
            keyForRelationEndpoint(relation.source) === item.key || keyForRelationEndpoint(relation.target) === item.key
          )
        ));
        if (axis === "textual_layer") {
          return withReviewEvidence({
            passageKey: item.key,
            status: "recorded" as const,
            value: `${item.text.title} → ${item.version.title} → ${item.title}`,
            details: [
              locale === "zh-CN" ? `文本：${item.text.title}` : `Text: ${item.text.title}`,
              locale === "zh-CN" ? `版本：${item.version.title}` : `Version: ${item.version.title}`,
              locale === "zh-CN" ? `段落：${item.title}` : `Passage: ${item.title}`,
            ],
            evidenceLayer: passage.primaryEvidenceLayer,
            sourceIds,
          });
        }
        if (axis === "locator") {
          return withReviewEvidence({
            passageKey: item.key,
            status: "recorded" as const,
            value: item.passage.locatorNormalised,
            details: [item.passage.locatorOriginal],
            evidenceLayer: passage.primaryEvidenceLayer,
            sourceIds: uniqueReadingValues(sourceIdsFor(passage)),
          });
        }
        if (axis === "wording") {
          return withReviewEvidence({
            passageKey: item.key,
            status: "recorded" as const,
            value: item.passage.originalText,
            details: [locale === "zh-CN" ? `当前断句：${item.passage.punctuatedText}` : `Punctuation: ${item.passage.punctuatedText}`],
            evidenceLayer: passage.primaryEvidenceLayer,
            sourceIds: uniqueReadingValues(sourceIdsFor(passage)),
          });
        }
        if (axis === "attribution") {
          const relationDetails = attributionRelations.map((relation) => {
            const otherKey = keyForRelationEndpoint(relation.source) === item.key ? keyForRelationEndpoint(relation.target) : keyForRelationEndpoint(relation.source);
            const other = visibleEntityMap.get(otherKey);
            return `${relation.label[locale]} → ${other?.translations[locale].title ?? otherKey}`;
          });
          return withReviewEvidence({
            passageKey: item.key,
            status: relationDetails.length > 0 ? "derived" as const : "recorded" as const,
            value: item.passage.attributionStatus,
            details: relationDetails.length > 0 ? relationDetails : [locale === "zh-CN" ? "段落档案中的归属状态" : "Attribution status recorded in the passage profile"],
            evidenceLayer: attributionRelations[0]?.evidenceLayer ?? passage.primaryEvidenceLayer,
            confidence: attributionRelations[0]?.confidence,
            sourceIds: uniqueReadingValues([...sourceIdsFor(passage), ...attributionRelations.flatMap((relation) => relation.sourceIds)]),
          });
        }
        if (axis === "interpretation") {
          return withReviewEvidence({
            passageKey: item.key,
            status: "recorded" as const,
            value: locale === "zh-CN" ? item.passage.modernZh : item.passage.translationEn,
            details: [locale === "zh-CN" ? `English: ${item.passage.translationEn}` : `现代汉语：${item.passage.modernZh}`],
            evidenceLayer: passage.primaryEvidenceLayer,
            sourceIds,
          });
        }
        if (axis === "time") {
          const assertions = passage.temporalAssertions;
          if (assertions.length === 0) {
            return withReviewEvidence({
              passageKey: item.key,
              status: "not_recorded" as const,
              value: locale === "zh-CN" ? "当前段落没有时间断言" : "This passage has no temporal assertion",
              details: [],
              sourceIds: [],
            });
          }
          return withReviewEvidence({
            passageKey: item.key,
            status: "recorded" as const,
            value: uniqueReadingValues(assertions.map((assertion) => assertion.displayDate[locale])).join("；"),
            details: uniqueReadingValues(assertions.map((assertion) => `${assertion.predicate}: ${assertion.displayDate[locale]}`)),
            evidenceLayer: assertions[0].evidenceLayer,
            confidence: assertions[0].confidence,
            sourceIds: uniqueReadingValues(assertions.map((assertion) => assertion.sourceId)),
          });
        }
        const evidenceDetails = uniqueReadingValues(sourceIds.map((sourceId) => {
          const source = sourceMap.get(sourceId);
          return source ? `${source.title[locale]} · ${source.evidenceGrade} · ${source.locator}` : sourceId;
        }));
        return withReviewEvidence({
          passageKey: item.key,
          status: "recorded" as const,
          value: locale === "zh-CN" ? `${evidenceDetails.length} 个来源` : `${evidenceDetails.length} source${evidenceDetails.length === 1 ? "" : "s"}`,
          details: [...evidenceDetails, `${locale === "zh-CN" ? "版本权利" : "Version rights"}: ${item.version.rightsStatus}`],
          evidenceLayer: passage.primaryEvidenceLayer,
          sourceIds,
        });
      };
      const contextKeys = new Set(readingItems.flatMap((item) => [item.key, item.text.key, item.version.key]));
      const contextRelations = visibleRelations
        .filter((relation) => contextKeys.has(keyForRelationEndpoint(relation.source)) || contextKeys.has(keyForRelationEndpoint(relation.target)))
        .map((relation) => ({
          id: relation.id,
          source: relation.source,
          target: relation.target,
          relationType: relation.relationType,
          label: relation.label[locale],
          summary: relation.summary[locale],
          confidence: relation.confidence,
          evidenceLayer: relation.evidenceLayer,
          sourceIds: relation.sourceIds,
        }));
      await writeJson(join(outputDirectory, "text-readings", `${reading.slug}.${locale}.json`), ReadModelTextReadingSchema.parse({
        schemaVersion: "1.0",
        locale,
        slug: reading.slug,
        readingMode: reading.readingMode,
        ...(reading.textSlug ? { textSlug: reading.textSlug } : {}),
        title: reading.title[locale],
        question: reading.question[locale],
        disclaimer: reading.disclaimer[locale],
        readings: readingItems,
        axes: reading.axes.map((axis) => ({
          id: axis.id,
          label: axis.label[locale],
          description: axis.description[locale],
          cells: readingItems.map((item) => cellFor(item, axis.id)),
        })),
        contextRelations,
      }));
    }
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
