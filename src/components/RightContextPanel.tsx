import { useMemo, useState } from "react";
import { CheckCircle2, Link2, Plus, Trash2, XCircle } from "lucide-react";
import type {
  Entry,
  KnowledgeGap,
  KnowledgeGapInput,
  Relation,
  RelationInput,
} from "../types";

interface RightContextPanelProps {
  selectedEntry: Entry | null;
  entries: Entry[];
  relations: Relation[];
  knowledgeGaps: KnowledgeGap[];
  onAddRelation: (input: RelationInput) => Promise<void>;
  onDeleteRelation: (relationId: string) => Promise<void>;
  onAddKnowledgeGap: (input: KnowledgeGapInput) => Promise<void>;
  onUpdateKnowledgeGap: (gapId: string, input: KnowledgeGapInput) => Promise<void>;
  onDeleteKnowledgeGap: (gapId: string) => Promise<void>;
  onSelectEntry: (entryId: string) => void;
}

export function RightContextPanel({
  selectedEntry,
  entries,
  relations,
  knowledgeGaps,
  onAddRelation,
  onDeleteRelation,
  onAddKnowledgeGap,
  onUpdateKnowledgeGap,
  onDeleteKnowledgeGap,
  onSelectEntry,
}: RightContextPanelProps) {
  const [targetEntryId, setTargetEntryId] = useState("");
  const [newGapTitle, setNewGapTitle] = useState("");
  const [newGapNote, setNewGapNote] = useState("");

  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const contextualRelations = selectedEntry
    ? relations.filter(
        (relation) =>
          relation.fromEntryId === selectedEntry.id || relation.toEntryId === selectedEntry.id,
      )
    : [];

  const relatedEntryIds = new Set(
    contextualRelations.map((relation) =>
      relation.fromEntryId === selectedEntry?.id ? relation.toEntryId : relation.fromEntryId,
    ),
  );

  const relationOptions = selectedEntry
    ? entries.filter((entry) => entry.id !== selectedEntry.id && !relatedEntryIds.has(entry.id))
    : [];

  const contextualGaps = selectedEntry
    ? knowledgeGaps.filter((gap) => gap.entryId === selectedEntry.id)
    : [];

  const handleAddRelation = async () => {
    if (!selectedEntry || !targetEntryId) {
      return;
    }
    await onAddRelation({
      fromEntryId: selectedEntry.id,
      toEntryId: targetEntryId,
      relationType: "related",
      note: "",
    });
    setTargetEntryId("");
  };

  const handleAddGap = async () => {
    if (!selectedEntry || !newGapTitle.trim()) {
      return;
    }
    await onAddKnowledgeGap({
      entryId: selectedEntry.id,
      title: newGapTitle.trim(),
      note: newGapNote.trim(),
      status: "open",
    });
    setNewGapTitle("");
    setNewGapNote("");
  };

  return (
    <aside className="context-panel" aria-label="Context panel">
      {selectedEntry ? (
        <>
          <div className="context-heading">
            <span>Context</span>
            <strong>{selectedEntry.title}</strong>
          </div>

          <section className="context-section">
            <div className="context-section-title">
              <Link2 size={16} />
              <h3>Related Entries</h3>
            </div>

            <div className="inline-control">
              <select value={targetEntryId} onChange={(event) => setTargetEntryId(event.target.value)}>
                <option value="">Add relation...</option>
                {relationOptions.map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
              <button className="icon-button" type="button" onClick={handleAddRelation} title="Add relation">
                <Plus size={16} />
              </button>
            </div>

            <div className="context-list">
              {contextualRelations.length === 0 ? (
                <p className="muted">No related entries yet.</p>
              ) : (
                contextualRelations.map((relation) => {
                  const relatedId =
                    relation.fromEntryId === selectedEntry.id
                      ? relation.toEntryId
                      : relation.fromEntryId;
                  const relatedEntry = entryById.get(relatedId);
                  return (
                    <div className="context-item" key={relation.id}>
                      <button type="button" onClick={() => relatedEntry && onSelectEntry(relatedEntry.id)}>
                        {relatedEntry?.title ?? "Missing entry"}
                        <small>{relation.relationType}</small>
                      </button>
                      <button
                        className="mini-icon-button"
                        type="button"
                        onClick={() => onDeleteRelation(relation.id)}
                        title="Remove relation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="context-section">
            <div className="context-section-title">
              <XCircle size={16} />
              <h3>Knowledge Gaps</h3>
            </div>

            <div className="gap-form">
              <input
                value={newGapTitle}
                onChange={(event) => setNewGapTitle(event.target.value)}
                placeholder="Gap title"
              />
              <textarea
                value={newGapNote}
                onChange={(event) => setNewGapNote(event.target.value)}
                placeholder="Manual note"
              />
              <button className="button button--subtle button--full" type="button" onClick={handleAddGap}>
                <Plus size={16} />
                Add Gap
              </button>
            </div>

            <div className="context-list">
              {contextualGaps.length === 0 ? (
                <p className="muted">No knowledge gaps recorded.</p>
              ) : (
                contextualGaps.map((gap) => (
                  <KnowledgeGapItem
                    key={gap.id}
                    gap={gap}
                    onUpdate={(input) => onUpdateKnowledgeGap(gap.id, input)}
                    onDelete={() => onDeleteKnowledgeGap(gap.id)}
                  />
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="context-empty">
          <strong>No entry selected</strong>
          <p>Open an atlas page to manage manual relations and knowledge gaps.</p>
        </div>
      )}
    </aside>
  );
}

interface KnowledgeGapItemProps {
  gap: KnowledgeGap;
  onUpdate: (input: KnowledgeGapInput) => Promise<void>;
  onDelete: () => Promise<void>;
}

function KnowledgeGapItem({ gap, onUpdate, onDelete }: KnowledgeGapItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(gap.title);
  const [note, setNote] = useState(gap.note);

  if (isEditing) {
    return (
      <div className="gap-edit-card">
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="editor-actions">
          <button
            className="button button--primary"
            type="button"
            onClick={async () => {
              await onUpdate({
                entryId: gap.entryId,
                title,
                note,
                status: gap.status,
              });
              setIsEditing(false);
            }}
          >
            Save
          </button>
          <button className="button button--subtle" type="button" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gap-card">
      <div>
        <strong>{gap.title}</strong>
        {gap.note ? <p>{gap.note}</p> : null}
        <span className={gap.status === "resolved" ? "status-pill status-pill--resolved" : "status-pill"}>
          {gap.status}
        </span>
      </div>
      <div className="gap-actions">
        <button
          className="mini-icon-button"
          type="button"
          onClick={() =>
            onUpdate({
              entryId: gap.entryId,
              title: gap.title,
              note: gap.note,
              status: gap.status === "resolved" ? "open" : "resolved",
            })
          }
          title={gap.status === "resolved" ? "Reopen" : "Resolve"}
        >
          <CheckCircle2 size={14} />
        </button>
        <button className="mini-icon-button" type="button" onClick={() => setIsEditing(true)} title="Edit gap">
          <span aria-hidden="true">Edit</span>
        </button>
        <button className="mini-icon-button" type="button" onClick={onDelete} title="Delete gap">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
