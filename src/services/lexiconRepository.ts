import { invoke } from "@tauri-apps/api/core";
import type {
  AppData,
  BookPage,
  BookPageInput,
  Entry,
  EntryInput,
  KnowledgeGap,
  KnowledgeGapInput,
  Relation,
  RelationInput,
} from "../types";

interface LexiconRepository {
  loadAppData(): Promise<AppData>;
  createEntry(input: EntryInput): Promise<Entry>;
  updateEntry(id: string, input: EntryInput): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;
  createBookPage(input: BookPageInput): Promise<BookPage>;
  updateBookPage(id: string, input: BookPageInput): Promise<BookPage>;
  deleteBookPage(id: string): Promise<void>;
  createRelation(input: RelationInput): Promise<Relation>;
  deleteRelation(id: string): Promise<void>;
  createKnowledgeGap(input: KnowledgeGapInput): Promise<KnowledgeGap>;
  updateKnowledgeGap(id: string, input: KnowledgeGapInput): Promise<KnowledgeGap>;
  deleteKnowledgeGap(id: string): Promise<void>;
}

const storageKey = "lexicon-os-demo-data";

const now = () => new Date().toISOString();

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const seedData = (): AppData => {
  const timestamp = now();
  return {
    entries: [
      {
        id: "seed_clip",
        title: "CLIP",
        entryType: "book",
        content:
          "A personal mini-book for understanding Contrastive Language-Image Pre-training and its place in representation learning.",
        category: "Machine Learning",
        tags: ["vision-language", "representation-learning"],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_downstream_task",
        title: "Downstream Task",
        entryType: "entry",
        content:
          "A task that uses representations, checkpoints, or learned features from a prior training process.\n\nExamples include classification, retrieval, detection, ranking, or evaluation tasks built on top of a pretrained model.",
        category: "Machine Learning",
        tags: ["evaluation", "transfer-learning"],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_contrastive_learning",
        title: "Contrastive Learning",
        entryType: "entry",
        content:
          "A learning setup that pulls related examples closer in representation space while pushing unrelated examples apart.\n\nUseful mental handle: it teaches a model to organize similarity rather than memorize labels.",
        category: "Machine Learning",
        tags: ["representation-learning"],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_zero_shot",
        title: "Zero-Shot Classification",
        entryType: "entry",
        content:
          "Classification without task-specific labeled examples for the target labels.\n\nIn CLIP-style workflows, labels can be expressed as text prompts and compared with image representations.",
        category: "Machine Learning",
        tags: ["evaluation", "classification"],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    bookPages: [
      {
        id: "seed_clip_overview",
        entryId: "seed_clip",
        title: "Overview",
        content:
          "CLIP learns a shared image-text space.\n\n- Images and captions are embedded near each other\n- Similarity supports retrieval and classification\n- The model is often used without training a task-specific classifier",
        pageOrder: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_clip_core",
        entryId: "seed_clip",
        title: "Core Idea",
        content:
          "Instead of predicting a fixed class label, CLIP compares image representations with text representations.\n\n- Positive pairs are matched image-caption examples\n- Negative pairs are other examples in the batch\n- The objective rewards correct alignment across modalities",
        pageOrder: 2,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_clip_confusions",
        entryId: "seed_clip",
        title: "Common Confusions",
        content:
          "- CLIP is not only an image classifier\n- Zero-shot performance depends heavily on prompts and label wording\n- Contrastive training is the training setup, not the final use case",
        pageOrder: 3,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_clip_notes",
        entryId: "seed_clip",
        title: "My Notes",
        content:
          "Questions to revisit:\n\n- How temperature changes embedding separation\n- How prompt templates shift class scores\n- Where CLIP fails on fine-grained categories",
        pageOrder: 4,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    relations: [
      {
        id: "seed_rel_clip_contrastive",
        fromEntryId: "seed_clip",
        toEntryId: "seed_contrastive_learning",
        relationType: "related",
        note: "",
      },
      {
        id: "seed_rel_clip_zero_shot",
        fromEntryId: "seed_clip",
        toEntryId: "seed_zero_shot",
        relationType: "related",
        note: "",
      },
      {
        id: "seed_rel_clip_downstream",
        fromEntryId: "seed_clip",
        toEntryId: "seed_downstream_task",
        relationType: "related",
        note: "",
      },
    ],
    knowledgeGaps: [
      {
        id: "seed_gap_temperature",
        entryId: "seed_clip",
        title: "Temperature scaling in CLIP",
        note: "Clarify how the learned temperature parameter affects contrastive logits and retrieval confidence.",
        status: "open",
      },
      {
        id: "seed_gap_prompting",
        entryId: "seed_clip",
        title: "Prompt engineering for CLIP",
        note: "Collect examples of prompt templates that materially change zero-shot classification performance.",
        status: "open",
      },
    ],
  };
};

const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown })
      .__TAURI_INTERNALS__ ||
      (window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown }).__TAURI__,
  );

class TauriLexiconRepository implements LexiconRepository {
  loadAppData() {
    return invoke<AppData>("load_app_data");
  }

  createEntry(input: EntryInput) {
    return invoke<Entry>("create_entry", { input });
  }

  updateEntry(id: string, input: EntryInput) {
    return invoke<Entry>("update_entry", { id, input });
  }

  deleteEntry(id: string) {
    return invoke<void>("delete_entry", { id });
  }

  createBookPage(input: BookPageInput) {
    return invoke<BookPage>("create_book_page", { input });
  }

  updateBookPage(id: string, input: BookPageInput) {
    return invoke<BookPage>("update_book_page", { id, input });
  }

  deleteBookPage(id: string) {
    return invoke<void>("delete_book_page", { id });
  }

  createRelation(input: RelationInput) {
    return invoke<Relation>("create_relation", { input });
  }

  deleteRelation(id: string) {
    return invoke<void>("delete_relation", { id });
  }

  createKnowledgeGap(input: KnowledgeGapInput) {
    return invoke<KnowledgeGap>("create_knowledge_gap", { input });
  }

  updateKnowledgeGap(id: string, input: KnowledgeGapInput) {
    return invoke<KnowledgeGap>("update_knowledge_gap", { id, input });
  }

  deleteKnowledgeGap(id: string) {
    return invoke<void>("delete_knowledge_gap", { id });
  }
}

class DemoLexiconRepository implements LexiconRepository {
  async loadAppData() {
    return this.read();
  }

  async createEntry(input: EntryInput) {
    const data = this.read();
    const timestamp = now();
    const entry: Entry = {
      id: createId(input.entryType),
      ...input,
      title: input.title.trim() || "Untitled",
      tags: normalizeTags(input.tags),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.entries = [...data.entries, entry].sort(sortByTitle);
    this.write(data);
    return entry;
  }

  async updateEntry(id: string, input: EntryInput) {
    const data = this.read();
    const existing = data.entries.find((entry) => entry.id === id);
    if (!existing) {
      throw new Error("Entry not found");
    }
    const updated: Entry = {
      ...existing,
      ...input,
      title: input.title.trim() || "Untitled",
      tags: normalizeTags(input.tags),
      updatedAt: now(),
    };
    data.entries = data.entries.map((entry) => (entry.id === id ? updated : entry)).sort(sortByTitle);
    this.write(data);
    return updated;
  }

  async deleteEntry(id: string) {
    const data = this.read();
    data.entries = data.entries.filter((entry) => entry.id !== id);
    data.bookPages = data.bookPages.filter((page) => page.entryId !== id);
    data.relations = data.relations.filter(
      (relation) => relation.fromEntryId !== id && relation.toEntryId !== id,
    );
    data.knowledgeGaps = data.knowledgeGaps.filter((gap) => gap.entryId !== id);
    this.write(data);
  }

  async createBookPage(input: BookPageInput) {
    const data = this.read();
    const timestamp = now();
    const page: BookPage = {
      id: createId("page"),
      ...input,
      title: input.title.trim() || "Untitled Page",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.bookPages = [...data.bookPages, page].sort(sortPages);
    this.write(data);
    return page;
  }

  async updateBookPage(id: string, input: BookPageInput) {
    const data = this.read();
    const existing = data.bookPages.find((page) => page.id === id);
    if (!existing) {
      throw new Error("Book page not found");
    }
    const updated: BookPage = {
      ...existing,
      ...input,
      title: input.title.trim() || "Untitled Page",
      updatedAt: now(),
    };
    data.bookPages = data.bookPages.map((page) => (page.id === id ? updated : page)).sort(sortPages);
    this.write(data);
    return updated;
  }

  async deleteBookPage(id: string) {
    const data = this.read();
    data.bookPages = data.bookPages.filter((page) => page.id !== id);
    this.write(data);
  }

  async createRelation(input: RelationInput) {
    const data = this.read();
    const existing = data.relations.find(
      (relation) =>
        relation.fromEntryId === input.fromEntryId &&
        relation.toEntryId === input.toEntryId &&
        relation.relationType === input.relationType,
    );
    if (existing) {
      return existing;
    }
    const relation: Relation = {
      id: createId("relation"),
      ...input,
      relationType: input.relationType || "related",
    };
    data.relations = [...data.relations, relation];
    this.write(data);
    return relation;
  }

  async deleteRelation(id: string) {
    const data = this.read();
    data.relations = data.relations.filter((relation) => relation.id !== id);
    this.write(data);
  }

  async createKnowledgeGap(input: KnowledgeGapInput) {
    const data = this.read();
    const gap: KnowledgeGap = {
      id: createId("gap"),
      ...input,
      title: input.title.trim() || "Untitled Gap",
      status: input.status || "open",
    };
    data.knowledgeGaps = [...data.knowledgeGaps, gap].sort(sortGaps);
    this.write(data);
    return gap;
  }

  async updateKnowledgeGap(id: string, input: KnowledgeGapInput) {
    const data = this.read();
    const existing = data.knowledgeGaps.find((gap) => gap.id === id);
    if (!existing) {
      throw new Error("Knowledge gap not found");
    }
    const updated: KnowledgeGap = {
      ...existing,
      ...input,
      title: input.title.trim() || "Untitled Gap",
    };
    data.knowledgeGaps = data.knowledgeGaps.map((gap) => (gap.id === id ? updated : gap)).sort(sortGaps);
    this.write(data);
    return updated;
  }

  async deleteKnowledgeGap(id: string) {
    const data = this.read();
    data.knowledgeGaps = data.knowledgeGaps.filter((gap) => gap.id !== id);
    this.write(data);
  }

  private read(): AppData {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      const seeded = seedData();
      this.write(seeded);
      return seeded;
    }
    return JSON.parse(raw) as AppData;
  }

  private write(data: AppData) {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }
}

const sortByTitle = (a: Entry, b: Entry) => a.title.localeCompare(b.title);
const sortPages = (a: BookPage, b: BookPage) =>
  a.entryId.localeCompare(b.entryId) || a.pageOrder - b.pageOrder || a.title.localeCompare(b.title);
const sortGaps = (a: KnowledgeGap, b: KnowledgeGap) =>
  a.status.localeCompare(b.status) || a.title.localeCompare(b.title);

const normalizeTags = (tags: string[]) =>
  Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));

export const lexiconRepository: LexiconRepository = isTauriRuntime()
  ? new TauriLexiconRepository()
  : new DemoLexiconRepository();
