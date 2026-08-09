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
}

export interface TimelineEvent {
  id: string;
  year: number;
  endYear?: number;
  type: "exact" | "range" | "circa";
  tradition: Tradition | "convergence";
  title: string;
  summary: string;
  entity?: { kind: EntityKind; slug: string };
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
}

export interface MuseumMapFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    slug: string;
    title: string;
    placeType: string;
    confidence: string;
    tradition: Tradition | "convergence";
    summary: string;
  };
}

export interface MuseumMapData {
  type: "FeatureCollection";
  features: MuseumMapFeature[];
}
