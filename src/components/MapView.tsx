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
  const groupedEntries = visibleEntries.filter((entry) =>
    relations.some((relation) => relation.fromEntryId === entry.id || relation.toEntryId === entry.id),
  );

  return (
    <section className="map-view">
      <div className="view-header">
        <div>
          <span>Map</span>
          <h1>Connection Atlas</h1>
        </div>
      </div>

      <div className="map-layout map-layout--wide">
        <div className="connection-groups" aria-label="Grouped conceptual relations">
          {groupedEntries.length === 0 ? (
            <div className="empty-panel">
              <h2>No connections found</h2>
              <p>Add typed relations from the right panel to build the atlas map.</p>
            </div>
          ) : (
            groupedEntries.map((source) => {
              const outgoing = relations.filter(
                (relation) => relation.fromEntryId === source.id && visibleIds.has(relation.toEntryId),
              );
              const incoming = relations.filter(
                (relation) => relation.toEntryId === source.id && visibleIds.has(relation.fromEntryId),
              );
              return (
                <article className="connection-group" key={source.id}>
                  <button className="connection-source" type="button" onClick={() => onSelectEntry(source.id)}>
                    <span>{source.entryType}</span>
                    <strong>{source.title}</strong>
                    <small>{source.category || "Uncategorized"}</small>
                  </button>

                  <div className="connection-rows">
                    {outgoing.map((relation) => {
                      const target = entryById.get(relation.toEntryId);
                      return (
                        <div className="connection-row" key={relation.id}>
                          <button type="button" onClick={() => onSelectEntry(source.id)}>
                            {source.title}
                          </button>
                          <span>{relation.relationType}</span>
                          <button type="button" onClick={() => target && onSelectEntry(target.id)}>
                            {target?.title ?? "Missing entry"}
                          </button>
                        </div>
                      );
                    })}
                    {incoming.map((relation) => {
                      const incomingSource = entryById.get(relation.fromEntryId);
                      return (
                        <div className="connection-row connection-row--incoming" key={relation.id}>
                          <button type="button" onClick={() => incomingSource && onSelectEntry(incomingSource.id)}>
                            {incomingSource?.title ?? "Missing entry"}
                          </button>
                          <span>{relation.relationType}</span>
                          <button type="button" onClick={() => onSelectEntry(source.id)}>
                            {source.title}
                          </button>
                        </div>
                      );
                    })}
                    {outgoing.length === 0 && incoming.length === 0 ? (
                      <p className="muted">No visible relations for this search.</p>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="connections-list">
          <div className="context-section-title">
            <GitBranch size={16} />
            <h3>Relation Types</h3>
          </div>
          {Array.from(new Set(relations.map((relation) => relation.relationType))).map((type) => (
            <span className="relation-type-pill" key={type}>
              {type}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
