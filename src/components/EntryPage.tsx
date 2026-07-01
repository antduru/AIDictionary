import { BookOpen, Edit3, Trash2 } from "lucide-react";
import type { ContentBlock, ContentBlockInput, Entry, EntryInput } from "../types";
import { EntryEditor } from "./EntryEditor";
import { BlockRenderer } from "./BlockRenderer";

interface EntryPageProps {
  entry: Entry | null;
  blocks: ContentBlock[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (input: EntryInput, blocks: ContentBlockInput[]) => Promise<void>;
  onDelete: () => Promise<void>;
  onOpenBook: () => void;
}

export function EntryPage({
  entry,
  blocks,
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
    return <EntryEditor entry={entry} blocks={blocks} onSave={onSave} onCancel={onCancelEdit} />;
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
        {entry.timelineDate ? <span className="timeline-chip">{entry.timelineDate}</span> : null}
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

      <BlockRenderer blocks={blocks} legacyContent={entry.content} />
    </article>
  );
}
