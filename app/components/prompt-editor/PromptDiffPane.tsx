import { VersionPill } from "@/app/components";
import { SavedConfig } from "@/app/lib/types/configs";

interface PromptDiffPaneProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig;
}

interface DiffLine {
  type: "same" | "added" | "removed";
  content: string;
  lineNumber: number;
}

function generateDiff(
  text1: string,
  text2: string,
): { left: DiffLine[]; right: DiffLine[] } {
  const lines1 = text1.split("\n");
  const lines2 = text2.split("\n");
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i] !== undefined ? lines1[i] : null;
    const line2 = lines2[i] !== undefined ? lines2[i] : null;

    if (line1 === null && line2 !== null) {
      left.push({ type: "same", content: "", lineNumber: i + 1 });
      right.push({ type: "added", content: line2, lineNumber: i + 1 });
    } else if (line1 !== null && line2 === null) {
      left.push({ type: "removed", content: line1, lineNumber: i + 1 });
      right.push({ type: "same", content: "", lineNumber: i + 1 });
    } else if (line1 !== line2) {
      left.push({ type: "removed", content: line1 || "", lineNumber: i + 1 });
      right.push({ type: "added", content: line2 || "", lineNumber: i + 1 });
    } else {
      left.push({ type: "same", content: line1 || "", lineNumber: i + 1 });
      right.push({ type: "same", content: line2 || "", lineNumber: i + 1 });
    }
  }

  return { left, right };
}

export default function PromptDiffPane({
  selectedCommit,
  compareWith,
}: PromptDiffPaneProps) {
  const { left, right } = generateDiff(
    compareWith.promptContent,
    selectedCommit.promptContent,
  );
  const hasChanges =
    left.some((line) => line.type !== "same") ||
    right.some((line) => line.type !== "same");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg-primary">
        <h3 className="text-sm font-semibold text-text-primary">
          Prompt Changes
        </h3>
        <div className="text-xs mt-1 text-text-secondary inline-flex items-center gap-1.5">
          Side-by-side comparison:{" "}
          <VersionPill version={compareWith.version} size="sm" /> ↔
          <VersionPill
            version={selectedCommit.version}
            size="sm"
            tone="accent"
          />
        </div>
      </div>

      {!hasChanges ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-secondary">No prompt changes</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border bg-bg-secondary">
            <div className="px-3 py-2 text-xs font-semibold text-text-primary">
              v{compareWith.version} (Before)
            </div>
            <div className="px-3 py-2 text-xs font-semibold border-l border-border text-text-primary">
              v{selectedCommit.version} (After)
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 font-mono text-xs">
              <div className="bg-bg-primary">
                {left.map((line, idx) => (
                  <DiffLineRow key={idx} line={line} side="left" />
                ))}
              </div>

              <div className="border-l border-border bg-bg-primary">
                {right.map((line, idx) => (
                  <DiffLineRow key={idx} line={line} side="right" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffLineRow({
  line,
  side,
}: {
  line: DiffLine;
  side: "left" | "right";
}) {
  const tone =
    side === "left"
      ? line.type === "removed"
        ? "bg-status-error-bg text-status-error-text"
        : "text-text-primary"
      : line.type === "added"
        ? "bg-status-success-bg text-status-success-text"
        : "text-text-primary";

  const prefix =
    side === "left" && line.type === "removed"
      ? "- "
      : side === "right" && line.type === "added"
        ? "+ "
        : "";

  return (
    <div
      className={`px-3 py-1 min-h-6 leading-relaxed whitespace-pre-wrap wrap-break-word ${tone}`}
    >
      {prefix}
      {line.content || " "}
    </div>
  );
}
