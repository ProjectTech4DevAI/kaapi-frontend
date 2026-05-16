"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { useToast } from "@/app/components/ui/Toast";
import { usePaginatedList, useInfiniteScroll } from "@/app/hooks";
import {
  apiFetch,
  uploadWithProgress,
  type UploadPhase,
} from "@/app/lib/apiClient";
import { DocumentListing } from "@/app/components/document/DocumentListing";
import { DocumentPreview } from "@/app/components/document/DocumentPreview";
import { UploadDocumentModal } from "@/app/components/document/UploadDocumentModal";
import DeleteDocumentModal from "@/app/components/document/DeleteDocumentModal";
import Modal from "@/app/components/ui/Modal";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_MB,
  MAX_DOCUMENT_UPLOAD_BATCH,
} from "@/app/lib/constants";
import { Document } from "@/app/lib/types/document";

export default function DocumentPage() {
  const toast = useToast();
  const { sidebarCollapsed } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("uploading");
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );
  const abortUploadRef = useRef<(() => void) | null>(null);
  const { activeKey: apiKey, isAuthenticated } = useAuth();

  const {
    items: documents,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  } = usePaginatedList<Document>({
    endpoint: "/api/document",
    limit: DEFAULT_PAGE_LIMIT,
  });

  const scrollRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_DOCUMENT_UPLOAD_BATCH - selectedFiles.length;
    if (remaining <= 0) return;

    const accepted: File[] = [];
    let oversizedCount = 0;
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        oversizedCount += 1;
        continue;
      }
      accepted.push(file);
    }

    if (oversizedCount > 0) {
      toast.error(
        `${oversizedCount} file${oversizedCount > 1 ? "s" : ""} exceed the ${MAX_DOCUMENT_SIZE_MB} MB limit and were skipped.`,
      );
    }
    if (files.length > remaining) {
      toast.warning(
        `You can upload up to ${MAX_DOCUMENT_UPLOAD_BATCH} documents at a time.`,
      );
    }

    if (accepted.length > 0) {
      setSelectedFiles((prev) => [...prev, ...accepted]);
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadOneFile = async (file: File): Promise<boolean> => {
    setUploadProgress(0);
    setUploadPhase("uploading");

    const formData = new FormData();
    formData.append("src", file);

    const { promise, abort } = uploadWithProgress<{ data?: { id: string } }>(
      "/api/document",
      apiKey?.key ?? "",
      formData,
      (percent, phase) => {
        setUploadProgress(percent);
        setUploadPhase(phase);
      },
    );
    abortUploadRef.current = abort;

    try {
      const data = await promise;
      if (data.data?.id) {
        const fileSizeMap = JSON.parse(
          localStorage.getItem("document_file_sizes") || "{}",
        );
        fileSizeMap[data.data.id] = file.size;
        localStorage.setItem(
          "document_file_sizes",
          JSON.stringify(fileSizeMap),
        );
      }
      return true;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        `Failed to upload "${file.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    } finally {
      abortUploadRef.current = null;
    }
  };

  const handleUpload = async () => {
    if (!isAuthenticated || selectedFiles.length === 0) return;

    setIsUploading(true);
    setCurrentUploadIndex(0);

    let successCount = 0;
    for (let i = 0; i < selectedFiles.length; i += 1) {
      setCurrentUploadIndex(i);
      const ok = await uploadOneFile(selectedFiles[i]);
      if (ok) successCount += 1;
    }

    refetch();
    setSelectedFiles([]);
    setIsModalOpen(false);
    setIsUploading(false);
    setCurrentUploadIndex(0);

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? "Document uploaded successfully!"
          : `${successCount} documents uploaded successfully!`,
      );
    }
  };

  const handleRequestDelete = (documentId: string) => {
    if (!isAuthenticated) {
      toast.error("Please log in to continue");
      return;
    }
    const doc = documents.find((d) => d.id === documentId);
    if (doc) setDocumentToDelete(doc);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;
    const documentId = documentToDelete.id;
    setDocumentToDelete(null);

    try {
      await apiFetch(`/api/document/${documentId}`, apiKey?.key ?? "", {
        method: "DELETE",
      });

      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }

      refetch();
      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        `Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleSelectDocument = async (doc: Document) => {
    if (!isAuthenticated) return;

    setIsLoadingDocument(true);
    try {
      const data = await apiFetch<{ data?: Document }>(
        `/api/document/${doc.id}`,
        apiKey?.key ?? "",
      );
      const documentDetails: Document =
        data.data ?? (data as unknown as Document);

      const fileSizeMap = JSON.parse(
        localStorage.getItem("document_file_sizes") || "{}",
      );
      const docWithSize = {
        ...documentDetails,
        file_size: fileSizeMap[documentDetails.id] || documentDetails.file_size,
      };

      setSelectedDocument(docWithSize);
    } catch (err) {
      console.error("Failed to fetch document details:", err);
      toast.error("Failed to load document preview");
      setSelectedDocument(doc);
    } finally {
      setIsLoadingDocument(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-primary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/document" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Documents"
            subtitle="Manage your uploaded documents"
          />

          <div className="flex-1 overflow-hidden flex bg-bg-primary">
            <div className="w-full lg:w-1/3 lg:border-r border-border overflow-hidden">
              <DocumentListing
                documents={documents}
                selectedDocument={selectedDocument}
                onSelect={handleSelectDocument}
                onDelete={handleRequestDelete}
                onUploadNew={() => setIsModalOpen(true)}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                error={error}
                scrollRef={scrollRef}
              />
            </div>

            <div className="hidden lg:block flex-1 overflow-y-auto">
              <DocumentPreview
                document={selectedDocument}
                isLoading={isLoadingDocument}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/tablet — preview rendered in a modal */}
      <div className="lg:hidden">
        <Modal
          open={!!selectedDocument || isLoadingDocument}
          onClose={() => setSelectedDocument(null)}
          title={selectedDocument?.fname ?? "Document Preview"}
          maxWidth="max-w-3xl"
          maxHeight="max-h-[90vh]"
        >
          <div className="h-[80vh]">
            <DocumentPreview
              document={selectedDocument}
              isLoading={isLoadingDocument}
            />
          </div>
        </Modal>
      </div>

      <UploadDocumentModal
        open={isModalOpen}
        selectedFiles={selectedFiles}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadPhase={uploadPhase}
        currentUploadIndex={currentUploadIndex}
        onFileSelect={handleFileSelect}
        onRemoveFile={handleRemoveSelectedFile}
        onClearFiles={() => setSelectedFiles([])}
        onUpload={handleUpload}
        onClose={() => {
          abortUploadRef.current?.();
          setIsModalOpen(false);
          setSelectedFiles([]);
          setUploadProgress(0);
          setUploadPhase("uploading");
          setCurrentUploadIndex(0);
        }}
      />

      <DeleteDocumentModal
        open={!!documentToDelete}
        fileName={documentToDelete?.fname}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
