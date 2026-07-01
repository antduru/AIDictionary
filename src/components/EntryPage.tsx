import ReactMarkdown from "react-markdown";
import { BookOpen, Edit3, Trash2 } from "lucide-react";
import type { Entry, EntryInput } from "../types";
import { EntryEditor } from "./EntryEditor";

interface EntryPageProps {
  entry: Entry | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (input: EntryInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onOpenBook: () => void;
}

export function EntryPage({
  entry,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onOpenBook,
}: EntryPageProps) {
  if (!entry) {
    return (
      <div className="empty-page">
        <span className="empty-kicker">Main atlas</span>
        <h2>Start your atlas</h2>
        <p>Create an entry or open one from the index. Simple ideas become pages; larger ideas can become nested books.</p>
      </div>
    );
  }

  if (isEditing) {
    return <EntryEditor entry={entry} onSave={onSave} onCancel={onCancelEdit} />;
  }

  return (
    <article className="entry-page">
      <div className="entry-page-header">
        <div>
          <span className="type-chip">{entry.entryType}</span>
          <h1>{entry.title}</h1>
        </div>
        <div className="icon-actions">
          {entry.entryType === "book" ? (
            <button className="icon-button" type="button" onClick={onOpenBook} title="Open mini-book">
              <BookOpen size={18} />
            </button>
          ) : null}
          <button className="icon-button" type="button" onClick={onStartEdit} title="Edit entry">
            <Edit3 size={17} />
          </button>
          <button className="icon-button icon-button--danger" type="button" onClick={onDelete} title="Delete entry">
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="entry-meta-line">
        {entry.category ? <span>{entry.category}</span> : <span>Uncategorized</span>}
        {entry.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      {entry.entryType === "book" ? (
        <button className="book-cover-callout" type="button" onClick={onOpenBook}>
          <BookOpen size={18} />
          Open nested mini-book
        </button>
      ) : null}

      <div className="markdown-body">
        {entry.content.trim() ? (
          <ReactMarkdown>{entry.content}</ReactMarkdown>
        ) : (
          <p className="muted">No notes yet. Switch to edit mode to add flexible Markdown content.</p>
        )}
      </div>
    </article>
  );
}
