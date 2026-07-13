import { useState } from "react";
import { BookOpen, Edit3, Sparkles, Trash2 } from "lucide-react";
import type { ContentBlock, ContentBlockInput, Entry, EntryInput } from "../types";
import { EntryEditor } from "./EntryEditor";
import { BlockRenderer } from "./BlockRenderer";
import { AIDraftPanel } from "./AIDraftPanel";
import { appendBlockInputs, blocksToInputs, contentFromBlocks, markdownToBlockInputs, projectBlocksToContent } from "../utils/blocks";
import { getConfiguredAIProvider, getAISettingsForAction } from "../services/ai/aiProvider";
import { atlasDraftSystemPrompt, draftEntryPrompt, summarizePrompt, summarizeSystemPrompt } from "../services/ai/prompts";
import { cleanModelText } from "../services/ai/parsing";

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
  const [aiDraft, setAIDraft] = useState("");
  const [aiDraftKind, setAIDraftKind] = useState<"draft" | "summary">("draft");
  const [aiError, setAIError] = useState<string | null>(null);
  const [isRunningAI, setIsRunningAI] = useState(false);

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

  const entryContent = contentFromBlocks(blocks, entry.content);
  const isEmptyEntry = !entryContent.trim();

  const runGenerateDraft = async () => {
    setAIDraftKind("draft");
    setAIDraft("");
    setAIError(null);
    setIsRunningAI(true);
    try {
      const settings = getAISettingsForAction();
      const result = await getConfiguredAIProvider().generateText({
        systemPrompt: atlasDraftSystemPrompt,
        userPrompt: draftEntryPrompt({ title: entry.title, category: entry.category, tags: entry.tags }),
        model: settings.modelName,
        temperature: settings.temperature,
      });
      setAIDraft(cleanModelText(result.text));
    } catch (error) {
      setAIError(errorMessage(error));
    } finally {
      setIsRunningAI(false);
    }
  };

  const runSummarize = async () => {
    setAIDraftKind("summary");
    setAIDraft("");
    setAIError(null);
    setIsRunningAI(true);
    try {
      const settings = getAISettingsForAction();
      const result = await getConfiguredAIProvider().generateText({
        systemPrompt: summarizeSystemPrompt,
        userPrompt: summarizePrompt({ title: entry.title, content: entryContent }),
        model: settings.modelName,
        temperature: settings.temperature,
      });
      setAIDraft(cleanModelText(result.text));
    } catch (error) {
      setAIError(errorMessage(error));
    } finally {
      setIsRunningAI(false);
    }
  };

  const saveDraft = async () => {
    const existing = blocksToInputs(blocks, entry.content);
    const nextBlocks = aiDraftKind === "summary"
      ? appendBlockInputs(existing, [{ blockType: "callout", content: aiDraft, metadata: '{ "variant": "summary" }', blockOrder: existing.length + 1 }])
      : appendBlockInputs(existing, markdownToBlockInputs(aiDraft));
    await onSave({
      title: entry.title,
      entryType: entry.entryType,
      content: projectBlocksToContent(nextBlocks),
      category: entry.category,
      tags: entry.tags,
      timelineDate: entry.timelineDate,
      timelineNote: entry.timelineNote,
    }, nextBlocks);
    setAIDraft("");
    setAIError(null);
  };

  return (
    <article className="entry-page">
      <div className="entry-page-header">
        <div>
          <span className="type-chip">{entry.entryType}</span>
          <h1>{entry.title}</h1>
        </div>
        <div className="icon-actions">
          {isEmptyEntry ? (
            <button className="icon-button" type="button" onClick={runGenerateDraft} title="Generate draft">
              <Sparkles size={17} />
            </button>
          ) : null}
          <button className="icon-button" type="button" onClick={runSummarize} title="Summarize">
            <Sparkles size={17} />
          </button>
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

      <div className="entry-toolbar-actions">
        {isEmptyEntry ? (
          <button className="button button--subtle" type="button" onClick={runGenerateDraft} disabled={isRunningAI}>
            <Sparkles size={16} />
            Generate Draft
          </button>
        ) : null}
        <button className="button button--subtle" type="button" onClick={runSummarize} disabled={isRunningAI}>
          <Sparkles size={16} />
          {isRunningAI && aiDraftKind === "summary" ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      <AIDraftPanel
        title={aiDraftKind === "summary" ? "Summary draft" : "Entry draft"}
        text={aiDraft}
        error={aiError}
        isLoading={isRunningAI}
        primaryActionLabel={aiDraftKind === "summary" ? "Insert as Callout" : "Insert as Blocks"}
        onPrimaryAction={saveDraft}
        onRetry={aiDraftKind === "summary" ? runSummarize : runGenerateDraft}
        onDiscard={() => {
          setAIDraft("");
          setAIError(null);
        }}
      />

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

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong.";
}
