import type { BlockType, ContentBlock, ContentBlockInput } from "../types";

export const blockTypes: BlockType[] = [
  "heading",
  "text",
  "markdown",
  "callout",
  "link",
  "image",
  "table",
  "code",
  "divider",
  "checklist",
];

export const blockTypeLabels: Record<BlockType, string> = {
  heading: "Heading",
  text: "Text",
  markdown: "Markdown",
  callout: "Callout",
  link: "Link",
  image: "Image",
  table: "Table",
  code: "Code",
  divider: "Divider",
  checklist: "Checklist",
};

export const relationTypeSuggestions = [
  "related to",
  "depends on",
  "contrasts with",
  "example of",
  "part of",
  "causes",
  "solves",
  "used in",
  "confused with",
  "supports",
  "criticizes",
  "appears in",
  "influenced by",
  "uses",
  "enables",
  "evaluated on",
  "explores",
  "contains",
];

export function ownerBlocks(blocks: ContentBlock[], ownerType: "entry" | "book_page", ownerId: string) {
  return blocks
    .filter((block) => block.ownerType === ownerType && block.ownerId === ownerId)
    .sort((a, b) => a.blockOrder - b.blockOrder);
}

export function blocksToInputs(blocks: ContentBlock[], legacyContent: string): ContentBlockInput[] {
  if (blocks.length > 0) {
    return blocks.map((block, index) => ({
      blockType: block.blockType,
      content: block.content,
      metadata: normalizeMetadata(block.metadata),
      blockOrder: index + 1,
    }));
  }

  if (legacyContent.trim()) {
    return [
      {
        blockType: "markdown",
        content: legacyContent,
        metadata: "{}",
        blockOrder: 1,
      },
    ];
  }

  return [newBlockInput(1)];
}

export function normalizeBlockInputs(blocks: ContentBlockInput[]) {
  return blocks.map((block, index) => ({
    blockType: block.blockType,
    content: block.content,
    metadata: normalizeMetadata(block.metadata),
    blockOrder: index + 1,
  }));
}

export function projectBlocksToContent(blocks: ContentBlockInput[]) {
  return normalizeBlockInputs(blocks)
    .filter((block) => block.blockType !== "divider")
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function newBlockInput(blockOrder: number, blockType: BlockType = "text"): ContentBlockInput {
  return {
    blockType,
    content: "",
    metadata: "{}",
    blockOrder,
  };
}

export function normalizeMetadata(value: string) {
  if (!value.trim()) {
    return "{}";
  }
  try {
    JSON.parse(value);
    return value;
  } catch {
    return "{}";
  }
}

export function parseMetadata<T extends Record<string, unknown>>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value) as T;
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}
