import {
  ContentQualityReportSchema,
  ReadModelAudioIndexSchema,
  ReadModelChecksumsSchema,
  ReadModelEntityArtifactSchema,
  ReadModelManifestSchema,
  ReadModelProfileSchema,
  ReadModelRealMapSchema,
  ReadModelRelationIndexSchema,
  ReadModelReviewQueueSchema,
  ReadModelRoutesManifestSchema,
  ReadModelSearchIndexSchema,
  ReadModelSourceIndexSchema,
  ReadModelTimelineSchema,
  ReadModelGraphSchema,
  type ContentQualityReport,
  type EntityKind,
  type Locale,
  type ReadModelAudioIndex,
  type ReadModelChecksums,
  type ReadModelEntityArtifact,
  type ReadModelManifest,
  type ReadModelProfile,
  type ReadModelRealMap,
  type ReadModelRelationIndex,
  type ReadModelReviewQueue,
  type ReadModelRoutesManifest,
  type ReadModelSearchIndex,
  type ReadModelSourceIndex,
  type ReadModelTimeline,
  type ReadModelGraph,
} from "@drf-museum/domain-schema";
import { createReadModelPaths } from "./read-model.js";

export interface MuseumDataSource {
  getManifest(signal?: AbortSignal): Promise<ReadModelManifest>;
  getProfile(locale: Locale, signal?: AbortSignal): Promise<ReadModelProfile>;
  getEntityDetail(kind: EntityKind, slug: string, locale: Locale, signal?: AbortSignal): Promise<ReadModelEntityArtifact>;
  getSearchIndex(locale: Locale, signal?: AbortSignal): Promise<ReadModelSearchIndex>;
  getRelationIndex(locale: Locale, signal?: AbortSignal): Promise<ReadModelRelationIndex>;
  getAudioIndex(locale: Locale, signal?: AbortSignal): Promise<ReadModelAudioIndex>;
  getSourceIndex(locale: Locale, signal?: AbortSignal): Promise<ReadModelSourceIndex>;
  getRealMap(name: string, locale: Locale, signal?: AbortSignal): Promise<ReadModelRealMap>;
  getTimeline(name: string, locale: Locale, signal?: AbortSignal): Promise<ReadModelTimeline>;
  getGraph(graphType: string, name: string, locale: Locale, signal?: AbortSignal): Promise<ReadModelGraph>;
  getQualityReport(signal?: AbortSignal): Promise<ContentQualityReport>;
  getReviewQueue(signal?: AbortSignal): Promise<ReadModelReviewQueue>;
  getRoutesManifest(signal?: AbortSignal): Promise<ReadModelRoutesManifest>;
  getChecksums(signal?: AbortSignal): Promise<ReadModelChecksums>;
}

export type JsonRequest = (path: string, signal?: AbortSignal) => Promise<unknown>;

export class StaticMuseumDataSource implements MuseumDataSource {
  readonly paths: ReturnType<typeof createReadModelPaths>;

  constructor(root: string, private readonly request: JsonRequest) {
    this.paths = createReadModelPaths(root);
  }

  async getManifest(signal?: AbortSignal) { return ReadModelManifestSchema.parse(await this.request(this.paths.manifest(), signal)); }
  async getProfile(locale: Locale, signal?: AbortSignal) { return ReadModelProfileSchema.parse(await this.request(this.paths.profile(locale), signal)); }
  async getEntityDetail(kind: EntityKind, slug: string, locale: Locale, signal?: AbortSignal) { return ReadModelEntityArtifactSchema.parse(await this.request(this.paths.entity(kind, slug, locale), signal)); }
  async getSearchIndex(locale: Locale, signal?: AbortSignal) { return ReadModelSearchIndexSchema.parse(await this.request(this.paths.searchIndex(locale), signal)); }
  async getRelationIndex(locale: Locale, signal?: AbortSignal) { return ReadModelRelationIndexSchema.parse(await this.request(this.paths.relations(locale), signal)); }
  async getAudioIndex(locale: Locale, signal?: AbortSignal) { return ReadModelAudioIndexSchema.parse(await this.request(this.paths.audio(locale), signal)); }
  async getSourceIndex(locale: Locale, signal?: AbortSignal) { return ReadModelSourceIndexSchema.parse(await this.request(this.paths.sourceIndex(locale), signal)); }
  async getRealMap(name: string, locale: Locale, signal?: AbortSignal) { return ReadModelRealMapSchema.parse(await this.request(this.paths.realMap(name, locale), signal)); }
  async getTimeline(name: string, locale: Locale, signal?: AbortSignal) { return ReadModelTimelineSchema.parse(await this.request(this.paths.timeline(name, locale), signal)); }
  async getGraph(graphType: string, name: string, locale: Locale, signal?: AbortSignal) { return ReadModelGraphSchema.parse(await this.request(this.paths.graph(graphType, name, locale), signal)); }
  async getQualityReport(signal?: AbortSignal) { return ContentQualityReportSchema.parse(await this.request(this.paths.manifest("quality-report"), signal)); }
  async getReviewQueue(signal?: AbortSignal) { return ReadModelReviewQueueSchema.parse(await this.request(this.paths.manifest("review-queue"), signal)); }
  async getRoutesManifest(signal?: AbortSignal) { return ReadModelRoutesManifestSchema.parse(await this.request(this.paths.manifest("routes"), signal)); }
  async getChecksums(signal?: AbortSignal) { return ReadModelChecksumsSchema.parse(await this.request(this.paths.manifest("checksums"), signal)); }
}
