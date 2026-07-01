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
        (() => {
          const count = counts[letter] ?? 0;
          const isDisabled = letter !== "All" && count === 0;
          return (
            <button
              key={letter}
              type="button"
              className={[
                "alphabet-tab",
                activeLetter === letter ? "alphabet-tab--active" : "",
                isDisabled ? "alphabet-tab--disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onChange(letter)}
              title={`${letter}: ${count} entries`}
              disabled={isDisabled}
            >
              {letter}
            </button>
          );
        })()
      ))}
    </div>
  );
}
