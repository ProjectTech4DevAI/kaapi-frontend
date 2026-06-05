export interface Document {
  id: string;
  fname: string;
  object_store_url: string;
  signed_url?: string;
  file_size?: number;
  inserted_at?: string;
  updated_at?: string;
}

export interface DocumentDetail {
  signed_url?: string;
  fname?: string;
}

export interface DocumentDetailEnvelope extends DocumentDetail {
  data?: DocumentDetail;
}

export interface Collection {
  id: string;
  name?: string;
  description?: string;
  knowledge_base_id?: string;
  inserted_at: string;
  updated_at: string;
  status?: string;
  job_id?: string;
  documents?: Document[];
}

export interface CsvPreviewProps {
  url: string;
}

export interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documents: Document[];
  previewDoc: Document | null;
  isLoading?: boolean;
  onSelectDocument: (doc: Document) => void;
}

export type DocumentPreviewKind =
  | "native"
  | "office"
  | "google"
  | "csv"
  | "unsupported";

export interface DocumentPreviewSource {
  kind: DocumentPreviewKind;
  url: string | null;
  ext?: string;
}

export interface PreviewPaneProps {
  previewDoc: Document | null;
  previewUrl: string | null;
  kind: DocumentPreviewKind;
  renderIframe: boolean;
  showLoader: boolean;
  frameTimedOut: boolean;
  onFrameLoad: () => void;
}

export interface DocumentSidebarProps {
  documents: Document[];
  previewDoc: Document | null;
  onSelectDocument: (doc: Document) => void;
}
