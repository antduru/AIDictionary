import { useState } from "react";
import { Download, Upload, Wifi, Sparkles } from "lucide-react";
import { isLocalOllamaEndpoint, loadAISettings, saveAISettings } from "../services/ai/aiSettings";
import { createOllamaProvider } from "../services/ai/ollamaProvider";
import type { AISettings } from "../services/ai/types";

export function SettingsView() {
  const [aiSettings, setAISettings] = useState<AISettings>(() => loadAISettings());
  const [connectionStatus, setConnectionStatus] = useState<StatusState>(idleStatus);
  const [promptStatus, setPromptStatus] = useState<StatusState>(idleStatus);
  const [testPrompt, setTestPrompt] = useState("Write one sentence about personal knowledge atlases.");

  const updateAISettings = (updates: Partial<AISettings>) => {
    const next = { ...aiSettings, ...updates, provider: "ollama" as const };
    setAISettings(next);
    saveAISettings(next);
  };

  const testConnection = async () => {
    setConnectionStatus({ state: "loading", message: "Testing local Ollama..." });
    try {
      await createOllamaProvider(aiSettings).testConnection();
      setConnectionStatus({ state: "success", message: "Ollama responded successfully." });
    } catch (error) {
      setConnectionStatus({ state: "error", message: errorMessage(error) });
    }
  };

  const runTestPrompt = async () => {
    setPromptStatus({ state: "loading", message: "Generating a short test response..." });
    try {
      const result = await createOllamaProvider(aiSettings).generateText({
        userPrompt: testPrompt,
        temperature: aiSettings.temperature,
        model: aiSettings.modelName,
      });
      setPromptStatus({ state: "success", message: result.text || "Ollama returned an empty response." });
    } catch (error) {
      setPromptStatus({ state: "error", message: errorMessage(error) });
    }
  };

  return (
    <section className="settings-view">
      <div className="view-header">
        <div>
          <span>Settings</span>
          <h1>Lexicon OS</h1>
        </div>
      </div>

      <div className="settings-stack">
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

        <div className="settings-panel ai-settings-panel">
          <div>
            <strong>AI</strong>
            <p>Lexicon OS uses your local Ollama server. Your atlas content is sent only to the local Ollama endpoint you configure.</p>
          </div>

          {!isLocalOllamaEndpoint(aiSettings.ollamaBaseUrl) ? (
            <div className="warning-note">This Ollama endpoint is not local. Your content may be sent to another machine or server.</div>
          ) : null}

          <div className="settings-toggles">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={aiSettings.enabled}
                onChange={(event) => updateAISettings({ enabled: event.target.checked })}
              />
              <span>AI enabled</span>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={aiSettings.forceCpu}
                onChange={(event) => updateAISettings({ forceCpu: event.target.checked })}
              />
              <span>Force CPU mode</span>
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Provider</span>
              <select value={aiSettings.provider} disabled>
                <option value="ollama">Ollama</option>
              </select>
            </label>

            <label className="field">
              <span>Model name</span>
              <input
                value={aiSettings.modelName}
                onChange={(event) => updateAISettings({ modelName: event.target.value })}
                placeholder="qwen3:4b"
                list="ollama-model-options"
              />
              <datalist id="ollama-model-options">
                <option value="qwen3:4b" />
                <option value="llama3.2:3b" />
              </datalist>
            </label>

            <label className="field field--wide">
              <span>Ollama base URL</span>
              <input
                value={aiSettings.ollamaBaseUrl}
                onChange={(event) => updateAISettings({ ollamaBaseUrl: event.target.value })}
                placeholder="http://localhost:11434"
              />
            </label>

            <label className="field">
              <span>Temperature</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings.temperature}
                onChange={(event) => updateAISettings({ temperature: Number(event.target.value) })}
              />
            </label>
          </div>

          {aiSettings.forceCpu ? (
            <div className="status-note">CPU mode asks Ollama to avoid GPU offload for AI requests from Lexicon OS.</div>
          ) : null}

          <div className="settings-actions">
            <button className="button button--subtle" type="button" onClick={testConnection} disabled={connectionStatus.state === "loading"}>
              <Wifi size={17} />
              {connectionStatus.state === "loading" ? "Testing..." : "Test Connection"}
            </button>
          </div>
          <StatusMessage status={connectionStatus} />

          <label className="field">
            <span>Test prompt</span>
            <textarea value={testPrompt} onChange={(event) => setTestPrompt(event.target.value)} />
          </label>
          <div className="settings-actions">
            <button className="button button--subtle" type="button" onClick={runTestPrompt} disabled={promptStatus.state === "loading"}>
              <Sparkles size={17} />
              {promptStatus.state === "loading" ? "Generating..." : "Test Prompt"}
            </button>
          </div>
          <StatusMessage status={promptStatus} />
        </div>
      </div>
    </section>
  );
}

type StatusState = {
  state: "idle" | "loading" | "success" | "error";
  message: string;
};

const idleStatus: StatusState = { state: "idle", message: "" };

function StatusMessage({ status }: { status: StatusState }) {
  if (status.state === "idle") {
    return null;
  }
  return <div className={`status-note status-note--${status.state}`}>{status.message}</div>;
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
