"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Loader, Modal } from "@/app/components/ui";
import { DownloadIcon } from "@/app/components/icons";
import { formatDate } from "@/app/components/utils";
import {
  Document,
  DocumentPreviewKind,
  DocumentPreviewModalProps,
  DocumentSidebarProps,
  PreviewPaneProps,
} from "@/app/lib/types/document";
import { getDocumentPreviewSource } from "@/app/lib/utils/documentPreview";
import CsvPreview from "@/app/components/knowledge-base/CsvPreview";

// Native iframes are likely to silently fail (cancelled download, bad MIME);
const IFRAME_TIMEOUT_MS: Record<DocumentPreviewKind, number> = {
  native: 12000,
  office: 25000,
  google: 25000,
  csv: 0,
  unsupported: 0,
};

export default function DocumentPreviewModal({
  open,
  onClose,
  documents,
  previewDoc,
  isLoading,
  onSelectDocument,
}: DocumentPreviewModalProps) {
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const [frameTimedOut, setFrameTimedOut] = useState(false);

  const previewSource = useMemo(
    () => getDocumentPreviewSource(previewDoc),
    [previewDoc],
  );
  const { kind, url: previewUrl } = previewSource;
  const usesIframe =
    kind === "native" || kind === "office" || kind === "google";

  useEffect(() => {
    setFrameTimedOut(false);
    if (!usesIframe || !previewUrl) {
      setIsFrameLoading(false);
      return;
    }
    setIsFrameLoading(true);
    const timer = setTimeout(() => {
      setIsFrameLoading(false);
      setFrameTimedOut(true);
    }, IFRAME_TIMEOUT_MS[kind]);
    return () => clearTimeout(timer);
  }, [previewDoc?.id, previewUrl, usesIframe, kind]);

  const renderIframe = usesIframe && !!previewUrl && !frameTimedOut;
  const showLoader = (isLoading || isFrameLoading) && usesIframe;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Document Preview"
      maxWidth="max-w-5xl"
      maxHeight="h-[80vh]"
    >
      <div className="flex flex-1 min-h-0 h-full">
        <DocumentSidebar
          documents={documents}
          previewDoc={previewDoc}
          onSelectDocument={onSelectDocument}
        />
        <div className="flex-1 min-h-0 flex flex-col">
          <PreviewHeader previewDoc={previewDoc} />
          <PreviewPane
            previewDoc={previewDoc}
            previewUrl={previewUrl}
            kind={kind}
            renderIframe={renderIframe}
            showLoader={showLoader}
            frameTimedOut={frameTimedOut}
            onFrameLoad={() => setIsFrameLoading(false)}
          />
        </div>
      </div>
    </Modal>
  );
}

function DocumentSidebar({
  documents,
  previewDoc,
  onSelectDocument,
}: DocumentSidebarProps) {
  return (
    <div className="w-56 shrink-0 border-r border-border overflow-y-auto bg-bg-secondary">
      {documents.map((doc) => {
        const isSelected = previewDoc?.id === doc.id;
        return (
          <button
            key={doc.id}
            onClick={() => onSelectDocument(doc)}
            className={`relative w-full text-left px-4 py-3 transition-colors cursor-pointer ${
              isSelected ? "bg-accent-primary/5" : "hover:bg-accent-primary/5"
            }`}
          >
            {isSelected && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary" />
            )}
            <p
              className={`text-sm truncate ${
                isSelected
                  ? "font-semibold text-accent-primary"
                  : "font-medium text-text-primary"
              }`}
            >
              {doc.fname}
            </p>
            {doc.inserted_at && (
              <p className="text-xs text-text-secondary mt-0.5">
                {formatDate(doc.inserted_at)}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function PreviewHeader({ previewDoc }: { previewDoc: Document | null }) {
  if (!previewDoc) return null;
  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-bg-primary">
      <p className="text-sm font-medium text-text-primary truncate">
        {previewDoc.fname}
      </p>
      {previewDoc.signed_url && (
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            triggerDownload(previewDoc.signed_url!, previewDoc.fname)
          }
          title="Download file"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          Download
        </Button>
      )}
    </div>
  );
}

function PreviewPane({
  previewDoc,
  previewUrl,
  kind,
  renderIframe,
  showLoader,
  frameTimedOut,
  onFrameLoad,
}: PreviewPaneProps) {
  const showCsv = kind === "csv" && !!previewUrl;
  const showFallback = !showLoader && !renderIframe && !showCsv;

  return (
    <div className="flex-1 min-h-0 bg-neutral-50 relative">
      {renderIframe && (
        <iframe
          key={`${previewDoc!.id}-${kind}`}
          src={previewUrl!}
          title={previewDoc!.fname}
          onLoad={onFrameLoad}
          className="w-full h-full border-none"
        />
      )}

      {showCsv && <CsvPreview url={previewUrl!} />}

      {showFallback && (
        <PreviewFallback
          previewDoc={previewDoc}
          frameTimedOut={frameTimedOut}
        />
      )}

      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 backdrop-blur-[1px] pointer-events-none">
          <Loader
            size="md"
            message={
              previewDoc?.fname
                ? `Loading ${previewDoc.fname}…`
                : "Loading document…"
            }
          />
        </div>
      )}
    </div>
  );
}

interface PreviewFallbackProps {
  previewDoc: Document | null;
  frameTimedOut: boolean;
}

function PreviewFallback({ previewDoc, frameTimedOut }: PreviewFallbackProps) {
  if (!previewDoc) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-text-secondary">
          Select a document to preview
        </p>
      </div>
    );
  }
  const message = frameTimedOut
    ? "The preview didn't load. Please download the file to view it."
    : "Inline preview isn't available for this file format.";
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
      <p className="text-sm text-text-secondary">{message}</p>
      {previewDoc.signed_url && (
        <Button
          variant="primary"
          size="md"
          onClick={() =>
            triggerDownload(previewDoc.signed_url!, previewDoc.fname)
          }
        >
          <DownloadIcon className="w-4 h-4" />
          Download {previewDoc.fname}
        </Button>
      )}
    </div>
  );
}
