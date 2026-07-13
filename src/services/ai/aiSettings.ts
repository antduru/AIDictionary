import type { AISettings } from "./types";

const storageKey = "lexicon-os-ai-settings";

export const defaultAISettings: AISettings = {
  enabled: false,
  provider: "ollama",
  ollamaBaseUrl: "http://localhost:11434",
  modelName: "qwen3:4b",
  temperature: 0.3,
  forceCpu: false,
};

export function loadAISettings(): AISettings {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return defaultAISettings;
  }

  try {
    return normalizeAISettings(JSON.parse(raw) as Partial<AISettings>);
  } catch {
    return defaultAISettings;
  }
}

export function saveAISettings(settings: AISettings) {
  localStorage.setItem(storageKey, JSON.stringify(normalizeAISettings(settings)));
}

export function normalizeAISettings(settings: Partial<AISettings>): AISettings {
  const temperature = Number(settings.temperature);
  const configuredModelName = settings.modelName?.trim();
  const modelName = !configuredModelName || configuredModelName === "qwen3.5:4b"
    ? defaultAISettings.modelName
    : configuredModelName;

  return {
    enabled: Boolean(settings.enabled),
    provider: "ollama",
    ollamaBaseUrl: normalizeBaseUrl(settings.ollamaBaseUrl ?? defaultAISettings.ollamaBaseUrl),
    modelName,
    temperature: Number.isFinite(temperature)
      ? Math.min(1, Math.max(0, temperature))
      : defaultAISettings.temperature,
    forceCpu: Boolean(settings.forceCpu),
  };
}

export function isLocalOllamaEndpoint(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim() || defaultAISettings.ollamaBaseUrl;
  return trimmed.replace(/\/+$/, "");
}
