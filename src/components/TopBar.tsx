import { BookMarked, FilePlus, Search } from "lucide-react";

interface TopBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onCreateEntry: () => void;
  onCreateBook: () => void;
}

export function TopBar({ query, onQueryChange, onCreateEntry, onCreateBook }: TopBarProps) {
  return (
    <header className="topbar">
      <label className="search-box">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search title, content, tags"
        />
      </label>

      <div className="topbar-actions">
        <button className="button button--subtle" type="button" onClick={onCreateEntry}>
          <FilePlus size={17} />
          New Entry
        </button>
        <button className="button button--primary" type="button" onClick={onCreateBook}>
          <BookMarked size={17} />
          New Book
        </button>
      </div>
    </header>
  );
}
