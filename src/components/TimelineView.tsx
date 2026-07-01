import type { Entry } from "../types";
import { matchesQuery } from "../utils/filters";

interface TimelineViewProps {
  entries: Entry[];
  query: string;
  onSelectEntry: (entryId: string) => void;
}

export function TimelineView({ entries, query, onSelectEntry }: TimelineViewProps) {
  const timelineEntries = entries
    .filter((entry) => entry.timelineDate.trim() && matchesQuery(entry, query))
    .sort(compareTimelineEntries);

  return (
    <section className="timeline-view">
      <div className="view-header">
        <div>
          <span>Timeline</span>
          <h1>Chronology Lens</h1>
        </div>
      </div>

      <div className="timeline-list">
        {timelineEntries.length === 0 ? (
          <div className="empty-panel">
            <h2>No timeline entries</h2>
            <p>Add timeline metadata from an entry editor to place it in this view.</p>
          </div>
        ) : (
          timelineEntries.map((entry) => (
            <button className="timeline-item" type="button" key={entry.id} onClick={() => onSelectEntry(entry.id)}>
              <span className="timeline-date">{entry.timelineDate}</span>
              <div>
                <strong>{entry.title}</strong>
                <small>{entry.entryType} - {entry.category || "Uncategorized"}</small>
                {entry.timelineNote ? <p>{entry.timelineNote}</p> : null}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function compareTimelineEntries(a: Entry, b: Entry) {
  const aYear = numericYear(a.timelineDate);
  const bYear = numericYear(b.timelineDate);
  if (aYear !== null && bYear !== null) {
    return aYear - bYear;
  }
  if (aYear !== null) return -1;
  if (bYear !== null) return 1;
  return a.timelineDate.localeCompare(b.timelineDate) || a.title.localeCompare(b.title);
}

function numericYear(value: string) {
  const match = value.match(/^-?\d{1,4}/);
  return match ? Number(match[0]) : null;
}
