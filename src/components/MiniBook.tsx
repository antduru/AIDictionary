import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit3, FilePlus2, Save, Trash2 } from "lucide-react";
import type { BookPage, BookPageInput, ContentBlock, ContentBlockInput, Entry } from "../types";
import { BlockEditor } from "./BlockEditor";
import { BlockRenderer } from "./BlockRenderer";
import { blocksToInputs, ownerBlocks, projectBlocksToContent } from "../utils/blocks";

interface MiniBookProps {
  entry: Entry;
  pages: BookPage[];
  contentBlocks: ContentBlock[];
  onBack: () => void;
  onCreatePage: (input: BookPageInput) => Promise<void>;
  onUpdatePage: (pageId: string, input: BookPageInput, blocks: ContentBlockInput[]) => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
}

export function MiniBook({
  entry,
  pages,
  contentBlocks,
  onBack,
  onCreatePage,
  onUpdatePage,
  onDeletePage,
}: MiniBookProps) {
  const orderedPages = useMemo(
    () => [...pages].sort((a, b) => a.pageOrder - b.pageOrder || a.title.localeCompare(b.title)),
    [pages],
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const selectedPage = orderedPages[pageIndex] ?? null;

  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(orderedPages.length - 1, 0)));
  }, [orderedPages.length]);

  useEffect(() => {
    setIsEditingPage(false);
  }, [selectedPage?.id]);

  const handleCreatePage = async () => {
    await onCreatePage({
      entryId: entry.id,
      title: "Untitled Page",
      content: "",
      pageOrder: orderedPages.length + 1,
    });
    setPageIndex(orderedPages.length);
    setIsEditingPage(true);
  };

  return (
    <section className="book-surface mini-book" aria-label={`${entry.title} mini-book`}>
      <div className="mini-book-topline">
        <button className="button button--subtle" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to Main Atlas
        </button>
        <span>Nested mini-book</span>
      </div>

      <div className="book-page book-page--left">
        <div className="page-heading">
          <span>Book entry</span>
          <h2>{entry.title}</h2>
        </div>

        <p className="book-cover-note">{entry.content || "No cover note yet."}</p>

        <div className="page-list">
          {orderedPages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              className={index === pageIndex ? "page-list-item page-list-item--active" : "page-list-item"}
              onClick={() => setPageIndex(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {page.title}
            </button>
          ))}
        </div>

        <button className="button button--primary button--full" type="button" onClick={handleCreatePage}>
          <FilePlus2 size={17} />
          Add Page
        </button>
      </div>

      <div className="book-gutter" aria-hidden="true" />

      <div className="book-page book-page--right">
        {selectedPage ? (
          <MiniBookPage
            page={selectedPage}
            blocks={ownerBlocks(contentBlocks, "book_page", selectedPage.id)}
            isEditing={isEditingPage}
            onEdit={() => setIsEditingPage(true)}
            onCancel={() => setIsEditingPage(false)}
            onSave={async (input, blocks) => {
              await onUpdatePage(selectedPage.id, input, blocks);
              setIsEditingPage(false);
            }}
            onDelete={async () => {
              await onDeletePage(selectedPage.id);
              setIsEditingPage(false);
            }}
          />
        ) : (
          <div className="empty-page">
            <span className="empty-kicker">Mini-book</span>
            <h2>No pages yet</h2>
            <p>Add a page to start shaping this concept as a nested book.</p>
          </div>
        )}
      </div>
    </section>
  );
}

interface MiniBookPageProps {
  page: BookPage;
  blocks: ContentBlock[];
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (input: BookPageInput, blocks: ContentBlockInput[]) => Promise<void>;
  onDelete: () => Promise<void>;
}

function MiniBookPage({ page, blocks, isEditing, onEdit, onCancel, onSave, onDelete }: MiniBookPageProps) {
  const [title, setTitle] = useState(page.title);
  const [draftBlocks, setDraftBlocks] = useState<ContentBlockInput[]>(() =>
    blocksToInputs(blocks, page.content),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(page.title);
    setDraftBlocks(blocksToInputs(blocks, page.content));
  }, [page, blocks]);

  if (isEditing) {
    return (
      <form
        className="entry-editor"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          try {
            const projectedContent = projectBlocksToContent(draftBlocks);
            await onSave({
              entryId: page.entryId,
              title: title.trim() || "Untitled Page",
              content: projectedContent,
              pageOrder: page.pageOrder,
            }, draftBlocks);
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <label className="field">
          <span>Page title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
        <div className="editor-actions">
          <button className="button button--primary" type="submit" disabled={isSaving}>
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Page"}
          </button>
          <button className="button button--subtle" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="entry-page">
      <div className="entry-page-header">
        <div>
          <span className="type-chip">page {page.pageOrder}</span>
          <h1>{page.title}</h1>
        </div>
        <div className="icon-actions">
          <button className="icon-button" type="button" onClick={onEdit} title="Edit page">
            <Edit3 size={17} />
          </button>
          <button className="icon-button icon-button--danger" type="button" onClick={onDelete} title="Delete page">
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <BlockRenderer blocks={blocks} legacyContent={page.content} />
    </article>
  );
}
