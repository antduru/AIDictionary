export const entryTypeOptions = [
  "entry",
  "book",
  "model",
  "paper",
  "metric",
  "dataset",
  "task",
  "method",
  "concept",
  "benchmark",
] as const;

export type EntryType = (typeof entryTypeOptions)[number];

export const entryTypeLabels: Record<EntryType, string> = {
  entry: "Entry",
  book: "Book",
  model: "Model",
  paper: "Paper",
  metric: "Metric",
  dataset: "Dataset",
  task: "Task",
  method: "Method",
  concept: "Concept",
  benchmark: "Benchmark",
};

export type GapStatus = "open" | "resolved";
export type AppView = "atlas" | "library" | "map" | "timeline" | "trails" | "settings";
export type OwnerType = "entry" | "book_page";
export type BlockType =
  | "heading"
  | "text"
  | "markdown"
  | "callout"
  | "link"
  | "image"
  | "table"
  | "code"
  | "divider"
  | "checklist";

export interface ContentBlock {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  blockType: BlockType;
  content: string;
  metadata: string;
  blockOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlockInput {
  blockType: BlockType;
  content: string;
  metadata: string;
  blockOrder: number;
}

export interface Entry {
  id: string;
  title: string;
  entryType: EntryType;
  content: string;
  category: string;
  tags: string[];
  timelineDate: string;
  timelineNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntryInput {
  title: string;
  entryType: EntryType;
  content: string;
  category: string;
  tags: string[];
  timelineDate: string;
  timelineNote: string;
}

export interface BookPage {
  id: string;
  entryId: string;
  title: string;
  content: string;
  pageOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookPageInput {
  entryId: string;
  title: string;
  content: string;
  pageOrder: number;
}

export interface Relation {
  id: string;
  fromEntryId: string;
  toEntryId: string;
  relationType: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelationInput {
  fromEntryId: string;
  toEntryId: string;
  relationType: string;
  note: string;
}

export interface KnowledgeGap {
  id: string;
  entryId: string;
  title: string;
  note: string;
  status: GapStatus;
  resolvedEntryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeGapInput {
  entryId: string;
  title: string;
  note: string;
  status: GapStatus;
  resolvedEntryId: string;
}

export interface Trail {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrailInput {
  title: string;
  description: string;
}

export interface TrailItem {
  id: string;
  trailId: string;
  entryId: string;
  itemOrder: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrailItemInput {
  trailId: string;
  entryId: string;
  itemOrder: number;
  note: string;
}

export interface AppData {
  entries: Entry[];
  bookPages: BookPage[];
  contentBlocks: ContentBlock[];
  relations: Relation[];
  knowledgeGaps: KnowledgeGap[];
  trails: Trail[];
  trailItems: TrailItem[];
}
