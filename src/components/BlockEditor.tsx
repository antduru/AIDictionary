import { useState } from "react";
import { Copy, Plus, Trash2, ArrowDown, ArrowUp, Wand2 } from "lucide-react";
import type { BlockType, ContentBlockInput } from "../types";
import { blockTypeLabels, blockTypes, newBlockInput, normalizeBlockInputs } from "../utils/blocks";
import { AIDraftPanel } from "./AIDraftPanel";
import { getConfiguredAIProvider, getAISettingsForAction } from "../services/ai/aiProvider";
import { rewritePrompt, rewriteSystemPrompt } from "../services/ai/prompts";
import { cleanModelText } from "../services/ai/parsing";

interface BlockEditorProps {
  blocks: ContentBlockInput[];
  onChange: (blocks: ContentBlockInput[]) => void;
}

type RewriteMode = "Make clearer" | "Make shorter" | "Make more formal" | "Explain more simply";

const rewriteModes: RewriteMode[] = [
  "Make clearer",
  "Make shorter",
  "Make more formal",
  "Explain more simply",
];

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const normalizedBlocks = normalizeBlockInputs(blocks);
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>("Make clearer");
  const [rewriteIndex, setRewriteIndex] = useState<number | null>(null);
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);

  const updateBlock = (index: number, updates: Partial<ContentBlockInput>) => {
    onChange(
      normalizeBlockInputs(
        normalizedBlocks.map((block, candidateIndex) =>
          candidateIndex === index ? { ...block, ...updates } : block,
        ),
      ),
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= normalizedBlocks.length) {
      return;
    }
    const next = [...normalizedBlocks];
    const [block] = next.splice(index, 1);
    next.splice(nextIndex, 0, block);
    onChange(normalizeBlockInputs(next));
  };

  const duplicateBlock = (index: number) => {
    const next = [...normalizedBlocks];
    next.splice(index + 1, 0, { ...normalizedBlocks[index] });
    onChange(normalizeBlockInputs(next));
  };

  const deleteBlock = (index: number) => {
    const next = normalizedBlocks.filter((_, candidateIndex) => candidateIndex !== index);
    onChange(next.length ? normalizeBlockInputs(next) : [newBlockInput(1)]);
  };

  const addBlock = () => {
    onChange([...normalizedBlocks, newBlockInput(normalizedBlocks.length + 1)]);
  };

  const runRewrite = async (index: number) => {
    const block = normalizedBlocks[index];
    if (!block?.content.trim()) {
      setRewriteIndex(index);
      setRewriteText("");
      setRewriteError("This block is empty.");
      return;
    }

    setRewriteIndex(index);
    setRewriteText("");
    setRewriteError(null);
    setIsRewriting(true);
    try {
      const settings = getAISettingsForAction();
      const result = await getConfiguredAIProvider().generateText({
        systemPrompt: rewriteSystemPrompt,
        userPrompt: rewritePrompt({ content: block.content, mode: rewriteMode }),
        model: settings.modelName,
        temperature: settings.temperature,
      });
      setRewriteText(cleanModelText(result.text));
    } catch (error) {
      setRewriteError(errorMessage(error));
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="block-editor">
      <div className="block-editor-heading">
        <span>Blocks</span>
        <button className="button button--subtle" type="button" onClick={addBlock}>
          <Plus size={16} />
          Add Block
        </button>
      </div>

      {normalizedBlocks.map((block, index) => (
        <div className="block-editor-card" key={String(index) + "-" + block.blockOrder}>
          <div className="block-editor-toolbar">
            <select
              value={block.blockType}
              onChange={(event) =>
                updateBlock(index, { blockType: event.target.value as BlockType })
              }
            >
              {blockTypes.map((type) => (
                <option value={type} key={type}>
                  {blockTypeLabels[type]}
                </option>
              ))}
            </select>

            <div className="block-editor-actions">
              <button className="mini-icon-button" type="button" onClick={() => moveBlock(index, -1)} title="Move up">
                <ArrowUp size={14} />
              </button>
              <button className="mini-icon-button" type="button" onClick={() => moveBlock(index, 1)} title="Move down">
                <ArrowDown size={14} />
              </button>
              <button className="mini-icon-button" type="button" onClick={() => duplicateBlock(index)} title="Duplicate">
                <Copy size={14} />
              </button>
              <button className="mini-icon-button" type="button" onClick={() => deleteBlock(index)} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {block.blockType === "divider" ? (
            <div className="divider-preview" />
          ) : (
            <textarea
              value={block.content}
              onChange={(event) => updateBlock(index, { content: event.target.value })}
              placeholder={placeholderFor(block.blockType)}
            />
          )}

          {needsMetadata(block.blockType) ? (
            <input
              value={block.metadata}
              onChange={(event) => updateBlock(index, { metadata: event.target.value })}
              placeholder={metadataPlaceholder(block.blockType)}
              aria-label={block.blockType + " metadata JSON"}
            />
          ) : null}

          {block.blockType !== "divider" ? (
            <div className="ai-rewrite-row">
              <select value={rewriteMode} onChange={(event) => setRewriteMode(event.target.value as RewriteMode)}>
                {rewriteModes.map((mode) => (
                  <option value={mode} key={mode}>{mode}</option>
                ))}
              </select>
              <button className="button button--subtle" type="button" onClick={() => runRewrite(index)} disabled={isRewriting && rewriteIndex === index}>
                <Wand2 size={15} />
                {isRewriting && rewriteIndex === index ? "Rewriting..." : "AI Rewrite"}
              </button>
            </div>
          ) : null}

          {rewriteIndex === index ? (
            <AIDraftPanel
              title="Rewrite draft"
              text={rewriteText}
              error={rewriteError}
              isLoading={isRewriting}
              primaryActionLabel="Replace Block"
              onPrimaryAction={() => {
                updateBlock(index, { content: rewriteText });
                setRewriteIndex(null);
                setRewriteText("");
                setRewriteError(null);
              }}
              onRetry={() => runRewrite(index)}
              onDiscard={() => {
                setRewriteIndex(null);
                setRewriteText("");
                setRewriteError(null);
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function placeholderFor(type: BlockType) {
  if (type === "heading") return "Heading text";
  if (type === "link") return "URL or short link note";
  if (type === "image") return "Image URL or local path";
  if (type === "table") return "Column A | Column B\nValue 1 | Value 2";
  if (type === "code") return "Paste code here";
  if (type === "checklist") return "[ ] First item\n[x] Completed item";
  if (type === "callout") return "Callout note";
  return "Write freely";
}

function needsMetadata(type: BlockType) {
  return ["callout", "link", "image", "code"].includes(type);
}

function metadataPlaceholder(type: BlockType) {
  if (type === "callout") return '{ "variant": "note" }';
  if (type === "link") return '{ "url": "https://...", "title": "Readable title" }';
  if (type === "image") return '{ "src": "https://...", "caption": "Caption" }';
  if (type === "code") return '{ "language": "ts" }';
  return "{}";
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
