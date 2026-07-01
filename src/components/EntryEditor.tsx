import { useMemo, useState } from "react";
import type { Entry, EntryInput, EntryType } from "../types";

interface EntryEditorProps {
  entry: Entry;
  onSave: (input: EntryInput) => Promise<void>;
  onCancel: () => void;
}

export function EntryEditor({ entry, onSave, onCancel }: EntryEditorProps) {
  const [title, setTitle] = useState(entry.title);
  const [entryType, setEntryType] = useState<EntryType>(entry.entryType);
  const [category, setCategory] = useState(entry.category);
  const [tags, setTags] = useState(entry.tags.join(", "));
  const [content, setContent] = useState(entry.content);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        title: title.trim() || "Untitled",
        entryType,
        content,
        category: category.trim(),
        tags: normalizedTags,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="entry-editor" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field field--wide">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span>Type</span>
          <select
            value={entryType}
            onChange={(event) => setEntryType(event.target.value as EntryType)}
          >
            <option value="entry">Entry</option>
            <option value="book">Book</option>
          </select>
        </label>

        <label className="field">
          <span>Category</span>
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>

        <label className="field field--wide">
          <span>Tags</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="comma, separated, tags"
          />
        </label>
      </div>

      <label className="field markdown-field">
        <span>Markdown</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write flexible notes, sections, links, questions, and relationships."
        />
      </label>

      <div className="editor-actions">
        <button className="button button--primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button className="button button--subtle" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
