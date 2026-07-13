import { Clipboard, RotateCcw, X } from "lucide-react";

interface AIDraftPanelProps {
  title: string;
  text?: string;
  error?: string | null;
  isLoading?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void | Promise<void>;
  onDiscard?: () => void;
  onRetry?: () => void;
}

export function AIDraftPanel({
  title,
  text,
  error,
  isLoading = false,
  primaryActionLabel = "Insert",
  onPrimaryAction,
  onDiscard,
  onRetry,
}: AIDraftPanelProps) {
  if (!isLoading && !text && !error) {
    return null;
  }

  const copyText = async () => {
    if (text) {
      await navigator.clipboard?.writeText(text);
    }
  };

  return (
    <div className="ai-draft-panel">
      <div className="ai-draft-panel__header">
        <span>{title}</span>
        {onDiscard ? (
          <button className="mini-icon-button" type="button" onClick={onDiscard} title="Discard">
            <X size={14} />
          </button>
        ) : null}
      </div>

      {isLoading ? <p className="muted">Working with local Ollama...</p> : null}
      {error ? <div className="status-note status-note--error">{error}</div> : null}
      {text ? <pre className="ai-draft-text">{text}</pre> : null}

      <div className="ai-draft-actions">
        {onPrimaryAction && text ? (
          <button className="button button--primary" type="button" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        ) : null}
        {text ? (
          <button className="button button--subtle" type="button" onClick={copyText}>
            <Clipboard size={15} />
            Copy
          </button>
        ) : null}
        {onRetry && error ? (
          <button className="button button--subtle" type="button" onClick={onRetry}>
            <RotateCcw size={15} />
            Retry
          </button>
        ) : null}
        {onDiscard && (text || error) ? (
          <button className="button button--subtle" type="button" onClick={onDiscard}>
            Discard
          </button>
        ) : null}
      </div>
    </div>
  );
}
