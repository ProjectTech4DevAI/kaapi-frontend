"use client";

import {
  DocumentFileIcon,
  ImageIcon,
  LockClosedIcon,
} from "@/app/components/icons";
import {
  buildPreviewBlocks,
  fieldTypeOf,
} from "@/app/lib/assessment/promptTokens";
import type {
  PreviewBlock,
  PreviewBlockType,
  PreviewPaneProps,
  PromptFieldType,
  PromptSegment,
} from "@/app/lib/types/assessment";

const BLOCK_CLASSES: Record<PreviewBlockType, string> = {
  h1: "mt-6 mb-2.5 text-[15px] font-bold tracking-wider uppercase text-text-primary first:mt-0",
  h2: "mt-4 mb-2 text-base font-semibold text-text-primary",
  li: "my-0.5 ml-5 list-disc text-sm leading-7 text-text-primary",
  p: "mb-2.5 text-sm leading-7 text-text-primary",
};

/** Read-only mirror of the prompt the model will see, filled with row 1. */
export default function PreviewPane({
  paneRef,
  zones,
  columns,
  fieldTypes,
  sampleRow,
  disabledNote,
}: PreviewPaneProps) {
  const blocks = buildPreviewBlocks({ zones, columns, fieldTypes, sampleRow });

  return (
    <div
      ref={paneRef}
      className="min-h-0 flex-1 overflow-auto bg-accent-subtle/10 px-7 py-5"
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase text-text-secondary">
        Preview
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-subtle bg-accent-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-primary">
          <LockClosedIcon className="h-2.5 w-2.5" />
          Read only
        </span>
      </div>

      {disabledNote ? (
        <p className="text-sm leading-7 text-text-secondary">{disabledNote}</p>
      ) : (
        <>
          <p className="mb-3.5 max-w-[760px] text-xs leading-5 text-text-secondary">
            A sample of the prompt the AI sees for one submission, filled in
            with row 1 of the selected set. Edit it on the left.
          </p>

          {blocks.length === 0 ? (
            <p className="text-sm leading-7 text-text-secondary">
              Start typing in the editor — the assembled prompt previews here
              with row 1 of the submission set filled in.
            </p>
          ) : (
            <div className="max-w-[760px]">
              {blocks.map((block, index) => (
                <PreviewBlockView
                  key={`${block.type}-${index}`}
                  block={block}
                  fieldTypes={fieldTypes}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PreviewBlockView({
  block,
  fieldTypes,
}: {
  block: PreviewBlock;
  fieldTypes: Record<string, PromptFieldType>;
}) {
  const content = block.segments.map((segment, index) => (
    <SegmentView
      key={`${index}-${segment.text}`}
      segment={segment}
      fieldTypes={fieldTypes}
    />
  ));

  if (block.type === "h1") {
    return <h1 className={BLOCK_CLASSES.h1}>{content}</h1>;
  }
  if (block.type === "h2") {
    return <h2 className={BLOCK_CLASSES.h2}>{content}</h2>;
  }
  if (block.type === "li") {
    return <li className={BLOCK_CLASSES.li}>{content}</li>;
  }
  return <p className={BLOCK_CLASSES.p}>{content}</p>;
}

function SegmentView({
  segment,
  fieldTypes,
}: {
  segment: PromptSegment;
  fieldTypes: Record<string, PromptFieldType>;
}) {
  if (segment.kind === "plain") return <>{segment.text}</>;

  if (segment.kind === "attachment" && segment.name) {
    const isImage = fieldTypeOf(fieldTypes, segment.name) === "image";
    return (
      <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-status-warning-border bg-status-warning-bg px-2 py-px align-baseline text-xs font-medium text-status-warning-text">
        {isImage ? (
          <ImageIcon className="h-3 w-3" />
        ) : (
          <DocumentFileIcon className="h-3 w-3" />
        )}
        {segment.name}
      </span>
    );
  }

  if (segment.kind === "unknown") {
    return (
      <span className="rounded bg-status-warning-bg text-status-warning-text underline decoration-status-warning decoration-wavy">
        {segment.text}
      </span>
    );
  }

  return (
    <span className="rounded bg-accent-subtle/35 px-0.5">{segment.text}</span>
  );
}
