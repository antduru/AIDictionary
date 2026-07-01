import { ArrowDown, ArrowUp, BookOpen, Plus, Route, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Entry, Trail, TrailInput, TrailItem, TrailItemInput } from "../types";

interface TrailsViewProps {
  entries: Entry[];
  trails: Trail[];
  trailItems: TrailItem[];
  selectedTrailId: string | null;
  onSelectTrail: (trailId: string) => void;
  onCreateTrail: (input: TrailInput) => Promise<void>;
  onUpdateTrail: (trailId: string, input: TrailInput) => Promise<void>;
  onDeleteTrail: (trailId: string) => Promise<void>;
  onCreateTrailItem: (input: TrailItemInput) => Promise<void>;
  onUpdateTrailItem: (trailItemId: string, input: TrailItemInput) => Promise<void>;
  onDeleteTrailItem: (trailItemId: string) => Promise<void>;
  onSelectEntry: (entryId: string) => void;
}

export function TrailsView({
  entries,
  trails,
  trailItems,
  selectedTrailId,
  onSelectTrail,
  onCreateTrail,
  onUpdateTrail,
  onDeleteTrail,
  onCreateTrailItem,
  onUpdateTrailItem,
  onDeleteTrailItem,
  onSelectEntry,
}: TrailsViewProps) {
  const selectedTrail = trails.find((trail) => trail.id === selectedTrailId) ?? trails[0] ?? null;
  const entryById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const selectedItems = selectedTrail
    ? trailItems
        .filter((item) => item.trailId === selectedTrail.id)
        .sort((a, b) => a.itemOrder - b.itemOrder)
    : [];

  const [newTrailTitle, setNewTrailTitle] = useState("");
  const [newTrailDescription, setNewTrailDescription] = useState("");
  const [addEntryId, setAddEntryId] = useState("");
  const [trailTitle, setTrailTitle] = useState(selectedTrail?.title ?? "");
  const [trailDescription, setTrailDescription] = useState(selectedTrail?.description ?? "");

  useEffect(() => {
    setTrailTitle(selectedTrail?.title ?? "");
    setTrailDescription(selectedTrail?.description ?? "");
  }, [selectedTrail?.id]);

  const usedEntryIds = new Set(selectedItems.map((item) => item.entryId));
  const addOptions = entries.filter((entry) => !usedEntryIds.has(entry.id));

  const handleCreateTrail = async () => {
    if (!newTrailTitle.trim()) {
      return;
    }
    await onCreateTrail({ title: newTrailTitle.trim(), description: newTrailDescription.trim() });
    setNewTrailTitle("");
    setNewTrailDescription("");
  };

  const handleAddEntry = async () => {
    if (!selectedTrail || !addEntryId) {
      return;
    }
    await onCreateTrailItem({
      trailId: selectedTrail.id,
      entryId: addEntryId,
      itemOrder: selectedItems.length + 1,
      note: "",
    });
    setAddEntryId("");
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedItems.length) {
      return;
    }
    const current = selectedItems[index];
    const target = selectedItems[nextIndex];
    await onUpdateTrailItem(current.id, { ...current, itemOrder: target.itemOrder });
    await onUpdateTrailItem(target.id, { ...target, itemOrder: current.itemOrder });
  };

  return (
    <section className="trails-view">
      <div className="view-header">
        <div>
          <span>Trails</span>
          <h1>Routes Through The Atlas</h1>
        </div>
      </div>

      <div className="trails-layout">
        <aside className="trail-list-panel">
          <div className="trail-create-card">
            <input value={newTrailTitle} onChange={(event) => setNewTrailTitle(event.target.value)} placeholder="New trail title" />
            <textarea value={newTrailDescription} onChange={(event) => setNewTrailDescription(event.target.value)} placeholder="Description" />
            <button className="button button--primary button--full" type="button" onClick={handleCreateTrail}>
              <Plus size={16} />
              Create Trail
            </button>
          </div>

          <div className="trail-list">
            {trails.map((trail) => {
              const count = trailItems.filter((item) => item.trailId === trail.id).length;
              return (
                <button
                  className={selectedTrail?.id === trail.id ? "trail-list-item trail-list-item--active" : "trail-list-item"}
                  type="button"
                  key={trail.id}
                  onClick={() => onSelectTrail(trail.id)}
                >
                  <Route size={16} />
                  <span>
                    <strong>{trail.title}</strong>
                    <small>{count} entries</small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="trail-detail-panel">
          {selectedTrail ? (
            <>
              <div className="trail-detail-header">
                <label className="field">
                  <span>Trail Title</span>
                  <input value={trailTitle} onChange={(event) => setTrailTitle(event.target.value)} />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea value={trailDescription} onChange={(event) => setTrailDescription(event.target.value)} />
                </label>
                <div className="editor-actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => onUpdateTrail(selectedTrail.id, { title: trailTitle, description: trailDescription })}
                  >
                    Save Trail
                  </button>
                  <button className="button button--subtle" type="button" onClick={() => onDeleteTrail(selectedTrail.id)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              <div className="inline-control trail-add-entry">
                <select value={addEntryId} onChange={(event) => setAddEntryId(event.target.value)}>
                  <option value="">Add entry to route...</option>
                  {addOptions.map((entry) => (
                    <option value={entry.id} key={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
                <button className="icon-button" type="button" onClick={handleAddEntry} title="Add entry">
                  <Plus size={16} />
                </button>
              </div>

              <ol className="trail-route">
                {selectedItems.length === 0 ? (
                  <div className="empty-panel">
                    <h2>No route entries</h2>
                    <p>Add entries to turn this trail into a useful path.</p>
                  </div>
                ) : (
                  selectedItems.map((item, index) => {
                    const entry = entryById.get(item.entryId);
                    return (
                      <li className="trail-route-item" key={item.id}>
                        <span className="route-number">{index + 1}</span>
                        <div>
                          <strong>{entry?.title ?? "Missing entry"}</strong>
                          {item.note ? <p>{item.note}</p> : null}
                          <input
                            defaultValue={item.note}
                            onBlur={(event) =>
                              event.target.value !== item.note
                                ? onUpdateTrailItem(item.id, { ...item, note: event.target.value })
                                : undefined
                            }
                            placeholder="Optional route note"
                          />
                        </div>
                        <div className="trail-route-actions">
                          <button className="mini-icon-button" type="button" onClick={() => moveItem(index, -1)} title="Move up">
                            <ArrowUp size={14} />
                          </button>
                          <button className="mini-icon-button" type="button" onClick={() => moveItem(index, 1)} title="Move down">
                            <ArrowDown size={14} />
                          </button>
                          <button className="mini-icon-button" type="button" onClick={() => entry && onSelectEntry(entry.id)} title="Open entry">
                            <BookOpen size={14} />
                          </button>
                          <button className="mini-icon-button" type="button" onClick={() => onDeleteTrailItem(item.id)} title="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })
                )}
              </ol>
            </>
          ) : (
            <div className="empty-panel">
              <h2>No trails yet</h2>
              <p>Create a route to connect entries as a learning path, reading path, or argument.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
