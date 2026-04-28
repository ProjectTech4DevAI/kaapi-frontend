"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { useToast } from "@/app/components/Toast";
import { usePaginatedList, useInfiniteScroll } from "@/app/hooks";
import {
  apiFetch,
  uploadWithProgress,
  type UploadPhase,
} from "@/app/lib/apiClient";
import { DocumentListing } from "@/app/components/document/DocumentListing";
import { DocumentPreview } from "@/app/components/document/DocumentPreview";
import { UploadDocumentModal } from "@/app/components/document/UploadDocumentModal";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_MB,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("uploading");
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
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      toast.error(
        `File size exceeds ${MAX_DOCUMENT_SIZE_MB} MB limit. Please select a smaller file within ${MAX_DOCUMENT_SIZE_MB} MB.`,
      );
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!isAuthenticated || !selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadPhase("uploading");

    try {
      const formData = new FormData();
      formData.append("src", selectedFile);

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
      const data = await promise;
      if (selectedFile && data.data?.id) {
        const fileSizeMap = JSON.parse(
          localStorage.getItem("document_file_sizes") || "{}",
        );
        fileSizeMap[data.data.id] = selectedFile.size;
        localStorage.setItem(
          "document_file_sizes",
          JSON.stringify(fileSizeMap),
        );
      }

      refetch();
      setSelectedFile(null);
      setIsModalOpen(false);

      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        `Failed to upload document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsUploading(false);
      abortUploadRef.current = null;
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!isAuthenticated) {
      toast.error("Please log in to continue");
      return;
    }

    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

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
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/document" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Documents"
            subtitle="Manage your uploaded documents"
          />

          <div className="flex-1 overflow-hidden flex bg-bg-secondary">
            <div className="w-1/3 border-r border-r-status-default-border overflow-hidden">
              <DocumentListing
                documents={documents}
                selectedDocument={selectedDocument}
                onSelect={handleSelectDocument}
                onDelete={handleDeleteDocument}
                onUploadNew={() => setIsModalOpen(true)}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                error={error}
                scrollRef={scrollRef}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <DocumentPreview
                document={selectedDocument}
                isLoading={isLoadingDocument}
              />
            </div>
          </div>
        </div>
      </div>

      <UploadDocumentModal
        open={isModalOpen}
        selectedFile={selectedFile}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadPhase={uploadPhase}
        onFileSelect={handleFileSelect}
        onUpload={handleUpload}
        onClose={() => {
          abortUploadRef.current?.();
          setIsModalOpen(false);
          setSelectedFile(null);
          setUploadProgress(0);
          setUploadPhase("uploading");
        }}
      />
    </div>
  );
}
