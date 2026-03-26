export interface KaapiDocument {
  id: string;
  fname: string;
  object_store_url: string;
  signed_url?: string;
  file_size?: number;
  inserted_at?: string;
  updated_at?: string;
}

export interface DocumentPreviewProps {
  document: KaapiDocument | null;
  isLoading: boolean;
}

export interface UploadDocumentModalProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClose: () => void;
}
