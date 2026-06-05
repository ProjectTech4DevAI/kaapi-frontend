import { Document, DocumentPreviewSource } from "@/app/lib/types/document";

const NATIVE_EXTS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "txt",
  "md",
  "html",
  "htm",
  "json",
]);

const OFFICE_EXTS = new Set([
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
]);

const GOOGLE_EXTS = new Set(["tsv"]);

const CSV_EXTS = new Set(["csv"]);

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

export function getDocumentPreviewSource(
  doc: Document | null,
): DocumentPreviewSource {
  if (!doc?.signed_url) return { kind: "unsupported", url: null };

  const ext = getExtension(doc.fname || "");

  if (!ext) return { kind: "unsupported", url: doc.signed_url, ext };

  if (CSV_EXTS.has(ext)) {
    // Route through our same-origin proxy — signed URLs typically can't be
    // fetched directly from the browser (CORS + Content-Disposition: attachment).
    return { kind: "csv", url: `/api/document/${doc.id}/preview`, ext };
  }

  if (NATIVE_EXTS.has(ext)) {
    return { kind: "native", url: doc.signed_url, ext };
  }

  if (OFFICE_EXTS.has(ext)) {
    return {
      kind: "office",
      url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.signed_url)}`,
      ext,
    };
  }

  if (GOOGLE_EXTS.has(ext)) {
    return {
      kind: "google",
      url: `https://docs.google.com/gview?url=${encodeURIComponent(doc.signed_url)}&embedded=true`,
      ext,
    };
  }

  return { kind: "unsupported", url: doc.signed_url, ext };
}
