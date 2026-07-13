import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AtlasBook } from "./components/AtlasBook";
import { LibraryList } from "./components/LibraryList";
import { MapView } from "./components/MapView";
import { MiniBook } from "./components/MiniBook";
import { RightContextPanel } from "./components/RightContextPanel";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { TimelineView } from "./components/TimelineView";
import { TopBar } from "./components/TopBar";
import { TrailsView } from "./components/TrailsView";
import { lexiconRepository } from "./services/lexiconRepository";
import type {
  AppData,
  AppView,
  ContentBlockInput,
  BookPageInput,
  EntryInput,
  EntryType,
  KnowledgeGapInput,
  RelationInput,
  TrailInput,
  TrailItemInput,
} from "./types";
import { matchesLetter, matchesQuery } from "./utils/filters";
import { ownerBlocks } from "./utils/blocks";

const emptyData: AppData = {
  entries: [],
  bookPages: [],
  contentBlocks: [],
  relations: [],
  knowledgeGaps: [],
  trails: [],
  trailItems: [],
};

export default function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [activeView, setActiveView] = useState<AppView>("atlas");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState("All");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EntryType>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRelationRequest, setAutoRelationRequest] = useState<{ entryId: string; nonce: number } | null>(null);

  const selectedEntry = useMemo(
    () => data.entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [data.entries, selectedEntryId],
  );

  const openBook = useMemo(
    () => data.entries.find((entry) => entry.id === openBookId && entry.entryType === "book") ?? null,
    [data.entries, openBookId],
  );

  const openBookPages = useMemo(
    () => data.bookPages.filter((page) => page.entryId === openBookId),
    [data.bookPages, openBookId],
  );

  const selectedEntryBlocks = useMemo(
    () => selectedEntry ? ownerBlocks(data.contentBlocks, "entry", selectedEntry.id) : [],
    [data.contentBlocks, selectedEntry],
  );

  const atlasEntries = useMemo(
    () =>
      data.entries.filter((entry) => matchesQuery(entry, query) && matchesLetter(entry, activeLetter)),
    [activeLetter, data.entries, query],
  );

  const loadData = useCallback(async (nextSelectedId?: string | null) => {
    const loaded = await lexiconRepository.loadAppData();
    setData(loaded);
    setSelectedTrailId((current) => {
      if (current && loaded.trails.some((trail) => trail.id === current)) {
        return current;
      }
      return loaded.trails[0]?.id ?? null;
    });
    setSelectedEntryId((current) => {
      if (nextSelectedId !== undefined) {
        return nextSelectedId;
      }
      if (current && loaded.entries.some((entry) => entry.id === current)) {
        return current;
      }
      return loaded.entries[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    loadData()
      .catch((err: unknown) => setError(errorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [loadData]);

  const queueAutoRelationSuggestion = (entryId: string) => {
    setAutoRelationRequest({ entryId, nonce: Date.now() });
  };

  const handleCreateEntryCandidate = async (input: EntryInput, sourceEntryId: string, reason: string) => {
    let createdId: string | null = null;
    await runMutation(async () => {
      const created = await lexiconRepository.createEntry(input);
      createdId = created.id;
      await lexiconRepository.replaceContentBlocks("entry", created.id, [
        {
          blockType: "markdown",
          content: reason ? `Suggested from atlas context.\n\n${reason}` : "Suggested from atlas context.",
          metadata: "{}",
          blockOrder: 1,
        },
      ]);
      await lexiconRepository.createRelation({
        fromEntryId: sourceEntryId,
        toEntryId: created.id,
        relationType: "related to",
        note: reason,
      });
    }, sourceEntryId);
    if (createdId) {
      queueAutoRelationSuggestion(sourceEntryId);
    }
  };

  const hasMeaningfulBlocks = (blocks: ContentBlockInput[]) =>
    blocks.some((block) => block.blockType !== "divider" && block.content.trim());

  const runMutation = async (operation: () => Promise<void>, nextSelectedId?: string | null) => {
    setError(null);
    try {
      await operation();
      await loadData(nextSelectedId);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
    setOpenBookId(null);
    setEditingEntryId(null);
    setActiveView("atlas");
  };

  const handleOpenBook = (entryId: string) => {
    setSelectedEntryId(entryId);
    setOpenBookId(entryId);
    setEditingEntryId(null);
    setActiveView("atlas");
  };

  const handleCreateEntry = async (entryType: EntryType) => {
    let createdId: string | null = null;
    await runMutation(async () => {
      const created = await lexiconRepository.createEntry({
        title: entryType === "book" ? "Untitled Book" : "Untitled Entry",
        entryType,
        content: "",
        category: "",
        tags: [],
        timelineDate: "",
        timelineNote: "",
      });
      createdId = created.id;
      if (entryType === "book") {
        await lexiconRepository.createBookPage({
          entryId: created.id,
          title: "Opening Page",
          content: "",
          pageOrder: 1,
        });
      }
    }, null);

    if (createdId) {
      setSelectedEntryId(createdId);
      setEditingEntryId(createdId);
      setOpenBookId(entryType === "book" ? createdId : null);
      setActiveView("atlas");
    }
  };

  const handleSaveEntry = async (entryId: string, input: EntryInput, blocks: ContentBlockInput[]) => {
    await runMutation(async () => {
      await lexiconRepository.updateEntry(entryId, input);
      await lexiconRepository.replaceContentBlocks("entry", entryId, blocks);
    }, entryId);
    setEditingEntryId(null);
    setOpenBookId((current) => (input.entryType === "book" ? current : null));
    if (input.title.trim() || input.content.trim() || hasMeaningfulBlocks(blocks)) {
      queueAutoRelationSuggestion(entryId);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const remaining = data.entries.find((entry) => entry.id !== entryId)?.id ?? null;
    await runMutation(async () => {
      await lexiconRepository.deleteEntry(entryId);
    }, remaining);
    setOpenBookId((current) => (current === entryId ? null : current));
    setEditingEntryId(null);
  };

  const handleCreatePage = async (input: BookPageInput) => {
    await runMutation(async () => {
      await lexiconRepository.createBookPage(input);
    }, input.entryId);
  };

  const handleUpdatePage = async (pageId: string, input: BookPageInput, blocks: ContentBlockInput[]) => {
    await runMutation(async () => {
      await lexiconRepository.updateBookPage(pageId, input);
      await lexiconRepository.replaceContentBlocks("book_page", pageId, blocks);
    }, input.entryId);
    if (input.title.trim() || input.content.trim() || hasMeaningfulBlocks(blocks)) {
      queueAutoRelationSuggestion(input.entryId);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    const page = data.bookPages.find((candidate) => candidate.id === pageId);
    await runMutation(async () => {
      await lexiconRepository.deleteBookPage(pageId);
    }, page?.entryId ?? selectedEntryId);
  };

  const handleAddRelation = async (input: RelationInput) => {
    await runMutation(async () => {
      await lexiconRepository.createRelation(input);
    }, input.fromEntryId);
  };

  const handleUpdateRelation = async (relationId: string, input: RelationInput) => {
    await runMutation(async () => {
      await lexiconRepository.updateRelation(relationId, input);
    }, selectedEntryId);
  };

  const handleDeleteRelation = async (relationId: string) => {
    await runMutation(async () => {
      await lexiconRepository.deleteRelation(relationId);
    }, selectedEntryId);
  };

  const handleAddKnowledgeGap = async (input: KnowledgeGapInput) => {
    await runMutation(async () => {
      await lexiconRepository.createKnowledgeGap(input);
    }, input.entryId);
  };

  const handleUpdateKnowledgeGap = async (gapId: string, input: KnowledgeGapInput) => {
    await runMutation(async () => {
      await lexiconRepository.updateKnowledgeGap(gapId, input);
    }, input.entryId);
  };

  const handleDeleteKnowledgeGap = async (gapId: string) => {
    await runMutation(async () => {
      await lexiconRepository.deleteKnowledgeGap(gapId);
    }, selectedEntryId);
  };

  const handleCreateTrail = async (input: TrailInput) => {
    let createdTrailId: string | null = null;
    await runMutation(async () => {
      const trail = await lexiconRepository.createTrail(input);
      createdTrailId = trail.id;
    }, selectedEntryId);
    if (createdTrailId) {
      setSelectedTrailId(createdTrailId);
    }
  };

  const handleUpdateTrail = async (trailId: string, input: TrailInput) => {
    await runMutation(async () => {
      await lexiconRepository.updateTrail(trailId, input);
    }, selectedEntryId);
  };

  const handleDeleteTrail = async (trailId: string) => {
    const remainingTrailId = data.trails.find((trail) => trail.id !== trailId)?.id ?? null;
    await runMutation(async () => {
      await lexiconRepository.deleteTrail(trailId);
    }, selectedEntryId);
    setSelectedTrailId(remainingTrailId);
  };

  const handleCreateTrailItem = async (input: TrailItemInput) => {
    await runMutation(async () => {
      await lexiconRepository.createTrailItem(input);
    }, selectedEntryId);
  };

  const handleUpdateTrailItem = async (trailItemId: string, input: TrailItemInput) => {
    await runMutation(async () => {
      await lexiconRepository.updateTrailItem(trailItemId, input);
    }, selectedEntryId);
  };

  const handleDeleteTrailItem = async (trailItemId: string) => {
    await runMutation(async () => {
      await lexiconRepository.deleteTrailItem(trailItemId);
    }, selectedEntryId);
  };

  const renderCenter = () => {
    if (isLoading) {
      return (
        <div className="loading-panel">
          <span className="book-loader" />
          Loading atlas
        </div>
      );
    }

    if (activeView === "library") {
      return (
        <LibraryList
          entries={data.entries}
          query={query}
          typeFilter={typeFilter}
          categoryFilter={categoryFilter}
          tagFilter={tagFilter}
          onTypeFilterChange={setTypeFilter}
          onCategoryFilterChange={setCategoryFilter}
          onTagFilterChange={setTagFilter}
          onSelectEntry={handleSelectEntry}
          onOpenBook={handleOpenBook}
          onCreateEntry={() => handleCreateEntry("entry")}
          onCreateBook={() => handleCreateEntry("book")}
          onDeleteEntry={handleDeleteEntry}
        />
      );
    }

    if (activeView === "map") {
      return (
        <MapView
          entries={data.entries}
          relations={data.relations}
          query={query}
          onSelectEntry={handleSelectEntry}
        />
      );
    }

    if (activeView === "timeline") {
      return (
        <TimelineView
          entries={data.entries}
          query={query}
          onSelectEntry={handleSelectEntry}
        />
      );
    }

    if (activeView === "trails") {
      return (
        <TrailsView
          entries={data.entries}
          trails={data.trails}
          trailItems={data.trailItems}
          selectedTrailId={selectedTrailId}
          onSelectTrail={setSelectedTrailId}
          onCreateTrail={handleCreateTrail}
          onUpdateTrail={handleUpdateTrail}
          onDeleteTrail={handleDeleteTrail}
          onCreateTrailItem={handleCreateTrailItem}
          onUpdateTrailItem={handleUpdateTrailItem}
          onDeleteTrailItem={handleDeleteTrailItem}
          onSelectEntry={handleSelectEntry}
        />
      );
    }

    if (activeView === "settings") {
      return <SettingsView />;
    }

    if (openBook) {
      return (
        <MiniBook
          entry={openBook}
          pages={openBookPages}
          contentBlocks={data.contentBlocks}
          onBack={() => setOpenBookId(null)}
          onCreatePage={handleCreatePage}
          onUpdatePage={handleUpdatePage}
          onDeletePage={handleDeletePage}
        />
      );
    }

    return (
      <AtlasBook
        entries={atlasEntries}
        selectedEntry={selectedEntry}
        selectedEntryBlocks={selectedEntryBlocks}
        activeLetter={activeLetter}
        isEditing={selectedEntry?.id === editingEntryId}
        onLetterChange={setActiveLetter}
        onSelectEntry={handleSelectEntry}
        onOpenBook={handleOpenBook}
        onStartEdit={() => selectedEntry && setEditingEntryId(selectedEntry.id)}
        onCancelEdit={() => setEditingEntryId(null)}
        onSaveEntry={handleSaveEntry}
        onDeleteEntry={handleDeleteEntry}
      />
    );
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onChangeView={(view) => {
          setActiveView(view);
          if (view !== "atlas") {
            setOpenBookId(null);
            setEditingEntryId(null);
          }
        }}
      />

      <main className="workspace">
        <TopBar
          query={query}
          onQueryChange={setQuery}
          onCreateEntry={() => handleCreateEntry("entry")}
          onCreateBook={() => handleCreateEntry("book")}
        />

        {error ? (
          <div className="error-banner">
            <AlertTriangle size={16} />
            {error}
          </div>
        ) : null}

        <div className={activeView === "settings" ? "workspace-grid workspace-grid--no-context" : "workspace-grid"}>
          <div className="workspace-main">{renderCenter()}</div>
          {activeView !== "settings" ? (
            <RightContextPanel
              selectedEntry={selectedEntry}
              entries={data.entries}
              bookPages={data.bookPages}
              relations={data.relations}
              knowledgeGaps={data.knowledgeGaps}
              contentBlocks={data.contentBlocks}
              autoRelationRequest={autoRelationRequest}
              onCreateEntryCandidate={handleCreateEntryCandidate}
              onAddRelation={handleAddRelation}
              onUpdateRelation={handleUpdateRelation}
              onDeleteRelation={handleDeleteRelation}
              onAddKnowledgeGap={handleAddKnowledgeGap}
              onUpdateKnowledgeGap={handleUpdateKnowledgeGap}
              onDeleteKnowledgeGap={handleDeleteKnowledgeGap}
              onSelectEntry={handleSelectEntry}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong";
}
