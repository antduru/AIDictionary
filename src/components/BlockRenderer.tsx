import ReactMarkdown from "react-markdown";
import type { ContentBlock } from "../types";
import { parseMetadata } from "../utils/blocks";

interface BlockRendererProps {
  blocks: ContentBlock[];
  legacyContent?: string;
}

export function BlockRenderer({ blocks, legacyContent = "" }: BlockRendererProps) {
  const renderBlocks = blocks.length
    ? [...blocks].sort((a, b) => a.blockOrder - b.blockOrder)
    : legacyContent.trim()
      ? [
          {
            id: "legacy",
            ownerType: "entry" as const,
            ownerId: "legacy",
            blockType: "markdown" as const,
            content: legacyContent,
            metadata: "{}",
            blockOrder: 1,
            createdAt: "",
            updatedAt: "",
          },
        ]
      : [];

  if (renderBlocks.length === 0) {
    return <p className="muted">No blocks yet. Switch to edit mode to shape this page.</p>;
  }

  return (
    <div className="block-renderer">
      {renderBlocks.map((block) => {
        if (block.blockType === "heading") {
          return <h2 key={block.id} className="content-heading">{block.content || "Untitled heading"}</h2>;
        }

        if (block.blockType === "text") {
          return <p key={block.id} className="content-text">{block.content}</p>;
        }

        if (block.blockType === "markdown") {
          return (
            <div className="markdown-body" key={block.id}>
              <ReactMarkdown>{block.content}</ReactMarkdown>
            </div>
          );
        }

        if (block.blockType === "callout") {
          const metadata = parseMetadata(block.metadata, { variant: "note" });
          return (
            <aside className={`callout-block callout-block--${metadata.variant ?? "note"}`} key={block.id}>
              <strong>{String(metadata.variant ?? "note")}</strong>
              <ReactMarkdown>{block.content}</ReactMarkdown>
            </aside>
          );
        }

        if (block.blockType === "link") {
          const metadata = parseMetadata(block.metadata, { url: "", title: "" });
          const url = String(metadata.url || block.content);
          const title = String(metadata.title || block.content || url);
          return (
            <a className="link-block" href={url} target="_blank" rel="noreferrer" key={block.id}>
              <strong>{title}</strong>
              <span>{url}</span>
            </a>
          );
        }

        if (block.blockType === "image") {
          const metadata = parseMetadata(block.metadata, { src: "", caption: "" });
          const src = String(metadata.src || block.content);
          const caption = String(metadata.caption || "");
          return (
            <figure className="image-block" key={block.id}>
              {src ? <img src={src} alt={caption || "Atlas image"} /> : <div className="image-placeholder">Image URL or path missing</div>}
              {caption ? <figcaption>{caption}</figcaption> : null}
            </figure>
          );
        }

        if (block.blockType === "table") {
          return <SimpleTable key={block.id} content={block.content} />;
        }

        if (block.blockType === "code") {
          const metadata = parseMetadata(block.metadata, { language: "" });
          return (
            <pre className="code-block" key={block.id}>
              <code data-language={String(metadata.language || "")}>{block.content}</code>
            </pre>
          );
        }

        if (block.blockType === "divider") {
          return <hr className="content-divider" key={block.id} />;
        }

        if (block.blockType === "checklist") {
          const lines = block.content.split("\n").filter(Boolean);
          return (
            <ul className="checklist-renderer" key={block.id}>
              {lines.map((line, index) => {
                const checked = /^\s*\[(x|X)\]/.test(line);
                const text = line.replace(/^\s*\[(x|X| )\]\s*/, "");
                return (
                  <li key={`${block.id}-${index}`}>
                    <input type="checkbox" checked={checked} readOnly />
                    <span>{text}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return null;
      })}
    </div>
  );
}

function SimpleTable({ content }: { content: string }) {
  const rows = content
    .split("\n")
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  if (!rows.length) {
    return <p className="muted">Empty table block.</p>;
  }

  const [head, ...body] = rows;
  return (
    <table className="table-block">
      <thead>
        <tr>
          {head.map((cell, index) => (
            <th key={index}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
