import type { Entry, EntryInput } from "../types";
import { getEntryLetter } from "../utils/filters";
import { AlphabetTabs } from "./AlphabetTabs";
import { EntryPage } from "./EntryPage";

interface AtlasBookProps {
  entries: Entry[];
  selectedEntry: Entry | null;
  activeLetter: string;
  isEditing: boolean;
  onLetterChange: (letter: string) => void;
  onSelectEntry: (entryId: string) => void;
  onOpenBook: (entryId: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEntry: (entryId: string, input: EntryInput) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
}

export function AtlasBook({
  entries,
  selectedEntry,
  activeLetter,
  isEditing,
  onLetterChange,
  onSelectEntry,
  onOpenBook,
  onStartEdit,
  onCancelEdit,
  onSaveEntry,
  onDeleteEntry,
}: AtlasBookProps) {
  const counts = entries.reduce<Record<string, number>>(
    (accumulator, entry) => {
      accumulator.All += 1;
      const letter = getEntryLetter(entry);
      accumulator[letter] = (accumulator[letter] ?? 0) + 1;
      return accumulator;
    },
    { All: 0 },
  );

  return (
    <section className="book-surface atlas-book" aria-label="Atlas view">
      <div className="book-page book-page--left">
        <div className="page-heading">
          <span>Main atlas</span>
          <h2>Entry Index</h2>
        </div>

        <AlphabetTabs activeLetter={activeLetter} counts={counts} onChange={onLetterChange} />

        <div className="entry-index">
          {entries.length === 0 ? (
            <div className="empty-small">No entries match this page divider.</div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={
                  selectedEntry?.id === entry.id
                    ? "entry-index-item entry-index-item--active"
                    : "entry-index-item"
                }
                onClick={() => onSelectEntry(entry.id)}
              >
                <span>
                  <strong>{entry.title}</strong>
                  <small>{entry.category || "Uncategorized"}</small>
                </span>
                <em>{entry.entryType}</em>
              </button>
            ))
          )}
        </div>

        {selectedEntry ? (
          <div className="selected-metadata">
            <span className="metadata-label">Selected</span>
            <strong>{selectedEntry.title}</strong>
            <p>{selectedEntry.entryType === "book" ? "Nested mini-book" : "Atlas page"}</p>
          </div>
        ) : null}
      </div>

      <div className="book-gutter" aria-hidden="true" />

      <div className="book-page book-page--right">
        <EntryPage
          entry={selectedEntry}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSave={(input) => selectedEntry ? onSaveEntry(selectedEntry.id, input) : Promise.resolve()}
          onDelete={() => selectedEntry ? onDeleteEntry(selectedEntry.id) : Promise.resolve()}
          onOpenBook={() => selectedEntry ? onOpenBook(selectedEntry.id) : undefined}
        />
      </div>
    </section>
  );
}
