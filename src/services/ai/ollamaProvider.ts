import type { AIProvider, AISettings, GenerateTextInput, GenerateTextResult } from "./types";

const defaultTimeoutMs = 180_000;

type OllamaGenerateResponse = {
  response?: string;
  message?: {
    content?: string;
  };
};

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly forceCpu: boolean;

  constructor(settings: AISettings, timeoutMs = defaultTimeoutMs) {
    this.baseUrl = settings.ollamaBaseUrl.replace(/\/+$/, "");
    this.modelName = settings.modelName;
    this.temperature = settings.temperature;
    this.timeoutMs = timeoutMs;
    this.forceCpu = settings.forceCpu;
  }

  async testConnection(signal?: AbortSignal) {
    const response = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {
      method: "GET",
      signal,
    }, 10_000);

    if (!response.ok) {
      throw new Error("Ollama is not reachable. Make sure Ollama is installed and running locally.");
    }
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const prompt = [input.context, input.userPrompt].filter(Boolean).join("\n\n");
    const response = await fetchWithTimeout(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model || this.modelName,
        system: input.systemPrompt,
        prompt,
        stream: false,
        options: {
          temperature: input.temperature ?? this.temperature,
          ...(this.forceCpu ? { num_gpu: 0 } : {}),
        },
      }),
      signal: input.signal,
    }, this.timeoutMs);

    if (!response.ok) {
      throw new Error(await ollamaErrorMessage(response));
    }

    const raw = (await response.json()) as OllamaGenerateResponse;
    const text = raw.response ?? raw.message?.content ?? "";
    return {
      text: text.trim(),
      raw,
    };
  }
}

export function createOllamaProvider(settings: AISettings): OllamaProvider {
  return new OllamaProvider(settings);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init.signal;

  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Ollama took too long to respond. The first run can take a few minutes while the model loads; try again or use a smaller model.");
    }
    throw new Error("Ollama is not reachable. Make sure Ollama is installed and running locally.");
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

async function ollamaErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) {
      return friendlyOllamaError(body.error);
    }
  } catch {
    // Fall through to generic message.
  }
  return "Ollama returned an error while generating the draft.";
}

function friendlyOllamaError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("cuda") || lower.includes("ptx") || lower.includes("llama-server process has terminated")) {
    return "Ollama's local model runner crashed in CUDA/GPU mode. Update your NVIDIA driver, or restart Ollama with GPU disabled and try again.";
  }
  return message;
}

