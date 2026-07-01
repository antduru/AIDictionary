import type { Entry } from "../types";

export const alphabetTabs = [
  "All",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "#",
];

export const matchesQuery = (entry: Entry, query: string) => {
  const value = query.trim().toLowerCase();
  if (!value) {
    return true;
  }

  return [
    entry.title,
    entry.content,
    entry.category,
    entry.entryType,
    ...entry.tags,
  ].some((field) => field.toLowerCase().includes(value));
};

export const matchesLetter = (entry: Entry, letter: string) => {
  if (letter === "All") {
    return true;
  }

  const first = entry.title.trim().charAt(0).toUpperCase();
  if (letter === "#") {
    return !/[A-Z]/.test(first);
  }

  return first === letter;
};

export const getEntryLetter = (entry: Entry) => {
  const first = entry.title.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
};

export const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
