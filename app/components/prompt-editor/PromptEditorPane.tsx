interface PromptEditorPaneProps {
  currentContent: string;
  onContentChange: (content: string) => void;
  currentBranch: string;
  isReadOnly?: boolean;
}

export default function PromptEditorPane({
  currentContent,
  onContentChange,
  currentBranch,
  isReadOnly = false,
}: PromptEditorPaneProps) {
  const charCount = currentContent.length;
  const lineCount = currentContent ? currentContent.split("\n").length : 0;

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-bg-secondary">
      <div className="h-14 border-b border-border bg-bg-primary px-4 shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">Prompt</h3>
          <div className="text-xs mt-0.5 text-text-secondary flex items-baseline gap-1 min-w-0">
            <span className="shrink-0">Editing on</span>
            <span
              className="font-medium text-text-primary truncate min-w-0 max-w-[200px] sm:max-w-xs md:max-w-sm"
              title={currentBranch}
            >
              {currentBranch}
            </span>
          </div>
        </div>
        {!isReadOnly && (
          <div className="text-[11px] text-text-secondary tabular-nums shrink-0 whitespace-nowrap">
            {lineCount} line{lineCount !== 1 ? "s" : ""} · {charCount} char
            {charCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="h-full rounded-lg bg-bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-accent-primary/20 transition-shadow">
          <textarea
            value={currentContent}
            onChange={(e) => onContentChange(e.target.value)}
            readOnly={isReadOnly}
            spellCheck={false}
            className={`w-full h-full min-h-full rounded-lg p-4 text-sm leading-relaxed font-mono bg-transparent text-text-primary placeholder:text-neutral-400 focus:outline-none resize-none ${
              isReadOnly ? "cursor-default" : "cursor-text"
            }`}
            placeholder={
              isReadOnly
                ? ""
                : "Write your prompt here…\n\nExample:\nYou are a helpful assistant.\nAnswer questions clearly and concisely."
            }
          />
        </div>
      </div>
    </div>
  );
}
