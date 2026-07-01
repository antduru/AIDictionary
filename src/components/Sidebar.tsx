import { BookOpen, Library, Map, Route, Settings, Timer } from "lucide-react";
import type { AppView } from "../types";

interface SidebarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
}

const navItems: Array<{ view: AppView; label: string; icon: typeof BookOpen }> = [
  { view: "atlas", label: "Atlas", icon: BookOpen },
  { view: "library", label: "Library", icon: Library },
  { view: "map", label: "Map", icon: Map },
  { view: "timeline", label: "Timeline", icon: Timer },
  { view: "trails", label: "Trails", icon: Route },
  { view: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ activeView, onChangeView }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand-mark">
        <span className="brand-ribbon" />
        <div>
          <strong>Lexicon OS</strong>
          <small>Personal atlas</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            className={activeView === view ? "nav-button nav-button--active" : "nav-button"}
            onClick={() => onChangeView(view)}
            aria-current={activeView === view ? "page" : undefined}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
