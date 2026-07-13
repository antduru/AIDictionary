import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { ContentBlock, ContentBlockInput, Entry, EntryInput, EntryType } from "../types";
import { BlockEditor } from "./BlockEditor";
import { AIDraftPanel } from "./AIDraftPanel";
import { appendBlockInputs, blocksToInputs, markdownToBlockInputs, projectBlocksToContent } from "../utils/blocks";
import { getConfiguredAIProvider, getAISettingsForAction } from "../services/ai/aiProvider";
import { atlasDraftSystemPrompt, draftEntryPrompt } from "../services/ai/prompts";
import { cleanModelText } from "../services/ai/parsing";

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
  const [aiInstruction, setAIInstruction] = useState("");
  const [aiDraft, setAIDraft] = useState("");
  const [aiError, setAIError] = useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags],
  );

  const handleGenerateDraft = async () => {
    setAIError(null);
    setIsGeneratingDraft(true);
    try {
      const settings = getAISettingsForAction();
      const result = await getConfiguredAIProvider().generateText({
        systemPrompt: atlasDraftSystemPrompt,
        userPrompt: draftEntryPrompt({
          title,
          category,
          tags: normalizedTags,
          instruction: aiInstruction,
        }),
        model: settings.modelName,
        temperature: settings.temperature,
      });
      setAIDraft(cleanModelText(result.text));
    } catch (error) {
      setAIError(errorMessage(error));
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const insertDraft = () => {
    setDraftBlocks(appendBlockInputs(draftBlocks, markdownToBlockInputs(aiDraft)));
    setAIDraft("");
    setAIError(null);
  };

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

      <div className="ai-inline-tool">
        <label className="field">
          <span>AI draft instruction</span>
          <textarea
            value={aiInstruction}
            onChange={(event) => setAIInstruction(event.target.value)}
            placeholder="Optional angle, audience, or notes to include"
          />
        </label>
        <button className="button button--subtle" type="button" onClick={handleGenerateDraft} disabled={isGeneratingDraft}>
          <Sparkles size={16} />
          {isGeneratingDraft ? "Generating..." : "Generate Draft"}
        </button>
        <AIDraftPanel
          title="AI draft"
          text={aiDraft}
          error={aiError}
          isLoading={isGeneratingDraft}
          primaryActionLabel="Insert as Blocks"
          onPrimaryAction={insertDraft}
          onRetry={handleGenerateDraft}
          onDiscard={() => {
            setAIDraft("");
            setAIError(null);
          }}
        />
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

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong.";
}
