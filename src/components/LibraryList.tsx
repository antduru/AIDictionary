import { BookMarked, FileText, Trash2 } from "lucide-react";
import { entryTypeLabels, entryTypeOptions } from "../types";
import type { Entry, EntryType } from "../types";
import { matchesQuery, uniqueSorted } from "../utils/filters";

interface LibraryListProps {
  entries: Entry[];
  query: string;
  typeFilter: "all" | EntryType;
  categoryFilter: string;
  tagFilter: string;
  onTypeFilterChange: (value: "all" | EntryType) => void;
  onCategoryFilterChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onSelectEntry: (entryId: string) => void;
  onOpenBook: (entryId: string) => void;
  onCreateEntry: () => void;
  onCreateBook: () => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
}

export function LibraryList({
  entries,
  query,
  typeFilter,
  categoryFilter,
  tagFilter,
  onTypeFilterChange,
  onCategoryFilterChange,
  onTagFilterChange,
  onSelectEntry,
  onOpenBook,
  onCreateEntry,
  onCreateBook,
  onDeleteEntry,
}: LibraryListProps) {
  const categories = uniqueSorted(entries.map((entry) => entry.category));
  const tags = uniqueSorted(entries.flatMap((entry) => entry.tags));
  const filteredEntries = entries.filter((entry) => {
    return (
      matchesQuery(entry, query) &&
      (typeFilter === "all" || entry.entryType === typeFilter) &&
      (!categoryFilter || entry.category === categoryFilter) &&
      (!tagFilter || entry.tags.includes(tagFilter))
    );
  });

  return (
    <section className="library-view">
      <div className="view-header">
        <div>
          <span>Library</span>
          <h1>Atlas Items</h1>
        </div>
        <div className="topbar-actions">
          <button className="button button--subtle" type="button" onClick={onCreateEntry}>
            <FileText size={17} />
            New Entry
          </button>
          <button className="button button--primary" type="button" onClick={onCreateBook}>
            <BookMarked size={17} />
            New Book
          </button>
        </div>
      </div>

      <div className="filter-strip">
        <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value as "all" | EntryType)}>
          <option value="all">All types</option>
          {entryTypeOptions.map((type) => (
            <option value={type} key={type}>
              {entryTypeLabels[type]}
            </option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(event) => onCategoryFilterChange(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
        <select value={tagFilter} onChange={(event) => onTagFilterChange(event.target.value)}>
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option value={tag} key={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="library-grid">
        {filteredEntries.length === 0 ? (
          <div className="empty-panel">
            <h2>No entries found</h2>
            <p>Adjust the search or filters, or create a new atlas page.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <article className="library-card" key={entry.id}>
              <div className="library-card-main">
                <span className="type-chip">{entry.entryType}</span>
                <h2>{entry.title}</h2>
                <p>{entry.category || "Uncategorized"}</p>
                <div className="tag-row">
                  {entry.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="library-card-actions">
                <button className="button button--subtle" type="button" onClick={() => onSelectEntry(entry.id)}>
                  Open
                </button>
                {entry.entryType === "book" ? (
                  <button className="button button--subtle" type="button" onClick={() => onOpenBook(entry.id)}>
                    Mini-book
                  </button>
                ) : null}
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
