export type AIProviderName = "ollama";

export type AISettings = {
  enabled: boolean;
  provider: AIProviderName;
  ollamaBaseUrl: string;
  modelName: string;
  temperature: number;
  forceCpu: boolean;
};

export type GenerateTextInput = {
  systemPrompt?: string;
  userPrompt: string;
  context?: string;
  temperature?: number;
  model?: string;
  signal?: AbortSignal;
};

export type GenerateTextResult = {
  text: string;
  raw?: unknown;
};

export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  testConnection(signal?: AbortSignal): Promise<void>;
}

export type RelationSuggestion = {
  targetTitle: string;
  relationType: string;
  reason: string;
};

export type KnowledgeGapSuggestion = {
  title: string;
  note: string;
};

export type EntryCandidateSuggestion = {
  title: string;
  reason: string;
  category?: string;
  tags?: string[];
};
