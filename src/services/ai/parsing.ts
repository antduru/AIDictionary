export function parseJSONArray<T>(text: string): T[] {
  const trimmed = text.trim();
  const extracted = extractArray(trimmed);
  const candidates = extracted ? [trimmed, extracted] : [trimmed];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("The AI response was not valid JSON. Try again or adjust the prompt.");
}

function extractArray(text: string) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

export function cleanModelText(text: string) {
  return text.replace(/^```(?:json|markdown)?/i, "").replace(/```$/i, "").trim();
}
