import type { Entry } from "../../types";

export const atlasDraftSystemPrompt =
  "You are helping the user build a personal knowledge atlas. Create a useful but flexible draft for an atlas entry. Do not force a rigid template. Prefer concise sections, clear explanation, practical notes, and related concepts. The user will review and edit your output before saving. Do not invent citations.";

export const summarizeSystemPrompt =
  "You help summarize personal atlas notes. Preserve the user's intent, stay concise, and do not invent external facts or citations. Treat the provided text as the full available context.";

export const relationSystemPrompt =
  "You suggest manual relations for a personal knowledge atlas. Use only the provided existing entry titles. Do not invent entries. Return JSON only when possible.";

export const gapSystemPrompt =
  "You suggest knowledge gaps for a personal knowledge atlas. Offer useful missing concepts, unresolved questions, or follow-up entries as suggestions only. Return JSON only when possible.";

export const rewriteSystemPrompt =
  "You revise one user-authored atlas block. Preserve the user's meaning, avoid adding unsupported facts, and return only the rewritten block text.";

export const entryCandidateSystemPrompt =
  "You suggest new entry candidates for a personal knowledge atlas. Find important keywords, terminology, concepts, named methods, and possible atlas pages that are present or strongly implied in the provided content. Do not suggest entries that already exist in the atlas. Return JSON only when possible.";

export function draftEntryPrompt(input: {
  title: string;
  category?: string;
  tags?: string[];
  instruction?: string;
}) {
  return [
    `Entry title: ${input.title || "Untitled"}`,
    input.category ? `Category: ${input.category}` : "",
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : "",
    input.instruction ? `User instruction: ${input.instruction}` : "",
    "Create a concise, structured draft in Markdown. Use headings only where helpful.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function summarizePrompt(input: { title: string; content: string }) {
  return [
    `Title: ${input.title}`,
    "Current content:",
    input.content || "(empty)",
    "Write a concise summary suitable for a callout block.",
  ].join("\n\n");
}

export function relationPrompt(input: {
  entry: Entry;
  content: string;
  existingTitles: string[];
}) {
  return [
    `Current entry: ${input.entry.title}`,
    "Current content:",
    input.content || input.entry.content || "(empty)",
    "Existing entry titles:",
    input.existingTitles.map((title) => `- ${title}`).join("\n"),
    "Suggest up to 5 relations using only these existing titles. Return JSON in this shape:",
    `[{"targetTitle":"Existing Title","relationType":"related to","reason":"Short reason"}]`,
  ].join("\n\n");
}

export function gapPrompt(input: { title: string; content: string }) {
  return [
    `Entry title: ${input.title}`,
    "Current content:",
    input.content || "(empty)",
    "Suggest up to 5 knowledge gaps. Return JSON in this shape:",
    `[{"title":"Gap title","note":"Why this gap is useful"}]`,
  ].join("\n\n");
}

export function rewritePrompt(input: { content: string; mode: string }) {
  return [
    `Rewrite mode: ${input.mode}`,
    "Block content:",
    input.content,
  ].join("\n\n");
}

export function entryCandidatePrompt(input: {
  title: string;
  content: string;
  existingTitles: string[];
}) {
  return [
    `Current entry/book: ${input.title}`,
    "Current content:",
    input.content || "(empty)",
    "Existing atlas entry titles:",
    input.existingTitles.map((title) => `- ${title}`).join("\n"),
    "Suggest up to 8 new entry candidates that do not already exist. Prefer concise title-cased terms. Return JSON in this shape:",
    `[{"title":"Candidate Term","reason":"Why this deserves its own atlas entry","category":"Optional category","tags":["optional","tags"]}]`,
  ].join("\n\n");
}
