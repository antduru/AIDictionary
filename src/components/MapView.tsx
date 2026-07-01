import { GitBranch } from "lucide-react";
import type { Entry, Relation } from "../types";
import { matchesQuery } from "../utils/filters";

interface MapViewProps {
  entries: Entry[];
  relations: Relation[];
  query: string;
  onSelectEntry: (entryId: string) => void;
}

export function MapView({ entries, relations, query, onSelectEntry }: MapViewProps) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const visibleEntries = entries.filter((entry) => matchesQuery(entry, query));
  const visibleIds = new Set(visibleEntries.map((entry) => entry.id));
  const visibleRelations = relations.filter(
    (relation) => visibleIds.has(relation.fromEntryId) || visibleIds.has(relation.toEntryId),
  );

  return (
    <section className="map-view">
      <div className="view-header">
        <div>
          <span>Map</span>
          <h1>Connection Atlas</h1>
        </div>
      </div>

      <div className="map-layout">
        <div className="node-grid" aria-label="Entry nodes">
          {visibleEntries.length === 0 ? (
            <div className="empty-panel">
              <h2>No nodes found</h2>
              <p>Search for a different entry or clear the search field.</p>
            </div>
          ) : (
            visibleEntries.map((entry) => (
              <button className="node-card" type="button" key={entry.id} onClick={() => onSelectEntry(entry.id)}>
                <span>{entry.entryType}</span>
                <strong>{entry.title}</strong>
                <small>{entry.category || "Uncategorized"}</small>
              </button>
            ))
          )}
        </div>

        <div className="connections-list">
          <div className="context-section-title">
            <GitBranch size={16} />
            <h3>Connections</h3>
          </div>

          {visibleRelations.length === 0 ? (
            <p className="muted">No related-entry connections yet.</p>
          ) : (
            visibleRelations.map((relation) => {
              const from = entryById.get(relation.fromEntryId);
              const to = entryById.get(relation.toEntryId);
              return (
                <div className="connection-row" key={relation.id}>
                  <button type="button" onClick={() => from && onSelectEntry(from.id)}>
                    {from?.title ?? "Missing entry"}
                  </button>
                  <span>{relation.relationType}</span>
                  <button type="button" onClick={() => to && onSelectEntry(to.id)}>
                    {to?.title ?? "Missing entry"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
