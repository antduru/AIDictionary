import { useMemo, useState } from "react";
import { CheckCircle2, Link2, Plus, RotateCcw, Trash2, XCircle } from "lucide-react";
import type {
  Entry,
  KnowledgeGap,
  KnowledgeGapInput,
  Relation,
  RelationInput,
} from "../types";
import { relationTypeSuggestions } from "../utils/blocks";

interface RightContextPanelProps {
  selectedEntry: Entry | null;
  entries: Entry[];
  relations: Relation[];
  knowledgeGaps: KnowledgeGap[];
  onAddRelation: (input: RelationInput) => Promise<void>;
  onUpdateRelation: (relationId: string, input: RelationInput) => Promise<void>;
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
  onUpdateRelation,
  onDeleteRelation,
  onAddKnowledgeGap,
  onUpdateKnowledgeGap,
  onDeleteKnowledgeGap,
  onSelectEntry,
}: RightContextPanelProps) {
  const [targetEntryId, setTargetEntryId] = useState("");
  const [relationType, setRelationType] = useState("related to");
  const [relationNote, setRelationNote] = useState("");
  const [newGapTitle, setNewGapTitle] = useState("");
  const [newGapNote, setNewGapNote] = useState("");

  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const outgoingRelations = selectedEntry
    ? relations.filter((relation) => relation.fromEntryId === selectedEntry.id)
    : [];
  const backlinks = selectedEntry
    ? relations.filter((relation) => relation.toEntryId === selectedEntry.id)
    : [];

  const outgoingTargetIds = new Set(outgoingRelations.map((relation) => relation.toEntryId));
  const relationOptions = selectedEntry
    ? entries.filter((entry) => entry.id !== selectedEntry.id && !outgoingTargetIds.has(entry.id))
    : [];

  const contextualGaps = selectedEntry
    ? knowledgeGaps.filter((gap) => gap.entryId === selectedEntry.id)
    : [];
  const openGaps = contextualGaps.filter((gap) => gap.status === "open");
  const resolvedGaps = contextualGaps.filter((gap) => gap.status === "resolved");

  const handleAddRelation = async () => {
    if (!selectedEntry || !targetEntryId) {
      return;
    }
    await onAddRelation({
      fromEntryId: selectedEntry.id,
      toEntryId: targetEntryId,
      relationType: relationType.trim() || "related to",
      note: relationNote.trim(),
    });
    setTargetEntryId("");
    setRelationType("related to");
    setRelationNote("");
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
      resolvedEntryId: "",
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

            <div className="relation-form">
              <select value={targetEntryId} onChange={(event) => setTargetEntryId(event.target.value)}>
                <option value="">Target entry...</option>
                {relationOptions.map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
              <input
                list="relation-type-suggestions"
                value={relationType}
                onChange={(event) => setRelationType(event.target.value)}
                placeholder="relation type"
              />
              <datalist id="relation-type-suggestions">
                {relationTypeSuggestions.map((suggestion) => (
                  <option value={suggestion} key={suggestion} />
                ))}
              </datalist>
              <textarea
                value={relationNote}
                onChange={(event) => setRelationNote(event.target.value)}
                placeholder="Optional relation note"
              />
              <button className="button button--subtle button--full" type="button" onClick={handleAddRelation}>
                <Plus size={16} />
                Add Relation
              </button>
            </div>

            <div className="context-list">
              {outgoingRelations.length === 0 ? (
                <p className="muted">No outgoing relations yet.</p>
              ) : (
                outgoingRelations.map((relation) => (
                  <RelationItem
                    key={relation.id}
                    relation={relation}
                    selectedEntry={selectedEntry}
                    targetEntry={entryById.get(relation.toEntryId) ?? null}
                    onSelectEntry={onSelectEntry}
                    onUpdate={(input) => onUpdateRelation(relation.id, input)}
                    onDelete={() => onDeleteRelation(relation.id)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="context-section">
            <div className="context-section-title">
              <RotateCcw size={16} />
              <h3>Referenced By</h3>
            </div>

            <div className="context-list">
              {backlinks.length === 0 ? (
                <p className="muted">No backlinks yet.</p>
              ) : (
                backlinks.map((relation) => {
                  const source = entryById.get(relation.fromEntryId);
                  return (
                    <button
                      className="backlink-item"
                      type="button"
                      key={relation.id}
                      onClick={() => source && onSelectEntry(source.id)}
                    >
                      <strong>{source?.title ?? "Missing entry"}</strong>
                      <span>{relation.relationType} this</span>
                      {relation.note ? <small>{relation.note}</small> : null}
                    </button>
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

            <GapList
              title="Open"
              gaps={openGaps}
              entries={entries}
              onUpdate={(gap, input) => onUpdateKnowledgeGap(gap.id, input)}
              onDelete={(gap) => onDeleteKnowledgeGap(gap.id)}
              onSelectEntry={onSelectEntry}
            />
            <GapList
              title="Resolved"
              gaps={resolvedGaps}
              entries={entries}
              onUpdate={(gap, input) => onUpdateKnowledgeGap(gap.id, input)}
              onDelete={(gap) => onDeleteKnowledgeGap(gap.id)}
              onSelectEntry={onSelectEntry}
              compact
            />
          </section>
        </>
      ) : (
        <div className="context-empty">
          <strong>No entry selected</strong>
          <p>Open an atlas page to manage manual relations, backlinks, and knowledge gaps.</p>
        </div>
      )}
    </aside>
  );
}

interface RelationItemProps {
  relation: Relation;
  selectedEntry: Entry;
  targetEntry: Entry | null;
  onSelectEntry: (entryId: string) => void;
  onUpdate: (input: RelationInput) => Promise<void>;
  onDelete: () => Promise<void>;
}

function RelationItem({
  relation,
  selectedEntry,
  targetEntry,
  onSelectEntry,
  onUpdate,
  onDelete,
}: RelationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [relationType, setRelationType] = useState(relation.relationType);
  const [note, setNote] = useState(relation.note);

  if (isEditing) {
    return (
      <div className="relation-edit-card">
        <input
          list="relation-type-suggestions"
          value={relationType}
          onChange={(event) => setRelationType(event.target.value)}
        />
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="editor-actions">
          <button
            className="button button--primary"
            type="button"
            onClick={async () => {
              await onUpdate({
                fromEntryId: relation.fromEntryId,
                toEntryId: relation.toEntryId,
                relationType,
                note,
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
    <div className="relation-card">
      <button type="button" onClick={() => targetEntry && onSelectEntry(targetEntry.id)}>
        <span>{selectedEntry.title}</span>
        <strong>{relation.relationType}</strong>
        <span>{targetEntry?.title ?? "Missing entry"}</span>
        {relation.note ? <small>{relation.note}</small> : null}
      </button>
      <div className="gap-actions">
        <button className="mini-icon-button" type="button" onClick={() => setIsEditing(true)} title="Edit relation">
          Edit
        </button>
        <button className="mini-icon-button" type="button" onClick={onDelete} title="Remove relation">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

interface GapListProps {
  title: string;
  gaps: KnowledgeGap[];
  entries: Entry[];
  onUpdate: (gap: KnowledgeGap, input: KnowledgeGapInput) => Promise<void>;
  onDelete: (gap: KnowledgeGap) => Promise<void>;
  onSelectEntry: (entryId: string) => void;
  compact?: boolean;
}

function GapList({ title, gaps, entries, onUpdate, onDelete, onSelectEntry, compact = false }: GapListProps) {
  return (
    <div className={compact ? "gap-group gap-group--resolved" : "gap-group"}>
      <span className="gap-group-title">{title}</span>
      <div className="context-list">
        {gaps.length === 0 ? (
          <p className="muted">{compact ? "No resolved gaps." : "No open gaps."}</p>
        ) : (
          gaps.map((gap) => (
            <KnowledgeGapItem
              key={gap.id}
              gap={gap}
              entries={entries}
              onUpdate={(input) => onUpdate(gap, input)}
              onDelete={() => onDelete(gap)}
              onSelectEntry={onSelectEntry}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface KnowledgeGapItemProps {
  gap: KnowledgeGap;
  entries: Entry[];
  onUpdate: (input: KnowledgeGapInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onSelectEntry: (entryId: string) => void;
}

function KnowledgeGapItem({ gap, entries, onUpdate, onDelete, onSelectEntry }: KnowledgeGapItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(gap.title);
  const [note, setNote] = useState(gap.note);
  const [resolvedEntryId, setResolvedEntryId] = useState(gap.resolvedEntryId);
  const resolvedEntry = entries.find((entry) => entry.id === gap.resolvedEntryId);

  if (isEditing) {
    return (
      <div className="gap-edit-card">
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        <select value={resolvedEntryId} onChange={(event) => setResolvedEntryId(event.target.value)}>
          <option value="">Resolved entry...</option>
          {entries.map((entry) => (
            <option value={entry.id} key={entry.id}>
              {entry.title}
            </option>
          ))}
        </select>
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
                resolvedEntryId,
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
        {resolvedEntry ? (
          <button className="resolved-link" type="button" onClick={() => onSelectEntry(resolvedEntry.id)}>
            resolved by {resolvedEntry.title}
          </button>
        ) : null}
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
              resolvedEntryId: gap.resolvedEntryId,
            })
          }
          title={gap.status === "resolved" ? "Reopen" : "Resolve"}
        >
          <CheckCircle2 size={14} />
        </button>
        <button className="mini-icon-button" type="button" onClick={() => setIsEditing(true)} title="Edit gap">
          Edit
        </button>
        <button className="mini-icon-button" type="button" onClick={onDelete} title="Delete gap">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
