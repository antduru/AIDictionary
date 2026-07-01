import { alphabetTabs } from "../utils/filters";

interface AlphabetTabsProps {
  activeLetter: string;
  counts: Record<string, number>;
  onChange: (letter: string) => void;
}

export function AlphabetTabs({ activeLetter, counts, onChange }: AlphabetTabsProps) {
  return (
    <div className="alphabet-tabs" aria-label="Alphabet page dividers">
      {alphabetTabs.map((letter) => (
        <button
          key={letter}
          type="button"
          className={activeLetter === letter ? "alphabet-tab alphabet-tab--active" : "alphabet-tab"}
          onClick={() => onChange(letter)}
          title={`${letter}: ${counts[letter] ?? 0} entries`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
