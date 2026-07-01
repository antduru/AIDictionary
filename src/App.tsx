import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AtlasBook } from "./components/AtlasBook";
import { LibraryList } from "./components/LibraryList";
import { MapView } from "./components/MapView";
import { MiniBook } from "./components/MiniBook";
import { RightContextPanel } from "./components/RightContextPanel";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { lexiconRepository } from "./services/lexiconRepository";
import type {
  AppData,
  AppView,
  BookPageInput,
  EntryInput,
  EntryType,
  KnowledgeGapInput,
  RelationInput,
} from "./types";
import { matchesLetter, matchesQuery } from "./utils/filters";

const emptyData: AppData = {
  entries: [],
  bookPages: [],
  relations: [],
  knowledgeGaps: [],
};

export default function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [activeView, setActiveView] = useState<AppView>("atlas");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState("All");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | EntryType>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const atlasEntries = useMemo(
    () =>
      data.entries.filter((entry) => matchesQuery(entry, query) && matchesLetter(entry, activeLetter)),
    [activeLetter, data.entries, query],
  );

  const loadData = useCallback(async (nextSelectedId?: string | null) => {
    const loaded = await lexiconRepository.loadAppData();
    setData(loaded);
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

  const handleSaveEntry = async (entryId: string, input: EntryInput) => {
    await runMutation(async () => {
      await lexiconRepository.updateEntry(entryId, input);
    }, entryId);
    setEditingEntryId(null);
    setOpenBookId((current) => (input.entryType === "book" ? current : null));
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

  const handleUpdatePage = async (pageId: string, input: BookPageInput) => {
    await runMutation(async () => {
      await lexiconRepository.updateBookPage(pageId, input);
    }, input.entryId);
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

    if (activeView === "settings") {
      return <SettingsView />;
    }

    if (openBook) {
      return (
        <MiniBook
          entry={openBook}
          pages={openBookPages}
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
              relations={data.relations}
              knowledgeGaps={data.knowledgeGaps}
              onAddRelation={handleAddRelation}
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
