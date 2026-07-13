import { loadAISettings } from "./aiSettings";
import { createOllamaProvider } from "./ollamaProvider";
import type { AIProvider } from "./types";

export function getConfiguredAIProvider(): AIProvider {
  const settings = loadAISettings();
  if (!settings.enabled) {
    throw new Error("AI is disabled. Enable local Ollama in Settings first.");
  }
  return createOllamaProvider(settings);
}

export function getAISettingsForAction() {
  const settings = loadAISettings();
  if (!settings.enabled) {
    throw new Error("AI is disabled. Enable local Ollama in Settings first.");
  }
  return settings;
}
