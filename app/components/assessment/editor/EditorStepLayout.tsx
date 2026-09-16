"use client";

import { useRef } from "react";
import { SplitPane } from "@/app/components/ui";
import { useSyncedScroll } from "@/app/hooks";
import PreviewPane from "./PreviewPane";
import type { EditorStepLayoutProps } from "@/app/lib/types/assessment";

export default function EditorStepLayout({
  children,
  zones,
  columns,
  fieldTypes,
  sampleRow,
  previewDisabledNote,
}: EditorStepLayoutProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useSyncedScroll({
    editorRef,
    previewRef,
    editorAnchorSelector: "[data-zone-heading]",
    previewAnchorSelector: "h1",
  });

  return (
    <SplitPane
      label="Resize editor and preview"
      left={
        <div
          ref={editorRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-bg-secondary px-5 py-5 [&>*]:shrink-0"
        >
          {children}
        </div>
      }
      right={
        <PreviewPane
          paneRef={previewRef}
          zones={zones}
          columns={columns}
          fieldTypes={fieldTypes}
          sampleRow={sampleRow}
          disabledNote={previewDisabledNote}
        />
      }
    />
  );
}
