import { z } from "zod";

export const LocaleSchema = z.enum(["zh-CN", "en"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const TraditionSchema = z.enum(["buddhism", "daoism", "confucianism"]);
export type Tradition = z.infer<typeof TraditionSchema>;

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

export interface ProfileData {
  id: string;
  locale: Locale;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  contentVersion: string;
  capabilities: string[];
}

export interface TraditionCard {
  slug: Tradition;
  label: string;
  subtitle: string;
  statement: string;
  counts: { figures: number; texts: number; passages: number };
  focusEntity: { kind: EntityKind; slug: string };
}

export interface FeaturedFigure {
  kind: "figure";
  slug: string;
  tradition: Tradition;
  traditionLabel: string;
  title: string;
  role: string;
  summary: string;
  timeLabel: string;
  placeLabel: string;
  spaceView?: "map" | "cosmos";
}

export interface OverviewData {
  locale: Locale;
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  primaryAction: string;
  secondaryAction: string;
  todayLabel: string;
  todayPassage: {
    quote: string;
    interpretation: string;
    source: string;
    slug: string;
  };
  exhibition: {
    slug: string;
    title: string;
    subtitle: string;
    question: string;
    sections: number;
    minutes: number;
  };
  traditions: TraditionCard[];
  featuredFigures: FeaturedFigure[];
  methodologyTitle: string;
  methodologyText: string;
}

export interface ExhibitionSection {
  slug: string;
  sequence: number;
  tradition: Tradition | "convergence";
  kicker: string;
  title: string;
  question: string;
  body: string[];
  object: {
    label: string;
    title: string;
    meta: string;
    description: string;
  };
  passage?: {
    quote: string;
    interpretation: string;
    source: string;
    slug: string;
  };
  explore: {
    label: string;
    mode: "map" | "timeline" | "graph";
    focus: string;
  };
}

export interface ExhibitionData {
  locale: Locale;
  slug: string;
  title: string;
  subtitle: string;
  curatorialQuestion: string;
  opening: string;
  quickMinutes: number;
  fullMinutes: number;
  sections: ExhibitionSection[];
  closingReflection: string;
}

export interface SourceSummary {
  id: string;
  title: string;
  locator: string;
  grade: "A" | "B" | "C";
  role: string;
  url?: string;
}

export interface RelatedEntity {
  kind: EntityKind;
  slug: string;
  title: string;
  relation: string;
}

export interface EntityData {
  locale: Locale;
  kind: EntityKind;
  slug: string;
  title: string;
  subtitle?: string;
  tradition: Tradition | "convergence";
  evidence: string;
  timeLabel: string;
  shortSummary: string;
  curatorialDescription: string[];
  researchNote: string;
  keyFacts: { label: string; value: string }[];
  quote?: {
    original: string;
    interpretation: string;
    locator: string;
  };
  related: RelatedEntity[];
  sources: SourceSummary[];
  profile?: Record<string, unknown>;
  publicationState?: string;
  reviewStatus?: string;
}

export interface SourceIndexItem {
  id: string;
  title: string;
  locator: string;
  evidenceGrade: "A" | "B" | "C" | "D";
  rightsStatus: string;
  locatorLevel: "collection" | "topic" | "edition" | "item" | "precise";
  citationStatus: "draft" | "verified";
  role: string;
  url?: string;
  entityCount: number;
}

export interface SourceIndexData {
  locale: Locale;
  items: SourceIndexItem[];
}

export interface TimelineEvent {
  id: string;
  kind: EntityKind;
  slug: string;
  year: number;
  endYear?: number;
  type: string;
  tradition: Tradition | "convergence";
  title: string;
  summary: string;
  eventKind?: "dynastic_transition" | "journey" | "editorial_project" | "foundation" | "construction" | "policy" | "conflict" | "analytical_period" | "other";
  eventScope?: "personal" | "local" | "regional" | "imperial" | "transregional" | "cosmological";
  predicate?: string;
  displayDate?: string;
  confidence?: string;
  evidenceLayer?: string;
  sourceId?: string;
  entity?: { kind: EntityKind; slug: string };
  contextKeys?: string[];
  relationId?: string;
}

export interface TimelineData {
  locale: Locale;
  title: string;
  startYear: number;
  endYear: number;
  events: TimelineEvent[];
}

export interface GraphNode {
  id: string;
  label: string;
  kind: EntityKind;
  tradition: Tradition | "convergence";
  x: number;
  y: number;
  slug: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  evidence: string;
  summary?: string;
  relationType?: string;
  confidence?: string;
  sourceIds?: string[];
}

export interface GraphData {
  locale: Locale;
  title: string;
  question: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchItem {
  kind: EntityKind;
  slug: string;
  title: string;
  context: string;
  tradition: Tradition | "convergence";
  eventKind?: "dynastic_transition" | "journey" | "editorial_project" | "foundation" | "construction" | "policy" | "conflict" | "analytical_period" | "other";
  eventScope?: "personal" | "local" | "regional" | "imperial" | "transregional" | "cosmological";
  timeRange?: { startYear: number; endYear?: number };
}

export interface MuseumMapFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    kind: "place";
    slug: string;
    title: string;
    placeReality: string;
    coordinateConfidence: string;
    tradition: Tradition | "convergence";
    summary: string;
    evidenceLayer?: string;
    sourceId?: string;
    temporalRange?: { startYear: number; endYear?: number };
  };
}

export interface MuseumMapData {
  type: "FeatureCollection";
  features: MuseumMapFeature[];
}

export interface MapContextData {
  map: MuseumMapData;
  routes: EntityData[];
  searchItems: SearchItem[];
}
