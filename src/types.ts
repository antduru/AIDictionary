export type EntryType = "entry" | "book";
export type GapStatus = "open" | "resolved";
export type AppView = "atlas" | "library" | "map" | "settings";

export interface Entry {
  id: string;
  title: string;
  entryType: EntryType;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntryInput {
  title: string;
  entryType: EntryType;
  content: string;
  category: string;
  tags: string[];
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
}

export interface KnowledgeGapInput {
  entryId: string;
  title: string;
  note: string;
  status: GapStatus;
}

export interface AppData {
  entries: Entry[];
  bookPages: BookPage[];
  relations: Relation[];
  knowledgeGaps: KnowledgeGap[];
}
