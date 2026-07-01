import { invoke } from "@tauri-apps/api/core";
import type {
  AppData,
  BookPage,
  BookPageInput,
  ContentBlock,
  ContentBlockInput,
  Entry,
  EntryInput,
  KnowledgeGap,
  KnowledgeGapInput,
  Relation,
  RelationInput,
  Trail,
  TrailInput,
  TrailItem,
  TrailItemInput,
} from "../types";

interface LexiconRepository {
  loadAppData(): Promise<AppData>;
  createEntry(input: EntryInput): Promise<Entry>;
  updateEntry(id: string, input: EntryInput): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;
  createBookPage(input: BookPageInput): Promise<BookPage>;
  updateBookPage(id: string, input: BookPageInput): Promise<BookPage>;
  deleteBookPage(id: string): Promise<void>;
  replaceContentBlocks(
    ownerType: "entry" | "book_page",
    ownerId: string,
    blocks: ContentBlockInput[],
  ): Promise<ContentBlock[]>;
  createRelation(input: RelationInput): Promise<Relation>;
  updateRelation(id: string, input: RelationInput): Promise<Relation>;
  deleteRelation(id: string): Promise<void>;
  createKnowledgeGap(input: KnowledgeGapInput): Promise<KnowledgeGap>;
  updateKnowledgeGap(id: string, input: KnowledgeGapInput): Promise<KnowledgeGap>;
  deleteKnowledgeGap(id: string): Promise<void>;
  createTrail(input: TrailInput): Promise<Trail>;
  updateTrail(id: string, input: TrailInput): Promise<Trail>;
  deleteTrail(id: string): Promise<void>;
  createTrailItem(input: TrailItemInput): Promise<TrailItem>;
  updateTrailItem(id: string, input: TrailItemInput): Promise<TrailItem>;
  deleteTrailItem(id: string): Promise<void>;
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
  const data: AppData = {
    entries: [
      {
        id: "seed_clip",
        title: "CLIP",
        entryType: "book",
        content:
          "A personal mini-book for understanding Contrastive Language-Image Pre-training and its place in representation learning.",
        category: "Machine Learning",
        tags: ["model", "paper", "vision-language"],
        timelineDate: "2021",
        timelineNote: "Introduced as a major vision-language representation model.",
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
        timelineDate: "",
        timelineNote: "",
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
        timelineDate: "modern ML",
        timelineNote: "A recurring organizing method for representation learning.",
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
        timelineDate: "",
        timelineNote: "",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_hamlet",
        title: "Hamlet",
        entryType: "book",
        content:
          "A nested literary atlas for tracking motifs, death, hesitation, theatricality, and decay.",
        category: "English Literature",
        tags: ["play", "tragedy", "Shakespeare"],
        timelineDate: "1600",
        timelineNote: "Approximate composition period.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_death",
        title: "Death",
        entryType: "entry",
        content:
          "A flexible theme entry for tracking death as theology, bodily decline, political inheritance, and dramatic atmosphere.",
        category: "English Literature",
        tags: ["theme", "literature"],
        timelineDate: "recurring theme",
        timelineNote: "Useful across periods rather than a single dated event.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_motif",
        title: "Motif",
        entryType: "entry",
        content:
          "A recurring image, structure, phrase, or object that gathers meaning across a work or corpus.",
        category: "Literary Method",
        tags: ["method", "analysis"],
        timelineDate: "",
        timelineNote: "",
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
      {
        id: "seed_hamlet_overview",
        entryId: "seed_hamlet",
        title: "Overview",
        content:
          "Hamlet can be read as an atlas of decay, delay, inheritance, theatre, death, and unstable knowledge.",
        pageOrder: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_hamlet_motifs",
        entryId: "seed_hamlet",
        title: "Motifs",
        content:
          "- Decay and corruption\n- Ghostly inheritance\n- Performed madness\n- The skull as compressed mortality",
        pageOrder: 2,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    contentBlocks: [],
    relations: [
      makeRelation("seed_rel_clip_contrastive", "seed_clip", "seed_contrastive_learning", "uses", timestamp),
      makeRelation("seed_rel_clip_zero_shot", "seed_clip", "seed_zero_shot", "enables", timestamp),
      makeRelation("seed_rel_zero_downstream", "seed_zero_shot", "seed_downstream_task", "evaluated on", timestamp),
      makeRelation("seed_rel_hamlet_death", "seed_hamlet", "seed_death", "explores", timestamp),
      makeRelation("seed_rel_hamlet_motif", "seed_hamlet", "seed_motif", "contains", timestamp),
    ],
    knowledgeGaps: [
      makeGap(
        "seed_gap_temperature",
        "seed_clip",
        "Temperature scaling in CLIP",
        "Clarify how the learned temperature parameter affects contrastive logits and retrieval confidence.",
        timestamp,
      ),
      makeGap(
        "seed_gap_prompting",
        "seed_clip",
        "Prompt engineering for CLIP",
        "Collect examples of prompt templates that materially change zero-shot classification performance.",
        timestamp,
      ),
      makeGap(
        "seed_gap_donne",
        "seed_death",
        "Theological death in Donne",
        "Separate doctrine, rhetoric, and intimacy in metaphysical poetry notes.",
        timestamp,
      ),
    ],
    trails: [
      {
        id: "seed_trail_vlm",
        title: "Vision-Language Models Basics",
        description: "A short route from representation learning into CLIP-style zero-shot use.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_trail_death_lit",
        title: "Death in English Literature",
        description: "A compact route from a theme into one dramatic example.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    trailItems: [
      makeTrailItem("seed_trail_vlm_item_0", "seed_trail_vlm", "seed_contrastive_learning", 1, "Start with the training idea.", timestamp),
      makeTrailItem("seed_trail_vlm_item_1", "seed_trail_vlm", "seed_clip", 2, "Move into the shared image-text model.", timestamp),
      makeTrailItem("seed_trail_vlm_item_2", "seed_trail_vlm", "seed_zero_shot", 3, "Then inspect the common use case.", timestamp),
      makeTrailItem("seed_trail_vlm_item_3", "seed_trail_vlm", "seed_downstream_task", 4, "End with evaluation and transfer.", timestamp),
      makeTrailItem("seed_trail_death_lit_item_0", "seed_trail_death_lit", "seed_death", 1, "Theme-level anchor.", timestamp),
      makeTrailItem("seed_trail_death_lit_item_1", "seed_trail_death_lit", "seed_hamlet", 2, "Read the theme through a play.", timestamp),
      makeTrailItem("seed_trail_death_lit_item_2", "seed_trail_death_lit", "seed_motif", 3, "Track how repeated devices carry it.", timestamp),
    ],
  };

  return normalizeData(data);
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

  replaceContentBlocks(ownerType: "entry" | "book_page", ownerId: string, blocks: ContentBlockInput[]) {
    return invoke<ContentBlock[]>("replace_content_blocks", { ownerType, ownerId, blocks });
  }

  createRelation(input: RelationInput) {
    return invoke<Relation>("create_relation", { input });
  }

  updateRelation(id: string, input: RelationInput) {
    return invoke<Relation>("update_relation", { id, input });
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

  createTrail(input: TrailInput) {
    return invoke<Trail>("create_trail", { input });
  }

  updateTrail(id: string, input: TrailInput) {
    return invoke<Trail>("update_trail", { id, input });
  }

  deleteTrail(id: string) {
    return invoke<void>("delete_trail", { id });
  }

  createTrailItem(input: TrailItemInput) {
    return invoke<TrailItem>("create_trail_item", { input });
  }

  updateTrailItem(id: string, input: TrailItemInput) {
    return invoke<TrailItem>("update_trail_item", { id, input });
  }

  deleteTrailItem(id: string) {
    return invoke<void>("delete_trail_item", { id });
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
    const pageIds = data.bookPages.filter((page) => page.entryId === id).map((page) => page.id);
    data.entries = data.entries.filter((entry) => entry.id !== id);
    data.bookPages = data.bookPages.filter((page) => page.entryId !== id);
    data.contentBlocks = data.contentBlocks.filter(
      (block) =>
        !(block.ownerType === "entry" && block.ownerId === id) &&
        !(block.ownerType === "book_page" && pageIds.includes(block.ownerId)),
    );
    data.relations = data.relations.filter(
      (relation) => relation.fromEntryId !== id && relation.toEntryId !== id,
    );
    data.knowledgeGaps = data.knowledgeGaps
      .filter((gap) => gap.entryId !== id)
      .map((gap) => (gap.resolvedEntryId === id ? { ...gap, resolvedEntryId: "" } : gap));
    data.trailItems = data.trailItems.filter((item) => item.entryId !== id);
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
    data.contentBlocks = data.contentBlocks.filter(
      (block) => !(block.ownerType === "book_page" && block.ownerId === id),
    );
    this.write(data);
  }

  async replaceContentBlocks(
    ownerType: "entry" | "book_page",
    ownerId: string,
    blocks: ContentBlockInput[],
  ) {
    const data = this.read();
    const timestamp = now();
    const savedBlocks = blocks.map((block, index): ContentBlock => ({
      id: createId("block"),
      ownerType,
      ownerId,
      blockType: block.blockType,
      content: block.content,
      metadata: normalizeMetadata(block.metadata),
      blockOrder: Math.max(block.blockOrder, index + 1),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    data.contentBlocks = [
      ...data.contentBlocks.filter(
        (block) => !(block.ownerType === ownerType && block.ownerId === ownerId),
      ),
      ...savedBlocks,
    ].sort(sortBlocks);

    const projection = projectBlocksToContent(savedBlocks);
    if (ownerType === "entry") {
      data.entries = data.entries.map((entry) =>
        entry.id === ownerId ? { ...entry, content: projection, updatedAt: timestamp } : entry,
      );
    } else {
      data.bookPages = data.bookPages.map((page) =>
        page.id === ownerId ? { ...page, content: projection, updatedAt: timestamp } : page,
      );
    }

    this.write(data);
    return savedBlocks;
  }

  async createRelation(input: RelationInput) {
    const data = this.read();
    const relationType = input.relationType.trim() || "related to";
    const existing = data.relations.find(
      (relation) =>
        relation.fromEntryId === input.fromEntryId &&
        relation.toEntryId === input.toEntryId &&
        relation.relationType === relationType,
    );
    if (existing) {
      return existing;
    }
    const timestamp = now();
    const relation: Relation = {
      id: createId("relation"),
      ...input,
      relationType,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.relations = [...data.relations, relation];
    this.write(data);
    return relation;
  }

  async updateRelation(id: string, input: RelationInput) {
    const data = this.read();
    const existing = data.relations.find((relation) => relation.id === id);
    if (!existing) {
      throw new Error("Relation not found");
    }
    const updated: Relation = {
      ...existing,
      ...input,
      relationType: input.relationType.trim() || "related to",
      updatedAt: now(),
    };
    data.relations = data.relations.map((relation) => (relation.id === id ? updated : relation));
    this.write(data);
    return updated;
  }

  async deleteRelation(id: string) {
    const data = this.read();
    data.relations = data.relations.filter((relation) => relation.id !== id);
    this.write(data);
  }

  async createKnowledgeGap(input: KnowledgeGapInput) {
    const data = this.read();
    const timestamp = now();
    const gap: KnowledgeGap = {
      id: createId("gap"),
      ...input,
      title: input.title.trim() || "Untitled Gap",
      status: input.status || "open",
      resolvedEntryId: input.resolvedEntryId || "",
      createdAt: timestamp,
      updatedAt: timestamp,
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
      resolvedEntryId: input.resolvedEntryId || "",
      updatedAt: now(),
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

  async createTrail(input: TrailInput) {
    const data = this.read();
    const timestamp = now();
    const trail: Trail = {
      id: createId("trail"),
      title: input.title.trim() || "Untitled Trail",
      description: input.description,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.trails = [...data.trails, trail].sort(sortTrails);
    this.write(data);
    return trail;
  }

  async updateTrail(id: string, input: TrailInput) {
    const data = this.read();
    const existing = data.trails.find((trail) => trail.id === id);
    if (!existing) {
      throw new Error("Trail not found");
    }
    const updated: Trail = {
      ...existing,
      title: input.title.trim() || "Untitled Trail",
      description: input.description,
      updatedAt: now(),
    };
    data.trails = data.trails.map((trail) => (trail.id === id ? updated : trail)).sort(sortTrails);
    this.write(data);
    return updated;
  }

  async deleteTrail(id: string) {
    const data = this.read();
    data.trails = data.trails.filter((trail) => trail.id !== id);
    data.trailItems = data.trailItems.filter((item) => item.trailId !== id);
    this.write(data);
  }

  async createTrailItem(input: TrailItemInput) {
    const data = this.read();
    const timestamp = now();
    const item: TrailItem = {
      id: createId("trail_item"),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.trailItems = [...data.trailItems, item].sort(sortTrailItems);
    this.write(data);
    return item;
  }

  async updateTrailItem(id: string, input: TrailItemInput) {
    const data = this.read();
    const existing = data.trailItems.find((item) => item.id === id);
    if (!existing) {
      throw new Error("Trail item not found");
    }
    const updated: TrailItem = { ...existing, ...input, updatedAt: now() };
    data.trailItems = data.trailItems.map((item) => (item.id === id ? updated : item)).sort(sortTrailItems);
    this.write(data);
    return updated;
  }

  async deleteTrailItem(id: string) {
    const data = this.read();
    data.trailItems = data.trailItems.filter((item) => item.id !== id);
    this.write(data);
  }

  private read(): AppData {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      const seeded = seedData();
      this.write(seeded);
      return seeded;
    }

    const normalized = normalizeData(JSON.parse(raw) as Partial<AppData>);
    this.write(normalized);
    return normalized;
  }

  private write(data: AppData) {
    localStorage.setItem(storageKey, JSON.stringify(normalizeData(data)));
  }
}

function normalizeData(partial: Partial<AppData>): AppData {
  const timestamp = now();
  const entries = (partial.entries ?? []).map((entry) => ({
    ...entry,
    entryType: entry.entryType ?? "entry",
    content: entry.content ?? "",
    category: entry.category ?? "",
    tags: normalizeTags(entry.tags ?? []),
    timelineDate: entry.timelineDate ?? "",
    timelineNote: entry.timelineNote ?? "",
    createdAt: entry.createdAt ?? timestamp,
    updatedAt: entry.updatedAt ?? timestamp,
  })) as Entry[];

  const bookPages = (partial.bookPages ?? []).map((page) => ({
    ...page,
    content: page.content ?? "",
    pageOrder: page.pageOrder ?? 1,
    createdAt: page.createdAt ?? timestamp,
    updatedAt: page.updatedAt ?? timestamp,
  })) as BookPage[];

  const contentBlocks = ((partial.contentBlocks ?? []) as ContentBlock[])
    .map((block) => ({
      ...block,
      blockType: block.blockType ?? "markdown",
      content: block.content ?? "",
      metadata: normalizeMetadata(block.metadata),
      blockOrder: block.blockOrder ?? 1,
      createdAt: block.createdAt ?? timestamp,
      updatedAt: block.updatedAt ?? timestamp,
    }))
    .sort(sortBlocks);

  const relations = (partial.relations ?? []).map((relation) => ({
    ...relation,
    relationType: relation.relationType === "related" ? "related to" : relation.relationType || "related to",
    note: relation.note ?? "",
    createdAt: relation.createdAt ?? timestamp,
    updatedAt: relation.updatedAt ?? timestamp,
  })) as Relation[];

  const knowledgeGaps = (partial.knowledgeGaps ?? []).map((gap) => ({
    ...gap,
    note: gap.note ?? "",
    status: gap.status ?? "open",
    resolvedEntryId: gap.resolvedEntryId ?? "",
    createdAt: gap.createdAt ?? timestamp,
    updatedAt: gap.updatedAt ?? timestamp,
  })) as KnowledgeGap[];

  const trails = ((partial.trails ?? []) as Trail[])
    .map((trail) => ({
      ...trail,
      title: trail.title || "Untitled Trail",
      description: trail.description ?? "",
      createdAt: trail.createdAt ?? timestamp,
      updatedAt: trail.updatedAt ?? timestamp,
    }))
    .sort(sortTrails);

  const trailItems = ((partial.trailItems ?? []) as TrailItem[])
    .map((item) => ({
      ...item,
      itemOrder: item.itemOrder ?? 1,
      note: item.note ?? "",
      createdAt: item.createdAt ?? timestamp,
      updatedAt: item.updatedAt ?? timestamp,
    }))
    .sort(sortTrailItems);

  const hydratedBlocks = [...contentBlocks];
  for (const entry of entries) {
    if (entry.content.trim() && !ownerHasBlocks(hydratedBlocks, "entry", entry.id)) {
      hydratedBlocks.push(makeBlock("entry", entry.id, "markdown", entry.content, 1, timestamp));
    }
  }
  for (const page of bookPages) {
    if (page.content.trim() && !ownerHasBlocks(hydratedBlocks, "book_page", page.id)) {
      hydratedBlocks.push(makeBlock("book_page", page.id, "markdown", page.content, 1, timestamp));
    }
  }

  return {
    entries: entries.sort(sortByTitle),
    bookPages: bookPages.sort(sortPages),
    contentBlocks: hydratedBlocks.sort(sortBlocks),
    relations,
    knowledgeGaps: knowledgeGaps.sort(sortGaps),
    trails,
    trailItems,
  };
}

function makeRelation(
  id: string,
  fromEntryId: string,
  toEntryId: string,
  relationType: string,
  timestamp: string,
): Relation {
  return {
    id,
    fromEntryId,
    toEntryId,
    relationType,
    note: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeGap(
  id: string,
  entryId: string,
  title: string,
  note: string,
  timestamp: string,
): KnowledgeGap {
  return {
    id,
    entryId,
    title,
    note,
    status: "open",
    resolvedEntryId: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeTrailItem(
  id: string,
  trailId: string,
  entryId: string,
  itemOrder: number,
  note: string,
  timestamp: string,
): TrailItem {
  return { id, trailId, entryId, itemOrder, note, createdAt: timestamp, updatedAt: timestamp };
}

function makeBlock(
  ownerType: "entry" | "book_page",
  ownerId: string,
  blockType: ContentBlock["blockType"],
  content: string,
  blockOrder: number,
  timestamp: string,
): ContentBlock {
  return {
    id: createId("block"),
    ownerType,
    ownerId,
    blockType,
    content,
    metadata: "{}",
    blockOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function ownerHasBlocks(blocks: ContentBlock[], ownerType: "entry" | "book_page", ownerId: string) {
  return blocks.some((block) => block.ownerType === ownerType && block.ownerId === ownerId);
}

function projectBlocksToContent(blocks: ContentBlock[]) {
  return [...blocks]
    .sort((a, b) => a.blockOrder - b.blockOrder)
    .filter((block) => block.blockType !== "divider")
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeMetadata(value: string | undefined) {
  if (!value?.trim()) {
    return "{}";
  }
  try {
    JSON.parse(value);
    return value;
  } catch {
    return "{}";
  }
}

const sortByTitle = (a: Entry, b: Entry) => a.title.localeCompare(b.title);
const sortPages = (a: BookPage, b: BookPage) =>
  a.entryId.localeCompare(b.entryId) || a.pageOrder - b.pageOrder || a.title.localeCompare(b.title);
const sortBlocks = (a: ContentBlock, b: ContentBlock) =>
  a.ownerType.localeCompare(b.ownerType) || a.ownerId.localeCompare(b.ownerId) || a.blockOrder - b.blockOrder;
const sortGaps = (a: KnowledgeGap, b: KnowledgeGap) =>
  a.status.localeCompare(b.status) || a.title.localeCompare(b.title);
const sortTrails = (a: Trail, b: Trail) => a.title.localeCompare(b.title);
const sortTrailItems = (a: TrailItem, b: TrailItem) =>
  a.trailId.localeCompare(b.trailId) || a.itemOrder - b.itemOrder;

const normalizeTags = (tags: string[]) =>
  Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));

export const lexiconRepository: LexiconRepository = isTauriRuntime()
  ? new TauriLexiconRepository()
  : new DemoLexiconRepository();
