import { Download, Upload } from "lucide-react";

export function SettingsView() {
  return (
    <section className="settings-view">
      <div className="view-header">
        <div>
          <span>Settings</span>
          <h1>Lexicon OS</h1>
        </div>
      </div>

      <div className="settings-panel">
        <div>
          <strong>Version</strong>
          <p>0.2.0 local-first organization MVP</p>
        </div>
        <div>
          <strong>Storage</strong>
          <p>Local SQLite database in the Tauri app data directory.</p>
        </div>
        <div className="settings-actions">
          <button className="button button--subtle" type="button" disabled>
            <Download size={17} />
            Export Coming Soon
          </button>
          <button className="button button--subtle" type="button" disabled>
            <Upload size={17} />
            Import Coming Soon
          </button>
        </div>
      </div>
    </section>
  );
}
