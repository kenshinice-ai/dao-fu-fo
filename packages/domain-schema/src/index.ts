import { z } from "zod";

export const LocaleSchema = z.enum(["zh-CN", "en"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const TraditionSlugSchema = z.enum(["daoism", "confucianism", "buddhism"]);
export type TraditionSlug = z.infer<typeof TraditionSlugSchema>;

export const EntityKindSchema = z.enum([
  "tradition",
  "figure",
  "text",
  "text_version",
  "passage",
  "concept",
  "school",
  "institution",
  "practice",
  "place",
  "event",
  "route",
  "museum_object",
]);
export type EntityKind = z.infer<typeof EntityKindSchema>;

export const CapabilitySchema = z.enum([
  "exhibitions",
  "realMap",
  "sacredCosmos",
  "historicalTimeline",
  "traditionalTimeline",
  "relationGraphs",
  "passages",
  "audio",
  "compare",
  "researchLayer",
]);
export type Capability = z.infer<typeof CapabilitySchema>;

export const TemporalPredicateSchema = z.enum([
  "birth", "death", "life", "activity", "composition", "compilation", "translation", "commentary", "publication",
  "foundation", "founding", "dissolution", "event_time", "route_time", "route_activity", "departure", "return",
  "cult_emergence", "deification", "textual_attestation", "traditional_occurrence", "object_creation", "object_discovery",
  "object_collection", "object_date", "construction", "policy", "conflict_begins", "conflict_ends", "dynastic_transition",
  "period_boundary", "site_activity", "analytic_scope", "analytic_period", "cultural_landscape", "circulation_scope",
  "composition_context", "geographic_and_religious_scope", "institutional_activity", "institutional_and_memory_scope",
  "institutional_circulation", "institutional_scope", "pilgrimage_and_learning_scope", "regional_exchange", "research_scope",
  "textual_circulation", "version_scope",
]);
export type TemporalPredicate = z.infer<typeof TemporalPredicateSchema>;

export const RelationTypeSchema = z.enum([
  "located_in", "active_in", "travelled_through", "translated_or_transmitted", "has_version", "passage_of",
  "quoted_from_version", "commented_on", "institutional_context", "influenced", "contemporary_with", "represented_by",
  "route_connects", "comparative_parallel",
]);
export type RelationType = z.infer<typeof RelationTypeSchema>;

export const PublicationStateSchema = z.enum(["private", "preview", "public", "withdrawn"]);
export type PublicationState = z.infer<typeof PublicationStateSchema>;

export const ContentVisibilitySchema = z.enum(["preview", "public"]);
export type ContentVisibility = z.infer<typeof ContentVisibilitySchema>;

export const ReviewStatusSchema = z.enum([
  "draft",
  "fact_checked",
  "tradition_reviewed",
  "bilingual_reviewed",
  "rights_cleared",
  "publishable",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const ReviewCheckKindSchema = z.enum(["schema", "fact", "tradition", "bilingual", "rights", "accessibility", "editorial"]);
export type ReviewCheckKind = z.infer<typeof ReviewCheckKindSchema>;

export const ReviewCheckRecordSchema = z.object({
  id: z.string().regex(/^review:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  subjectKind: z.enum(["entity", "relation", "audio"]),
  subjectKey: z.string().trim().min(1),
  checkKind: ReviewCheckKindSchema,
  locale: LocaleSchema.optional(),
  status: z.enum(["pending", "passed", "failed", "waived"]),
  reviewer: z.string().trim().min(1),
  reviewedAt: z.string().datetime().optional(),
  note: z.string().trim().min(1).optional(),
}).superRefine((value, context) => {
  if (["passed", "failed", "waived"].includes(value.status) && !value.reviewedAt) {
    context.addIssue({ code: "custom", path: ["reviewedAt"], message: `${value.status} checks require reviewedAt` });
  }
});
export type ReviewCheckRecord = z.infer<typeof ReviewCheckRecordSchema>;

export const EvidenceLayerSchema = z.enum([
  "historical_documented",
  "historical_inferred",
  "traditional_account",
  "mythic_symbolic",
  "later_deification",
  "literary_representation",
  "scholarly_interpretation",
]);
export type EvidenceLayer = z.infer<typeof EvidenceLayerSchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low", "unknown"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const RightsStatusSchema = z.enum([
  "public_domain",
  "open_licensed",
  "permission_granted",
  "quotation_only",
  "external_reference_only",
  "restricted",
  "unknown",
]);
export type RightsStatus = z.infer<typeof RightsStatusSchema>;

export const SourceTypeSchema = z.enum([
  "primary_text",
  "text_edition",
  "inscription",
  "archaeological_report",
  "museum_catalogue",
  "scholarly_book",
  "peer_reviewed_article",
  "reference_work",
  "institutional_record",
  "map_or_gazetteer",
  "image_record",
  "audio_record",
  "rights_record",
  "other",
]);

export const BilingualTextSchema = z.object({
  "zh-CN": z.string().trim().min(1),
  en: z.string().trim().min(1),
});
export type BilingualText = z.infer<typeof BilingualTextSchema>;

export const SourceRecordSchema = z.object({
  id: z.string().trim().min(1),
  sourceType: SourceTypeSchema,
  evidenceGrade: z.enum(["A", "B", "C", "D"]),
  title: BilingualTextSchema,
  locator: z.string().trim().min(1),
  role: BilingualTextSchema,
  rightsStatus: RightsStatusSchema,
  locatorLevel: z.enum(["collection", "topic", "edition", "item", "precise"]).default("topic"),
  citationStatus: z.enum(["draft", "verified"]).default("draft"),
  url: z.string().url().optional(),
});
export type SourceRecord = z.infer<typeof SourceRecordSchema>;

export const KeyFactSchema = z.object({
  label: BilingualTextSchema,
  value: BilingualTextSchema,
});

export const QuoteSchema = z.object({
  original: z.string().trim().min(1),
  interpretation: BilingualTextSchema,
  locator: z.string().trim().min(1),
});

export const EntityTranslationSchema = z.object({
  title: z.string().trim().min(1),
  subtitle: z.string().trim().optional(),
  shortSummary: z.string().trim().min(1),
  curatorialDescription: z.array(z.string().trim().min(1)).min(1),
  researchNote: z.string().trim().min(1),
  timeLabel: z.string().trim().min(1),
  keyFacts: z.array(KeyFactSchema).default([]),
  quote: QuoteSchema.optional(),
});
export type EntityTranslation = z.infer<typeof EntityTranslationSchema>;

export const TraditionAssignmentSchema = z.object({
  tradition: TraditionSlugSchema,
  role: z.enum([
    "primary",
    "secondary",
    "influenced_by",
    "adopted_by",
    "contested_by",
    "syncretic",
    "later_associated",
    "comparative_only",
  ]),
  isPrimary: z.boolean(),
  confidence: ConfidenceSchema,
  evidenceLayer: EvidenceLayerSchema,
  sourceId: z.string().trim().min(1),
  note: BilingualTextSchema.optional(),
});

export const TemporalAssertionSchema = z.object({
  predicate: TemporalPredicateSchema,
  timeType: z.enum(["exact", "range", "circa", "century", "relative_sequence", "traditional_date", "atemporal"]),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  displayDate: BilingualTextSchema,
  confidence: ConfidenceSchema,
  evidenceLayer: EvidenceLayerSchema,
  sourceId: z.string().trim().min(1),
}).superRefine((value, context) => {
  if (value.startYear === 0 || value.endYear === 0) {
    context.addIssue({ code: "custom", message: "year 0 is not allowed" });
  }
  if (value.startYear !== undefined && value.endYear !== undefined && value.endYear < value.startYear) {
    context.addIssue({ code: "custom", message: "endYear cannot be earlier than startYear" });
  }
  if (value.timeType === "atemporal" && (value.startYear !== undefined || value.endYear !== undefined)) {
    context.addIssue({ code: "custom", message: "atemporal assertions cannot have historical years" });
  }
  if (value.timeType === "relative_sequence" && value.startYear === undefined && value.endYear === undefined) {
    context.addIssue({ code: "custom", message: "relative_sequence requires a sequence projection in a future schema revision" });
  }
});

export const RelatedEntitySchema = z.object({
  kind: EntityKindSchema,
  slug: z.string().trim().min(1),
  title: BilingualTextSchema,
  relation: BilingualTextSchema,
});

export const RelationEndpointSchema = z.object({
  kind: EntityKindSchema,
  slug: z.string().trim().min(1),
});
export type RelationEndpoint = z.infer<typeof RelationEndpointSchema>;

export const RelationRecordSchema = z.object({
  id: z.string().regex(/^relation:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  source: RelationEndpointSchema,
  target: RelationEndpointSchema,
  relationType: RelationTypeSchema,
  label: BilingualTextSchema,
  summary: BilingualTextSchema,
  confidence: ConfidenceSchema,
  evidenceLayer: EvidenceLayerSchema,
  sourceIds: z.array(z.string().trim().min(1)).min(1),
  temporalAssertions: z.array(TemporalAssertionSchema).default([]),
  publicationState: PublicationStateSchema.default("preview"),
  reviewStatus: ReviewStatusSchema.default("bilingual_reviewed"),
});
export type RelationRecord = z.infer<typeof RelationRecordSchema>;

export const AudioRecordSchema = z.object({
  id: z.string().regex(/^audio:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: BilingualTextSchema,
  description: BilingualTextSchema,
  durationSeconds: z.number().int().positive(),
  transcript: BilingualTextSchema,
  assetStatus: z.enum(["not_recorded", "draft", "ready", "published"]),
  publicationState: PublicationStateSchema,
  reviewStatus: ReviewStatusSchema,
  rightsStatus: RightsStatusSchema,
  sourceIds: z.array(z.string().trim().min(1)).min(1),
});
export type AudioRecord = z.infer<typeof AudioRecordSchema>;

export const TextProfileSchema = z.object({
  textKind: z.enum([
    "classic",
    "scripture",
    "sutra",
    "treatise",
    "commentary",
    "recorded_sayings",
    "ritual_text",
    "historical_record",
    "other",
  ]),
  originalLanguageCode: z.string().trim().min(2),
  canonicalStatus: z.enum(["canonical", "influential", "contested", "apocryphal", "noncanonical", "not_applicable"]),
  attributionStatus: z.enum(["known", "traditional", "composite", "anonymous", "contested"]),
});

export const TextVersionProfileSchema = z.object({
  textSlug: z.string().trim().min(1),
  versionKind: z.enum(["edition", "manuscript", "recension", "translation", "commented_edition", "digital_edition"]),
  languageCode: z.string().trim().min(2),
  citationLabel: z.string().trim().min(1),
  rightsStatus: RightsStatusSchema,
});

export const PassageProfileSchema = z.object({
  textSlug: z.string().trim().min(1),
  textVersionSlug: z.string().trim().min(1),
  passageKind: z.enum([
    "scripture_excerpt",
    "classic_saying",
    "verse_gatha",
    "master_recorded_saying",
    "aphorism",
    "ritual_formula",
    "mantra_dharani",
    "practice_formula",
    "inscription",
    "commentarial_summary",
  ]),
  locatorOriginal: z.string().trim().min(1),
  locatorNormalised: z.string().trim().min(1),
  originalText: z.string().trim().min(1),
  punctuatedText: z.string().trim().min(1),
  modernZh: z.string().trim().min(1),
  translationEn: z.string().trim().min(1),
  ritualSensitivity: z.enum(["public_textual", "context_required", "lineage_sensitive", "restricted_or_uncertain"]),
});

export const PlaceProfileSchema = z.object({
  placeReality: z.enum(["real_current", "real_historical", "approximate_region", "legendary_uncertain", "sacred_symbolic"]),
  geometryType: z.enum(["point", "polygon", "line", "symbolic_node"]),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).optional(),
  coordinateConfidence: z.enum(["exact", "approximate", "centroid", "inferred", "not_applicable"]),
  geographicSourceId: z.string().optional(),
  cosmosZone: z.string().optional(),
  canvasX: z.number().optional(),
  canvasY: z.number().optional(),
}).superRefine((value, context) => {
  if (value.placeReality === "sacred_symbolic") {
    if (value.coordinates) context.addIssue({ code: "custom", path: ["coordinates"], message: "sacred symbolic places cannot have geographic coordinates" });
    if (value.geometryType !== "symbolic_node" || !value.cosmosZone || value.canvasX === undefined || value.canvasY === undefined) {
      context.addIssue({ code: "custom", message: "sacred symbolic places require symbolic_node, cosmosZone and canvas coordinates" });
    }
  } else if (!value.coordinates && !["approximate_region", "legendary_uncertain"].includes(value.placeReality)) {
    context.addIssue({ code: "custom", path: ["coordinates"], message: "real current or historical places require coordinates" });
  }
});

export const RouteProfileSchema = z.object({
  routeKind: z.enum(["pilgrimage", "transmission", "translation", "study", "official_travel", "exile", "institutional_expansion"]),
  certainty: z.enum(["documented", "reconstructed", "inferred"]),
  waypointSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(2),
  corridorNote: BilingualTextSchema,
  animationAllowed: z.boolean().default(false),
});

export const MuseumObjectProfileSchema = z.object({
  objectType: z.string().trim().min(1),
  rightsStatus: RightsStatusSchema,
  collectionStatus: z.enum(["placeholder", "identified", "catalogued"]),
  currentRepository: z.string().optional(),
  repositoryObjectId: z.string().optional(),
}).superRefine((value, context) => {
  if (value.collectionStatus !== "placeholder" && (!value.currentRepository || !value.repositoryObjectId)) {
    context.addIssue({ code: "custom", message: "identified and catalogued objects require repository and object ID" });
  }
});

export const FigureProfileSchema = z.object({
  historicity: z.enum(["documented", "inferred", "traditional", "contested"]),
  gender: z.enum(["male", "female", "nonbinary", "unknown", "not_applicable"]),
  canonicalNameOriginal: z.string().trim().min(1).optional(),
  nameLanguageCode: z.string().trim().min(2).optional(),
});

export const ConceptProfileSchema = z.object({
  conceptKind: z.enum(["doctrinal", "ethical", "interpretive_method", "institutional_process", "comparative", "other"]),
  terminologyNote: BilingualTextSchema.optional(),
});

export const InstitutionProfileSchema = z.object({
  institutionKind: z.enum(["monastery", "daoist_monastery", "state_academy", "court_institute", "translation_network", "monastic_network", "other"]),
  networkScope: z.boolean(),
  physicalPlaceSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
});

export const EventProfileSchema = z.object({
  eventKind: z.enum(["dynastic_transition", "journey", "editorial_project", "foundation", "construction", "policy", "conflict", "analytical_period", "other"]),
  historicity: z.enum(["documented", "inferred", "traditional", "mythic", "contested"]),
  sequenceOrder: z.number().int().positive(),
  eventScope: z.enum(["personal", "local", "regional", "imperial", "transregional", "cosmological"]),
});

const EntityContentBaseSchema = z.object({
  kind: EntityKindSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publicationState: PublicationStateSchema,
  reviewStatus: ReviewStatusSchema,
  primaryEvidenceLayer: EvidenceLayerSchema,
  importance: z.number().int().min(1).max(5).default(3),
  isFeatured: z.boolean().default(false),
  translations: z.object({
    "zh-CN": EntityTranslationSchema,
    en: EntityTranslationSchema,
  }),
  traditions: z.array(TraditionAssignmentSchema).min(1),
  temporalAssertions: z.array(TemporalAssertionSchema).min(1),
  sourceIds: z.array(z.string().trim().min(1)).min(1),
  related: z.array(RelatedEntitySchema).default([]),
  profile: z.record(z.string(), z.unknown()).default({}),
});
export const EntityContentSchema = EntityContentBaseSchema.superRefine((value, context) => {
  const profileSchemas: Partial<Record<EntityKind, z.ZodType>> = {
    figure: FigureProfileSchema,
    text: TextProfileSchema,
    text_version: TextVersionProfileSchema,
    passage: PassageProfileSchema,
    concept: ConceptProfileSchema,
    institution: InstitutionProfileSchema,
    place: PlaceProfileSchema,
    event: EventProfileSchema,
    route: RouteProfileSchema,
    museum_object: MuseumObjectProfileSchema,
  };
  const schema = profileSchemas[value.kind];
  if (schema) {
    const result = schema.safeParse(value.profile);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({ code: "custom", path: ["profile", ...issue.path], message: issue.message });
      }
    }
  }
});
export type EntityContent = z.infer<typeof EntityContentSchema>;

export const TraditionContentSchema = z.object({
  slug: TraditionSlugSchema,
  translations: BilingualTextSchema,
  sortOrder: z.number().int().min(1),
  sourceIds: z.array(z.string().trim().min(1)).min(1),
});
export type TraditionContent = z.infer<typeof TraditionContentSchema>;

export const ContentProfileSchema = z.object({
  id: z.literal("dao-ru-fo"),
  defaultLocale: z.literal("zh-CN"),
  locales: z.array(LocaleSchema).length(2),
  contentVersion: z.string().regex(/^\d{4}\.\d{2}\.[a-z0-9.-]+$/),
  releaseStage: z.enum(["alpha", "first-viewable-prototype", "lean-public-mvp", "public"]),
  capabilities: z.array(CapabilitySchema).min(1),
  topTraditions: z.array(TraditionSlugSchema).length(3),
  translations: z.object({
    "zh-CN": z.object({ title: z.string().min(1), shortTitle: z.string().min(1), tagline: z.string().min(1), description: z.string().min(1) }),
    en: z.object({ title: z.string().min(1), shortTitle: z.string().min(1), tagline: z.string().min(1), description: z.string().min(1) }),
  }),
});
export type ContentProfile = z.infer<typeof ContentProfileSchema>;

export const ContentReportSchema = z.object({
  schemaVersion: z.literal("2.0"),
  profile: z.literal("dao-ru-fo"),
  visibility: ContentVisibilitySchema,
  contentVersion: z.string(),
  entityCounts: z.record(z.string(), z.number().int().nonnegative()),
  sourceCount: z.number().int().nonnegative(),
  traditionCount: z.number().int().nonnegative(),
  relationCount: z.number().int().nonnegative(),
  audioCount: z.number().int().nonnegative(),
  publicEntityCount: z.number().int().nonnegative(),
});
export type ContentReport = z.infer<typeof ContentReportSchema>;

export const ContentQualityReportSchema = z.object({
  schemaVersion: z.literal("1.0"),
  profile: z.literal("dao-ru-fo"),
  contentVersion: z.string().min(1),
  visibility: ContentVisibilitySchema,
  counts: z.object({
    entities: z.number().int().nonnegative(),
    relations: z.number().int().nonnegative(),
    audio: z.number().int().nonnegative(),
    sources: z.number().int().nonnegative(),
  }),
  publicationStates: z.record(z.string(), z.number().int().nonnegative()),
  reviewStatuses: z.record(z.string(), z.number().int().nonnegative()),
  evidenceLayers: z.record(z.string(), z.number().int().nonnegative()),
  traditions: z.record(z.string(), z.number().int().nonnegative()),
  sourceRights: z.record(z.string(), z.number().int().nonnegative()),
  sourceLocatorLevels: z.record(z.string(), z.number().int().nonnegative()),
  placeholderEntities: z.array(z.string()),
  publicBlockers: z.array(z.object({ code: z.string(), subject: z.string(), detail: z.string() })),
  warnings: z.array(z.object({ code: z.string(), subject: z.string(), detail: z.string() })),
});
export type ContentQualityReport = z.infer<typeof ContentQualityReportSchema>;

const DatabaseEntityRowSchema = z.object({
  id: z.string().uuid(),
  kind: EntityKindSchema,
  slug: z.string(),
  publicationState: PublicationStateSchema,
  reviewStatus: ReviewStatusSchema,
  primaryEvidenceLayer: EvidenceLayerSchema,
  importance: z.number().int().min(1).max(5),
  isFeatured: z.boolean(),
  contentVersion: z.string(),
});

export const DatabaseImportBundleSchema = z.object({
  schemaVersion: z.literal("1.0"),
  profile: z.literal("dao-ru-fo"),
  contentVersion: z.string(),
  idNamespace: z.string().uuid(),
  sources: z.array(z.object({
    id: z.string().uuid(), canonicalKey: z.string(), sourceType: SourceTypeSchema, evidenceGrade: z.enum(["A", "B", "C", "D"]),
    titleOriginal: z.string(), titleZh: z.string(), titleEn: z.string(), locator: z.string(),
    citationZh: z.string(), citationEn: z.string(), rightsStatus: RightsStatusSchema,
    locatorLevel: z.enum(["collection", "topic", "edition", "item", "precise"]), citationStatus: z.enum(["draft", "verified"]), url: z.string().url().optional(),
  })),
  entities: z.array(DatabaseEntityRowSchema),
  translations: z.array(z.object({
    entityId: z.string().uuid(), locale: LocaleSchema, title: z.string(), subtitle: z.string().optional(), shortSummary: z.string(),
    curatorialDescription: z.string(), researchNote: z.string(), timeLabel: z.string(), keyFacts: z.array(KeyFactSchema), quote: QuoteSchema.optional(),
  })),
  profiles: z.array(z.object({ entityId: z.string().uuid(), kind: EntityKindSchema, value: z.record(z.string(), z.unknown()) })),
  entitySources: z.array(z.object({ entityId: z.string().uuid(), sourceId: z.string().uuid(), supportRole: z.literal("contextualises"), claimSummary: z.string(), isPrimary: z.boolean() })),
  entityTraditions: z.array(z.object({
    entityId: z.string().uuid(), traditionId: z.string().uuid(), role: TraditionAssignmentSchema.shape.role,
    isPrimary: z.boolean(), confidence: ConfidenceSchema, evidenceLayer: EvidenceLayerSchema, sourceId: z.string().uuid(), note: BilingualTextSchema.optional(),
  })),
  temporalAssertions: z.array(z.object({
    id: z.string().uuid(), entityId: z.string().uuid(), predicate: TemporalPredicateSchema, timeType: TemporalAssertionSchema.shape.timeType,
    startYear: z.number().int().optional(), endYear: z.number().int().optional(), displayDate: BilingualTextSchema,
    confidence: ConfidenceSchema, evidenceLayer: EvidenceLayerSchema, sourceId: z.string().uuid(),
  })),
  relations: z.array(z.object({
    id: z.string().uuid(), canonicalKey: z.string(), sourceEntityId: z.string().uuid(), targetEntityId: z.string().uuid(),
    relationType: RelationTypeSchema, label: BilingualTextSchema, summary: BilingualTextSchema, confidence: ConfidenceSchema,
    evidenceLayer: EvidenceLayerSchema, publicationState: PublicationStateSchema, reviewStatus: ReviewStatusSchema,
    temporalAssertions: z.array(TemporalAssertionSchema), sourceIds: z.array(z.string().uuid()).min(1),
  })),
  reviews: z.array(ReviewCheckRecordSchema),
  audio: z.array(AudioRecordSchema),
});
export type DatabaseImportBundle = z.infer<typeof DatabaseImportBundleSchema>;

// Read-model schemas are the contract between the compiler and static web clients.
// They deliberately contain one locale at a time so the browser can load only what it needs.
export const ReadModelSourceSchema = z.object({
  title: z.string().trim().min(1),
  locator: z.string().trim().min(1),
  grade: z.enum(["A", "B", "C", "D"]),
  role: z.string().trim().min(1),
  url: z.string().url().optional(),
});
export type ReadModelSource = z.infer<typeof ReadModelSourceSchema>;

export const ReadModelRelatedEntitySchema = z.object({
  kind: EntityKindSchema,
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  relation: z.string().trim().min(1),
});
export type ReadModelRelatedEntity = z.infer<typeof ReadModelRelatedEntitySchema>;

export const ReadModelEntityArtifactSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  locale: LocaleSchema,
  kind: EntityKindSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1).optional(),
  tradition: z.union([TraditionSlugSchema, z.literal("convergence")]),
  evidence: EvidenceLayerSchema,
  timeLabel: z.string().trim().min(1),
  shortSummary: z.string().trim().min(1),
  curatorialDescription: z.array(z.string().trim().min(1)).min(1),
  researchNote: z.string().trim().min(1),
  keyFacts: z.array(z.object({ label: z.string().trim().min(1), value: z.string().trim().min(1) })),
  quote: z.object({
    original: z.string().trim().min(1),
    interpretation: z.string().trim().min(1),
    locator: z.string().trim().min(1),
  }).optional(),
  related: z.array(ReadModelRelatedEntitySchema),
  sources: z.array(ReadModelSourceSchema).min(1),
  profile: z.record(z.string(), z.unknown()),
  publicationState: PublicationStateSchema,
  reviewStatus: ReviewStatusSchema,
});
export type ReadModelEntityArtifact = z.infer<typeof ReadModelEntityArtifactSchema>;

export const ReadModelSearchItemSchema = z.object({
  id: ReadModelEntityArtifactSchema.shape.id,
  kind: EntityKindSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  context: z.string().trim().min(1),
  tradition: z.union([TraditionSlugSchema, z.literal("convergence")]),
});
export const ReadModelSearchIndexSchema = z.object({
  locale: LocaleSchema,
  items: z.array(ReadModelSearchItemSchema),
});
export type ReadModelSearchIndex = z.infer<typeof ReadModelSearchIndexSchema>;

export const ReadModelRelationSchema = z.object({
  id: z.string().regex(/^relation:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  source: RelationEndpointSchema,
  target: RelationEndpointSchema,
  relationType: z.string().trim().min(1),
  label: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  confidence: ConfidenceSchema,
  evidenceLayer: EvidenceLayerSchema,
  sourceIds: z.array(z.string().trim().min(1)).min(1),
  publicationState: PublicationStateSchema,
  reviewStatus: ReviewStatusSchema,
});
export type ReadModelRelation = z.infer<typeof ReadModelRelationSchema>;

export const ReadModelRelationIndexSchema = z.object({
  locale: LocaleSchema,
  items: z.array(ReadModelRelationSchema),
});
export type ReadModelRelationIndex = z.infer<typeof ReadModelRelationIndexSchema>;

export const ReadModelAudioSchema = z.object({
  id: z.string().regex(/^audio:[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  durationSeconds: z.number().int().positive(),
  transcript: z.string().trim().min(1),
  assetStatus: z.enum(["not_recorded", "draft", "ready", "published"]),
  publicationState: PublicationStateSchema,
  reviewStatus: ReviewStatusSchema,
  rightsStatus: RightsStatusSchema,
  sourceIds: z.array(z.string().trim().min(1)).min(1),
});
export type ReadModelAudio = z.infer<typeof ReadModelAudioSchema>;

export const ReadModelAudioIndexSchema = z.object({
  locale: LocaleSchema,
  items: z.array(ReadModelAudioSchema),
});
export type ReadModelAudioIndex = z.infer<typeof ReadModelAudioIndexSchema>;

export const ReadModelProfileSchema = z.object({
  id: z.literal("dao-ru-fo"),
  locale: LocaleSchema,
  contentVersion: z.string().min(1),
  releaseStage: ContentProfileSchema.shape.releaseStage,
  capabilities: z.array(z.string().trim().min(1)),
  topTraditions: z.array(TraditionSlugSchema).length(3),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
});
export type ReadModelProfile = z.infer<typeof ReadModelProfileSchema>;

export const ReadModelManifestSchema = z.object({
  schemaVersion: z.literal("2.0"),
  profile: z.literal("dao-ru-fo"),
  visibility: ContentVisibilitySchema,
  contentVersion: z.string().min(1),
  releaseStage: ContentProfileSchema.shape.releaseStage,
  locales: z.array(LocaleSchema).length(2),
  entityCounts: z.record(z.string(), z.number().int().nonnegative()),
  sourceCount: z.number().int().nonnegative(),
  traditionCount: z.number().int().nonnegative(),
  relationCount: z.number().int().nonnegative(),
  audioCount: z.number().int().nonnegative(),
  idNamespace: z.string().uuid(),
});
export type ReadModelManifest = z.infer<typeof ReadModelManifestSchema>;

export const ReadModelChecksumsSchema = z.object({
  algorithm: z.literal("sha256"),
  contentVersion: z.string(),
  files: z.record(z.string(), z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/), bytes: z.number().int().nonnegative() })),
});
export type ReadModelChecksums = z.infer<typeof ReadModelChecksumsSchema>;

export const ReadModelRoutesManifestSchema = z.object({
  contentVersion: z.string(),
  locales: z.array(LocaleSchema),
  routes: z.array(z.object({ kind: EntityKindSchema, slug: z.string(), locales: z.array(LocaleSchema), publicationState: PublicationStateSchema })),
});
export type ReadModelRoutesManifest = z.infer<typeof ReadModelRoutesManifestSchema>;

export const ReadModelSourceIndexSchema = z.object({
  locale: LocaleSchema,
  items: z.array(z.object({
    id: z.string(), title: z.string(), locator: z.string(), evidenceGrade: z.enum(["A", "B", "C", "D"]),
    rightsStatus: RightsStatusSchema, locatorLevel: z.enum(["collection", "topic", "edition", "item", "precise"]),
    citationStatus: z.enum(["draft", "verified"]), role: z.string(), url: z.string().url().optional(), entityCount: z.number().int().nonnegative(),
  })),
});
export type ReadModelSourceIndex = z.infer<typeof ReadModelSourceIndexSchema>;

export const ReadModelReviewQueueSchema = z.object({
  contentVersion: z.string(),
  items: z.array(z.object({
    subjectKind: z.enum(["entity", "relation", "audio"]), subjectKey: z.string(), publicationState: PublicationStateSchema,
    reviewStatus: ReviewStatusSchema, requiredChecks: z.array(ReviewCheckKindSchema), completedChecks: z.array(ReviewCheckKindSchema),
    missingChecks: z.array(ReviewCheckKindSchema), failedChecks: z.array(ReviewCheckKindSchema), blocking: z.boolean(),
  })),
});
export type ReadModelReviewQueue = z.infer<typeof ReadModelReviewQueueSchema>;

export const ReadModelRealMapSchema = z.object({
  type: z.literal("FeatureCollection"), locale: LocaleSchema,
  features: z.array(z.object({
    type: z.literal("Feature"), id: z.string(), geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number(), z.number()]) }),
    properties: z.object({ kind: z.literal("place"), slug: z.string(), title: z.string(), summary: z.string(), tradition: z.union([TraditionSlugSchema, z.literal("convergence")]), placeReality: z.string(), coordinateConfidence: z.string(), evidenceLayer: EvidenceLayerSchema, sourceId: z.string() }),
  })),
});
export type ReadModelRealMap = z.infer<typeof ReadModelRealMapSchema>;

export const ReadModelTimelineSchema = z.object({
  locale: LocaleSchema, title: z.string(), startYear: z.number().int(), endYear: z.number().int(),
  events: z.array(z.object({
    id: z.string(), kind: EntityKindSchema, slug: z.string(), title: z.string(), summary: z.string(), tradition: z.union([TraditionSlugSchema, z.literal("convergence")]),
    predicate: TemporalPredicateSchema, type: TemporalAssertionSchema.shape.timeType, year: z.number().int(), endYear: z.number().int().optional(),
    displayDate: z.string(), confidence: ConfidenceSchema, evidenceLayer: EvidenceLayerSchema, sourceId: z.string(),
  })),
});
export type ReadModelTimeline = z.infer<typeof ReadModelTimelineSchema>;

export const ReadModelGraphSchema = z.object({
  locale: LocaleSchema, graphType: z.string(), title: z.string(), question: z.string(),
  nodes: z.array(z.object({ id: z.string(), kind: EntityKindSchema, slug: z.string(), label: z.string(), tradition: z.union([TraditionSlugSchema, z.literal("convergence")]), x: z.number(), y: z.number() })),
  edges: z.array(z.object({
    id: z.string(), source: z.string(), target: z.string(), label: z.string(), summary: z.string(), relationType: RelationTypeSchema,
    evidence: EvidenceLayerSchema, confidence: ConfidenceSchema, sourceIds: z.array(z.string()).min(1),
  })),
});
export type ReadModelGraph = z.infer<typeof ReadModelGraphSchema>;
