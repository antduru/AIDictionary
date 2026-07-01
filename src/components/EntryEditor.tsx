import { useMemo, useState } from "react";
import type { ContentBlock, ContentBlockInput, Entry, EntryInput, EntryType } from "../types";
import { BlockEditor } from "./BlockEditor";
import { blocksToInputs, projectBlocksToContent } from "../utils/blocks";

interface EntryEditorProps {
  entry: Entry;
  blocks: ContentBlock[];
  onSave: (input: EntryInput, blocks: ContentBlockInput[]) => Promise<void>;
  onCancel: () => void;
}

export function EntryEditor({ entry, blocks, onSave, onCancel }: EntryEditorProps) {
  const [title, setTitle] = useState(entry.title);
  const [entryType, setEntryType] = useState<EntryType>(entry.entryType);
  const [category, setCategory] = useState(entry.category);
  const [tags, setTags] = useState(entry.tags.join(", "));
  const [timelineDate, setTimelineDate] = useState(entry.timelineDate);
  const [timelineNote, setTimelineNote] = useState(entry.timelineNote);
  const [draftBlocks, setDraftBlocks] = useState<ContentBlockInput[]>(() =>
    blocksToInputs(blocks, entry.content),
  );
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
      const projectedContent = projectBlocksToContent(draftBlocks);
      await onSave({
        title: title.trim() || "Untitled",
        entryType,
        content: projectedContent,
        category: category.trim(),
        tags: normalizedTags,
        timelineDate: timelineDate.trim(),
        timelineNote: timelineNote.trim(),
      }, draftBlocks);
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

        <label className="field">
          <span>Timeline Date</span>
          <input
            value={timelineDate}
            onChange={(event) => setTimelineDate(event.target.value)}
            placeholder="2021, 1600, modern ML"
          />
        </label>

        <label className="field">
          <span>Timeline Note</span>
          <input
            value={timelineNote}
            onChange={(event) => setTimelineNote(event.target.value)}
            placeholder="Optional context"
          />
        </label>
      </div>

      <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />

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
