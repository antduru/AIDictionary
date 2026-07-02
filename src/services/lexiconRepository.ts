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
        id: "seed_hamlet",
        title: "Hamlet",
        entryType: "book",
        content:
          "A nested atlas for reading Hamlet through sovereignty, theatrical knowledge, mourning, succession, and forms of delay.",
        category: "Early Modern Drama",
        tags: ["Shakespeare", "tragedy", "revenge tragedy", "epistemology"],
        timelineDate: "1600",
        timelineNote: "Approximate composition period; useful for locating the play near succession anxiety and late Elizabethan theatrical culture.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_paradise_lost",
        title: "Paradise Lost",
        entryType: "book",
        content:
          "A Miltonic mini-book for epic form, obedience, liberty, fallenness, republican memory, and the pressure of theology on poetic syntax.",
        category: "Restoration Epic",
        tags: ["Milton", "epic", "blank verse", "theology", "republicanism"],
        timelineDate: "1667",
        timelineNote: "First published in ten books in 1667; revised into twelve books in 1674.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_waste_land",
        title: "The Waste Land",
        entryType: "book",
        content:
          "A modernist mini-book for allusion, fragmentation, ritual method, urban voices, and the problem of cultural inheritance after catastrophe.",
        category: "Modernist Poetry",
        tags: ["Eliot", "modernism", "allusion", "fragment", "ritual"],
        timelineDate: "1922",
        timelineNote: "Published in the high modernist annus mirabilis alongside Ulysses and Jacob's Room.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_negative_capability",
        title: "Negative Capability",
        entryType: "entry",
        content:
          "Keats's name for the poet's capacity to remain with uncertainty, mystery, and unresolved contradiction without converting them too quickly into doctrine.\n\nIn PhD-level use, treat it less as a slogan for vagueness and more as a theory of suspended epistemic mastery.",
        category: "Romantic Poetics",
        tags: ["Keats", "Romanticism", "poetics", "uncertainty"],
        timelineDate: "1817",
        timelineNote: "Formulated in Keats's December 1817 letter to George and Thomas Keats.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_elegy",
        title: "Elegy",
        entryType: "entry",
        content:
          "A mode of writing organized by loss, consolation, memorial address, and the instability of surviving speech.\n\nUseful axis: public commemoration versus private grief; ritual closure versus melancholic repetition.",
        category: "Genre and Form",
        tags: ["genre", "mourning", "lyric", "death"],
        timelineDate: "classical to modern",
        timelineNote: "A durable form that shifts from classical lament to modern meditations on historical rupture.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_ekphrasis",
        title: "Ekphrasis",
        entryType: "entry",
        content:
          "The verbal representation of visual art or visual experience, often staging rivalry between media, spectatorship, and interpretation.\n\nTrack who controls the gaze, what the described object withholds, and whether description becomes possession.",
        category: "Rhetoric and Media",
        tags: ["rhetoric", "visuality", "aesthetics", "media"],
        timelineDate: "ancient rhetoric",
        timelineNote: "A classical rhetorical term that becomes central to modern theories of word-image relations.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_pastoral",
        title: "Pastoral",
        entryType: "entry",
        content:
          "A mode that imagines rural retreat in order to think about labor, artifice, class, enclosure, ecology, and political disappointment.\n\nDo not reduce pastoral to scenery; its force often lies in the friction between idealized withdrawal and material history.",
        category: "Genre and Mode",
        tags: ["genre", "ecology", "class", "landscape"],
        timelineDate: "classical to modern",
        timelineNote: "From Theocritus and Virgil through Renaissance eclogue, Romantic retreat, and modern anti-pastoral.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_free_indirect_discourse",
        title: "Free Indirect Discourse",
        entryType: "entry",
        content:
          "A narrative technique in which third-person narration absorbs a character's idiom, judgments, or perceptual field without direct quotation.\n\nIt is especially useful for tracking irony, social cognition, and the unstable boundary between narrator and character.",
        category: "Narratology",
        tags: ["novel", "narration", "Austen", "irony"],
        timelineDate: "19th century",
        timelineNote: "Frequently associated with Austen and later realist or modernist fiction.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_metaphysical_conceit",
        title: "Metaphysical Conceit",
        entryType: "entry",
        content:
          "An intellectually strenuous figure that joins remote fields of experience into a single argumentative image.\n\nIn Donne and later criticism, the conceit is not ornamental excess but a pressure point where theology, erotic address, and logical wit meet.",
        category: "Early Modern Poetry",
        tags: ["Donne", "metaphysical poetry", "rhetoric", "wit"],
        timelineDate: "17th century",
        timelineNote: "A retrospective critical category shaped by eighteenth-century and modern accounts of metaphysical poetry.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_allusion",
        title: "Allusion",
        entryType: "entry",
        content:
          "A compressed reference that activates another text, tradition, myth, event, or interpretive frame without fully absorbing it.\n\nAt doctoral level, ask what allusion authorizes, excludes, misremembers, or makes newly available under historical pressure.",
        category: "Intertextuality",
        tags: ["method", "intertextuality", "modernism", "classics"],
        timelineDate: "",
        timelineNote: "",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    bookPages: [
      {
        id: "seed_hamlet_overview",
        entryId: "seed_hamlet",
        title: "Overview",
        content:
          "Hamlet is useful as a research atlas because nearly every local problem opens into a larger scholarly route:\n\n- Succession and sovereignty\n- Mourning and theatricality\n- Revenge tragedy and legal delay\n- Surveillance, inwardness, and uncertain knowledge",
        pageOrder: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_hamlet_sovereignty",
        entryId: "seed_hamlet",
        title: "Sovereignty and Surveillance",
        content:
          "The court is not only a setting but an information system.\n\n- Claudius governs through watching, testing, and managed spectacle\n- Hamlet's delay is partly a crisis of evidence\n- Political legitimacy becomes inseparable from performance",
        pageOrder: 2,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_hamlet_theatre",
        entryId: "seed_hamlet",
        title: "Theatre and Epistemology",
        content:
          "The play repeatedly asks whether performance reveals truth or merely produces another surface.\n\n- The Mousetrap converts theatre into experiment\n- Feigned madness makes sincerity unreadable\n- Soliloquy becomes both disclosure and staged self-scrutiny",
        pageOrder: 3,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_hamlet_motifs",
        entryId: "seed_hamlet",
        title: "Motifs to Track",
        content:
          "- Rot, rankness, and bodily corruption\n- Ears, poison, and the vulnerability of reception\n- Books, tablets, and memory as inscription\n- Skulls and theatrical objects as condensed mortality",
        pageOrder: 4,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_paradise_overview",
        entryId: "seed_paradise_lost",
        title: "Overview",
        content:
          "Paradise Lost turns epic scale into a problem of interpretation: how can a fallen reader judge obedience, liberty, heroism, and eloquence after the Fall?",
        pageOrder: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_paradise_argument",
        entryId: "seed_paradise_lost",
        title: "Epic Argument",
        content:
          "- Begins in medias res but frames cosmic history as moral argument\n- Reworks classical epic machinery through Christian theology\n- Makes heroic energy suspect when it appears as Satanic charisma",
        pageOrder: 2,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_paradise_satanic_rhetoric",
        entryId: "seed_paradise_lost",
        title: "Satanic Rhetoric",
        content:
          "Satan's speeches are powerful because they convert injury into political theatre.\n\nResearch note: track where republican vocabulary becomes demonic self-authorization rather than simple Miltonic endorsement.",
        pageOrder: 3,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_paradise_blank_verse",
        entryId: "seed_paradise_lost",
        title: "Blank Verse Notes",
        content:
          "Milton's syntax delays closure, stretches causality, and asks the reader to hold theological and grammatical suspense across long verse paragraphs.",
        pageOrder: 4,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_waste_overview",
        entryId: "seed_waste_land",
        title: "Overview",
        content:
          "The Waste Land can be mapped as a poem of broken mediation: fragments of ritual, quotation, urban speech, prophecy, song, and scholarly annotation compete for authority.",
        pageOrder: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_waste_fragment",
        entryId: "seed_waste_land",
        title: "Fragment and Allusion",
        content:
          "- Allusion does not simply restore tradition; it exposes tradition as damaged, partial, and overdetermined\n- Fragmentation is both historical symptom and compositional method\n- The notes stage scholarship as part of the poem's unstable apparatus",
        pageOrder: 2,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_waste_ritual",
        entryId: "seed_waste_land",
        title: "Ritual and Anthropology",
        content:
          "The poem borrows ritual frameworks from comparative anthropology, but the result is not a stable key. Treat Frazer and Weston as part of the poem's method of anxious pattern-making.",
        pageOrder: 3,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_waste_voices",
        entryId: "seed_waste_land",
        title: "Urban Voices",
        content:
          "The city appears as a pressure chamber of overheard voices, exhausted desire, commodity culture, and broken forms of address.",
        pageOrder: 4,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    contentBlocks: [],
    relations: [
      makeRelation("seed_rel_hamlet_negative_capability", "seed_hamlet", "seed_negative_capability", "anticipates", timestamp),
      makeRelation("seed_rel_hamlet_elegy", "seed_hamlet", "seed_elegy", "disturbs", timestamp),
      makeRelation("seed_rel_paradise_pastoral", "seed_paradise_lost", "seed_pastoral", "reworks", timestamp),
      makeRelation("seed_rel_paradise_elegy", "seed_paradise_lost", "seed_elegy", "contains", timestamp),
      makeRelation("seed_rel_waste_allusion", "seed_waste_land", "seed_allusion", "depends on", timestamp),
      makeRelation("seed_rel_waste_elegy", "seed_waste_land", "seed_elegy", "modernizes", timestamp),
      makeRelation("seed_rel_waste_pastoral", "seed_waste_land", "seed_pastoral", "ironizes", timestamp),
      makeRelation("seed_rel_ekphrasis_allusion", "seed_ekphrasis", "seed_allusion", "overlaps with", timestamp),
      makeRelation("seed_rel_free_indirect_negative", "seed_free_indirect_discourse", "seed_negative_capability", "creates space for", timestamp),
      makeRelation("seed_rel_metaphysical_ekphrasis", "seed_metaphysical_conceit", "seed_ekphrasis", "contrasts with", timestamp),
    ],
    knowledgeGaps: [
      makeGap(
        "seed_gap_ophelia",
        "seed_hamlet",
        "Ophelia and lyric interruption",
        "Separate Ophelia's songs as dramatic symptom, courtly archive, and gendered counter-memory.",
        timestamp,
      ),
      makeGap(
        "seed_gap_milton_matter",
        "seed_paradise_lost",
        "Miltonic matter and monism",
        "Clarify how debates about spirit, matter, and monism affect readings of embodiment in Paradise Lost.",
        timestamp,
      ),
      makeGap(
        "seed_gap_waste_ritual",
        "seed_waste_land",
        "Frazer, Weston, and ritual method",
        "Track when ritual anthropology functions as explanatory key, parody, or scholarly noise.",
        timestamp,
      ),
      makeGap(
        "seed_gap_austen_woolf",
        "seed_free_indirect_discourse",
        "Austen to Woolf transition",
        "Map how free indirect discourse shifts from social irony toward interior duration and modernist perception.",
        timestamp,
      ),
      makeGap(
        "seed_gap_antipastoral",
        "seed_pastoral",
        "Anti-pastoral after enclosure",
        "Collect examples where rural retreat exposes labor, dispossession, or ecological damage rather than harmony.",
        timestamp,
      ),
    ],
    trails: [
      {
        id: "seed_trail_tragedy_knowledge",
        title: "Early Modern Tragedy and Knowledge",
        description: "A route through uncertainty, theatrical evidence, and figures of unresolved thought.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_trail_form_history",
        title: "Form, Loss, and Historical Pressure",
        description: "A route from elegiac form into epic fallenness and modernist fragmentation.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_trail_mediation",
        title: "Modes of Mediation",
        description: "A compact path through image, reference, narration, and interpretive distance.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    trailItems: [
      makeTrailItem("seed_trail_tragedy_knowledge_item_0", "seed_trail_tragedy_knowledge", "seed_hamlet", 1, "Begin with drama as an engine of uncertain evidence.", timestamp),
      makeTrailItem("seed_trail_tragedy_knowledge_item_1", "seed_trail_tragedy_knowledge", "seed_metaphysical_conceit", 2, "Move to difficult figuration as argumentative pressure.", timestamp),
      makeTrailItem("seed_trail_tragedy_knowledge_item_2", "seed_trail_tragedy_knowledge", "seed_negative_capability", 3, "End with a poetics of remaining inside uncertainty.", timestamp),
      makeTrailItem("seed_trail_form_history_item_0", "seed_trail_form_history", "seed_elegy", 1, "Start with loss as genre and ritual problem.", timestamp),
      makeTrailItem("seed_trail_form_history_item_1", "seed_trail_form_history", "seed_paradise_lost", 2, "Scale loss into epic fallenness and theological history.", timestamp),
      makeTrailItem("seed_trail_form_history_item_2", "seed_trail_form_history", "seed_waste_land", 3, "Watch modernism inherit epic and elegy as fragments.", timestamp),
      makeTrailItem("seed_trail_mediation_item_0", "seed_trail_mediation", "seed_ekphrasis", 1, "Start with word-image mediation.", timestamp),
      makeTrailItem("seed_trail_mediation_item_1", "seed_trail_mediation", "seed_allusion", 2, "Move to reference as compressed historical relation.", timestamp),
      makeTrailItem("seed_trail_mediation_item_2", "seed_trail_mediation", "seed_free_indirect_discourse", 3, "End with narration as mediated consciousness.", timestamp),
    ],
  };

  return normalizeData(data);
};

const legacySeedEntryIds = new Set([
  "seed_clip",
  "seed_downstream_task",
  "seed_contrastive_learning",
  "seed_zero_shot",
  "seed_hamlet",
  "seed_death",
  "seed_motif",
]);

const legacySeedPageIds = new Set([
  "seed_clip_overview",
  "seed_clip_core",
  "seed_clip_confusions",
  "seed_clip_notes",
  "seed_hamlet_overview",
  "seed_hamlet_motifs",
]);

const legacySeedTrailIds = new Set(["seed_trail_vlm", "seed_trail_death_lit"]);

const shouldReplaceLegacySeed = (data: AppData) =>
  data.entries.some((entry) => entry.id === "seed_clip") &&
  !data.entries.some((entry) => entry.id === "seed_waste_land");

const replaceLegacySeedData = (data: AppData): AppData => {
  if (!shouldReplaceLegacySeed(data)) {
    return data;
  }

  const literatureSeed = seedData();
  const legacyPageIds = new Set([
    ...legacySeedPageIds,
    ...data.bookPages
      .filter((page) => legacySeedEntryIds.has(page.entryId))
      .map((page) => page.id),
  ]);

  return normalizeData({
    entries: [
      ...data.entries.filter((entry) => !legacySeedEntryIds.has(entry.id)),
      ...literatureSeed.entries,
    ],
    bookPages: [
      ...data.bookPages.filter(
        (page) => !legacySeedEntryIds.has(page.entryId) && !legacyPageIds.has(page.id),
      ),
      ...literatureSeed.bookPages,
    ],
    contentBlocks: [
      ...data.contentBlocks.filter(
        (block) =>
          !(block.ownerType === "entry" && legacySeedEntryIds.has(block.ownerId)) &&
          !(block.ownerType === "book_page" && legacyPageIds.has(block.ownerId)),
      ),
      ...literatureSeed.contentBlocks,
    ],
    relations: [
      ...data.relations.filter(
        (relation) =>
          !legacySeedEntryIds.has(relation.fromEntryId) &&
          !legacySeedEntryIds.has(relation.toEntryId),
      ),
      ...literatureSeed.relations,
    ],
    knowledgeGaps: [
      ...data.knowledgeGaps.filter((gap) => !legacySeedEntryIds.has(gap.entryId)),
      ...literatureSeed.knowledgeGaps,
    ],
    trails: [
      ...data.trails.filter((trail) => !legacySeedTrailIds.has(trail.id)),
      ...literatureSeed.trails,
    ],
    trailItems: [
      ...data.trailItems.filter((item) => !legacySeedTrailIds.has(item.trailId)),
      ...literatureSeed.trailItems,
    ],
  });
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

    const normalized = replaceLegacySeedData(normalizeData(JSON.parse(raw) as Partial<AppData>));
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
