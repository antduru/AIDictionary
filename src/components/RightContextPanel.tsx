import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Link2, Plus, RotateCcw, Sparkles, Trash2, XCircle } from "lucide-react";
import type {
  BookPage,
  Entry,
  EntryInput,
  KnowledgeGap,
  KnowledgeGapInput,
  ContentBlock,
  Relation,
  RelationInput,
} from "../types";
import { contentFromBlocks, ownerBlocks, relationTypeSuggestions } from "../utils/blocks";
import { getConfiguredAIProvider, getAISettingsForAction } from "../services/ai/aiProvider";
import { entryCandidatePrompt, entryCandidateSystemPrompt, gapPrompt, gapSystemPrompt, relationPrompt, relationSystemPrompt } from "../services/ai/prompts";
import { cleanModelText, parseJSONArray } from "../services/ai/parsing";
import type { EntryCandidateSuggestion, KnowledgeGapSuggestion, RelationSuggestion } from "../services/ai/types";

interface RightContextPanelProps {
  selectedEntry: Entry | null;
  entries: Entry[];
  bookPages: BookPage[];
  relations: Relation[];
  knowledgeGaps: KnowledgeGap[];
  contentBlocks: ContentBlock[];
  autoRelationRequest: { entryId: string; nonce: number } | null;
  onCreateEntryCandidate: (input: EntryInput, sourceEntryId: string, reason: string) => Promise<void>;
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
  bookPages,
  relations,
  knowledgeGaps,
  contentBlocks,
  autoRelationRequest,
  onCreateEntryCandidate,
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
  const [relationSuggestions, setRelationSuggestions] = useState<RelationSuggestion[]>([]);
  const [gapSuggestions, setGapSuggestions] = useState<KnowledgeGapSuggestion[]>([]);
  const [entrySuggestions, setEntrySuggestions] = useState<EntryCandidateSuggestion[]>([]);
  const [relationAIError, setRelationAIError] = useState<string | null>(null);
  const [gapAIError, setGapAIError] = useState<string | null>(null);
  const [entryAIError, setEntryAIError] = useState<string | null>(null);
  const [isSuggestingRelations, setIsSuggestingRelations] = useState(false);
  const [autoRelationMessage, setAutoRelationMessage] = useState("");
  const [isSuggestingGaps, setIsSuggestingGaps] = useState(false);
  const [isSuggestingEntries, setIsSuggestingEntries] = useState(false);

  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const entryByTitle = useMemo(() => new Map(entries.map((entry) => [entry.title.toLowerCase(), entry])), [entries]);
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

  const selectedEntryContent = selectedEntry
    ? [
        contentFromBlocks(ownerBlocks(contentBlocks, "entry", selectedEntry.id), selectedEntry.content),
        ...(selectedEntry.entryType === "book"
          ? bookPages
              .filter((page) => page.entryId === selectedEntry.id)
              .sort((a, b) => a.pageOrder - b.pageOrder)
              .map((page) =>
                [`Page: ${page.title}`, contentFromBlocks(ownerBlocks(contentBlocks, "book_page", page.id), page.content)]
                  .filter(Boolean)
                  .join("\n"),
              )
          : []),
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

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

  const suggestRelations = async (mode: "manual" | "auto" = "manual") => {
    if (!selectedEntry) {
      return;
    }
    setRelationSuggestions([]);
    setRelationAIError(null);
    setAutoRelationMessage(mode === "auto" ? "Looking for related entries automatically..." : "");
    setIsSuggestingRelations(true);
    try {
      const settings = getAISettingsForAction();
      const existingTitles = relationOptions.map((entry) => entry.title);
      const result = await getConfiguredAIProvider().generateText({
        systemPrompt: relationSystemPrompt,
        userPrompt: relationPrompt({ entry: selectedEntry, content: selectedEntryContent, existingTitles }),
        model: settings.modelName,
        temperature: settings.temperature,
      });
      const parsed = parseJSONArray<RelationSuggestion>(cleanModelText(result.text));
      const valid = parsed
        .map((suggestion) => ({
          targetTitle: String(suggestion.targetTitle || "").trim(),
          relationType: String(suggestion.relationType || "related to").trim() || "related to",
          reason: String(suggestion.reason || "").trim(),
        }))
        .filter((suggestion) => {
          const target = entryByTitle.get(suggestion.targetTitle.toLowerCase());
          return target && target.id !== selectedEntry.id && !outgoingTargetIds.has(target.id);
        });

      if (mode === "auto") {
        let addedCount = 0;
        for (const suggestion of valid) {
          const target = entryByTitle.get(suggestion.targetTitle.toLowerCase());
          if (!target) {
            continue;
          }
          await onAddRelation({
            fromEntryId: selectedEntry.id,
            toEntryId: target.id,
            relationType: suggestion.relationType || "related to",
            note: suggestion.reason,
          });
          addedCount += 1;
        }
        setRelationSuggestions([]);
        setAutoRelationMessage(
          addedCount > 0
            ? `Auto-related ${addedCount} entr${addedCount === 1 ? "y" : "ies"}.`
            : "No new related entries found automatically.",
        );
        return;
      }

      setRelationSuggestions(valid);
      if (valid.length === 0) {
        setRelationAIError("No usable relation suggestions were returned from the existing entry list.");
      }
    } catch (error) {
      setRelationAIError(errorMessage(error));
      if (mode === "auto") {
        setAutoRelationMessage("");
      }
    } finally {
      setIsSuggestingRelations(false);
    }
  };


  const acceptRelationSuggestion = async (suggestion: RelationSuggestion) => {
    if (!selectedEntry) {
      return;
    }
    const target = entryByTitle.get(suggestion.targetTitle.toLowerCase());
    if (!target) {
      setRelationAIError("That suggested entry no longer exists.");
      return;
    }
    await onAddRelation({
      fromEntryId: selectedEntry.id,
      toEntryId: target.id,
      relationType: suggestion.relationType || "related to",
      note: suggestion.reason,
    });
    setRelationSuggestions((current) => current.filter((item) => item !== suggestion));
  };

  const suggestEntries = async () => {
    if (!selectedEntry) {
      return;
    }
    setEntrySuggestions([]);
    setEntryAIError(null);
    setIsSuggestingEntries(true);
    try {
      const settings = getAISettingsForAction();
      const existingTitleSet = new Set(entries.map((entry) => entry.title.trim().toLowerCase()));
      const result = await getConfiguredAIProvider().generateText({
        systemPrompt: entryCandidateSystemPrompt,
        userPrompt: entryCandidatePrompt({
          title: selectedEntry.title,
          content: selectedEntryContent,
          existingTitles: entries.map((entry) => entry.title),
        }),
        model: settings.modelName,
        temperature: settings.temperature,
      });
      const parsed = parseJSONArray<EntryCandidateSuggestion>(cleanModelText(result.text));
      const seenTitles = new Set<string>();
      const valid = parsed
        .map((suggestion) => {
          const title = String(suggestion.title || "").trim();
          return {
            title,
            reason: String(suggestion.reason || "").trim(),
            category: String(suggestion.category || selectedEntry.category || "").trim(),
            tags: Array.isArray(suggestion.tags)
              ? suggestion.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 5)
              : selectedEntry.tags.slice(0, 3),
          };
        })
        .filter((suggestion) => {
          const normalizedTitle = suggestion.title.toLowerCase();
          if (!suggestion.title || existingTitleSet.has(normalizedTitle) || seenTitles.has(normalizedTitle)) {
            return false;
          }
          seenTitles.add(normalizedTitle);
          return true;
        });
      setEntrySuggestions(valid);
      if (valid.length === 0) {
        setEntryAIError("No new entry candidates were found outside the existing atlas titles.");
      }
    } catch (error) {
      setEntryAIError(errorMessage(error));
    } finally {
      setIsSuggestingEntries(false);
    }
  };

  const acceptEntrySuggestion = async (suggestion: EntryCandidateSuggestion) => {
    if (!selectedEntry) {
      return;
    }
    await onCreateEntryCandidate(
      {
        title: suggestion.title,
        entryType: "entry",
        content: suggestion.reason,
        category: suggestion.category || selectedEntry.category,
        tags: suggestion.tags ?? [],
        timelineDate: "",
        timelineNote: "",
      },
      selectedEntry.id,
      suggestion.reason,
    );
    setEntrySuggestions((current) => current.filter((item) => item !== suggestion));
  };

  const suggestGaps = async () => {
    if (!selectedEntry) {
      return;
    }
    setGapSuggestions([]);
    setGapAIError(null);
    setIsSuggestingGaps(true);
    try {
      const settings = getAISettingsForAction();
      const result = await getConfiguredAIProvider().generateText({
        systemPrompt: gapSystemPrompt,
        userPrompt: gapPrompt({ title: selectedEntry.title, content: selectedEntryContent }),
        model: settings.modelName,
        temperature: settings.temperature,
      });
      const parsed = parseJSONArray<KnowledgeGapSuggestion>(cleanModelText(result.text));
      const valid = parsed
        .map((suggestion) => ({
          title: String(suggestion.title || "").trim(),
          note: String(suggestion.note || "").trim(),
        }))
        .filter((suggestion) => suggestion.title);
      setGapSuggestions(valid);
      if (valid.length === 0) {
        setGapAIError("No usable gap suggestions were returned.");
      }
    } catch (error) {
      setGapAIError(errorMessage(error));
    } finally {
      setIsSuggestingGaps(false);
    }
  };

  const acceptGapSuggestion = async (suggestion: KnowledgeGapSuggestion) => {
    if (!selectedEntry) {
      return;
    }
    await onAddKnowledgeGap({
      entryId: selectedEntry.id,
      title: suggestion.title,
      note: suggestion.note,
      status: "open",
      resolvedEntryId: "",
    });
    setGapSuggestions((current) => current.filter((item) => item !== suggestion));
  };

  useEffect(() => {
    if (!autoRelationRequest || !selectedEntry) {
      return;
    }
    if (autoRelationRequest.entryId !== selectedEntry.id) {
      return;
    }
    if (relationOptions.length === 0) {
      setAutoRelationMessage("No other entries available for automatic related suggestions.");
      return;
    }
    void suggestRelations("auto");
  }, [autoRelationRequest?.nonce]);


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

            <button className="button button--subtle button--full" type="button" onClick={() => suggestRelations("manual")} disabled={isSuggestingRelations}>
              <Sparkles size={16} />
              {isSuggestingRelations ? "Suggesting..." : "Suggest Relations"}
            </button>
            {autoRelationMessage ? <div className="status-note">{autoRelationMessage}</div> : null}
            {relationAIError ? <div className="status-note status-note--error">{relationAIError}</div> : null}
            {relationSuggestions.length ? (
              <div className="suggestion-list">
                {relationSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.targetTitle + suggestion.relationType}
                    title={suggestion.targetTitle}
                    subtitle={suggestion.relationType}
                    body={suggestion.reason}
                    onAccept={() => acceptRelationSuggestion(suggestion)}
                    onReject={() => setRelationSuggestions((current) => current.filter((item) => item !== suggestion))}
                  />
                ))}
              </div>
            ) : null}

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
              <Sparkles size={16} />
              <h3>Suggested Entries</h3>
            </div>

            <button className="button button--subtle button--full" type="button" onClick={suggestEntries} disabled={isSuggestingEntries}>
              <Sparkles size={16} />
              {isSuggestingEntries ? "Suggesting..." : "Suggest Entries"}
            </button>
            {entryAIError ? <div className="status-note status-note--error">{entryAIError}</div> : null}
            {entrySuggestions.length ? (
              <div className="suggestion-list">
                {entrySuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.title}
                    title={suggestion.title}
                    subtitle={suggestion.category}
                    body={suggestion.reason}
                    onAccept={() => acceptEntrySuggestion(suggestion)}
                    onReject={() => setEntrySuggestions((current) => current.filter((item) => item !== suggestion))}
                  />
                ))}
              </div>
            ) : null}
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

            <button className="button button--subtle button--full" type="button" onClick={suggestGaps} disabled={isSuggestingGaps}>
              <Sparkles size={16} />
              {isSuggestingGaps ? "Suggesting..." : "Suggest Gaps"}
            </button>
            {gapAIError ? <div className="status-note status-note--error">{gapAIError}</div> : null}
            {gapSuggestions.length ? (
              <div className="suggestion-list">
                {gapSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.title}
                    title={suggestion.title}
                    body={suggestion.note}
                    onAccept={() => acceptGapSuggestion(suggestion)}
                    onReject={() => setGapSuggestions((current) => current.filter((item) => item !== suggestion))}
                  />
                ))}
              </div>
            ) : null}

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

interface SuggestionCardProps {
  title: string;
  subtitle?: string;
  body?: string;
  onAccept: () => Promise<void> | void;
  onReject: () => void;
}

function SuggestionCard({ title, subtitle, body, onAccept, onReject }: SuggestionCardProps) {
  return (
    <div className="suggestion-card">
      <div>
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
        {body ? <p>{body}</p> : null}
      </div>
      <div className="gap-actions">
        <button className="mini-icon-button" type="button" onClick={onAccept} title="Accept suggestion">
          Accept
        </button>
        <button className="mini-icon-button" type="button" onClick={onReject} title="Discard suggestion">
          Reject
        </button>
      </div>
    </div>
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

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong.";
}
