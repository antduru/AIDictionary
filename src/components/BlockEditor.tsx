import { Copy, Plus, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import type { BlockType, ContentBlockInput } from "../types";
import { blockTypeLabels, blockTypes, newBlockInput, normalizeBlockInputs } from "../utils/blocks";

interface BlockEditorProps {
  blocks: ContentBlockInput[];
  onChange: (blocks: ContentBlockInput[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const normalizedBlocks = normalizeBlockInputs(blocks);

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
        <div className="block-editor-card" key={`${index}-${block.blockOrder}`}>
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
              aria-label={`${block.blockType} metadata JSON`}
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
