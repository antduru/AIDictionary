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


export function markdownToBlockInputs(markdown: string): ContentBlockInput[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlockInput[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      blocks.push({
        blockType: "markdown",
        content,
        metadata: "{}",
        blockOrder: blocks.length + 1,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flushBuffer();
      blocks.push({
        blockType: "heading",
        content: heading[2].trim(),
        metadata: "{}",
        blockOrder: blocks.length + 1,
      });
      continue;
    }
    buffer.push(line);
  }

  flushBuffer();
  return blocks.length ? normalizeBlockInputs(blocks) : [newBlockInput(1, "markdown")];
}

export function appendBlockInputs(existing: ContentBlockInput[], additions: ContentBlockInput[]) {
  const normalizedExisting = normalizeBlockInputs(existing);
  const hasOnlyEmptyStarter = normalizedExisting.length === 1 && !normalizedExisting[0].content.trim();
  const base = hasOnlyEmptyStarter ? [] : normalizedExisting;
  return normalizeBlockInputs([...base, ...additions]);
}

export function contentFromBlocks(blocks: ContentBlockInput[] | ContentBlock[], fallback = "") {
  const text = [...blocks]
    .sort((a, b) => a.blockOrder - b.blockOrder)
    .filter((block) => block.blockType !== "divider")
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join("\n\n");
  return text || fallback;
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
