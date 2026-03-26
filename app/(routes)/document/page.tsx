"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import Sidebar from "@/app/components/Sidebar";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import { DocumentListing } from "@/app/components/document/DocumentListing";
import { KaapiDocument } from "@/app/lib/types/document";
import { DocumentPreview } from "@/app/components/document/DocumentPreview";
import { UploadDocumentModal } from "@/app/components/document/UploadDocumentModal";

export default function DocumentPage() {
  const toast = useToast();
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<KaapiDocument[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<KaapiDocument | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeKey: apiKey } = useAuth();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Fetch documents from backend when API key is available
  useEffect(() => {
    if (apiKey) {
      setCurrentPage(1);
      fetchDocuments(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const fetchDocuments = async (page: number = currentPage) => {
    if (!apiKey) {
      setError("No API key found. Please add an API key in the Keystore.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const skip = (page - 1) * itemsPerPage;
      const params = new URLSearchParams({
        skip: String(skip),
        limit: String(itemsPerPage),
      });

      const data = await apiFetch<
        | KaapiDocument[]
        | { data?: KaapiDocument[]; total?: number; count?: number }
      >(`/api/document?${params.toString()}`, apiKey.key);
      const documentList = Array.isArray(data) ? data : data.data || [];

      // Derive total count — use backend value when available, otherwise
      // only track whether there might be a next page (avoid ever-growing inference)
      const backendTotal = Array.isArray(data)
        ? null
        : (data.total ?? data.count ?? null);
      if (backendTotal !== null) {
        setTotalCount(backendTotal);
        setHasNextPage(false);
      } else {
        setTotalCount(null);
        setHasNextPage(documentList.length === itemsPerPage);
      }

      // Load file sizes from localStorage
      const fileSizeMap = JSON.parse(
        localStorage.getItem("document_file_sizes") || "{}",
      );
      const documentsWithSize = documentList.map((doc: KaapiDocument) => ({
        ...doc,
        file_size: fileSizeMap[doc.id] || doc.file_size,
      }));

      setDocuments(documentsWithSize);
    } catch (err: unknown) {
      console.error("Failed to fetch documents:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch documents",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!apiKey || !selectedFile) return;

    setIsUploading(true);

    try {
      // Prepare FormData for upload
      const formData = new FormData();
      formData.append("src", selectedFile);

      // Upload to backend
      const data = await apiFetch<{ data?: { id?: string } }>(
        "/api/document",
        apiKey.key,
        { method: "POST", body: formData },
      );
      // Store file size in localStorage for the uploaded document
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

      // Refresh documents list - go to page 1 to show the newly uploaded document
      setCurrentPage(1);
      await fetchDocuments(1);

      // Close modal
      setIsModalOpen(false);

      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        `Failed to upload document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!apiKey) {
      toast.error("No API key found");
      return;
    }

    // Using browser confirm for now - could be replaced with a custom modal later
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      await apiFetch(`/api/document/${documentId}`, apiKey.key, {
        method: "DELETE",
      });

      // Clear selected document if it was deleted
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }

      // Refresh documents list
      await fetchDocuments(currentPage);
      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        `Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const totalPages =
    totalCount !== null ? Math.ceil(totalCount / itemsPerPage) : null;

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setDocuments([]);
    fetchDocuments(pageNumber);
  };

  // Fetch full document details including signed_url
  const handleSelectDocument = async (doc: KaapiDocument) => {
    if (!apiKey) return;

    setIsLoadingDocument(true);
    try {
      const data = await apiFetch<{ data?: KaapiDocument } | KaapiDocument>(
        `/api/document/${doc.id}`,
        apiKey.key,
      );
      const documentDetails =
        !Array.isArray(data) && "data" in data && data.data
          ? data.data
          : (data as KaapiDocument);

      // Load file size from localStorage
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
      // Fallback to the basic document info
      setSelectedDocument(doc);
    } finally {
      setIsLoadingDocument(false);
    }
  };

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: "#fafafa" }}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/document" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section with Collapse Button */}
          <div
            className="border-b px-6 py-4"
            style={{
              backgroundColor: "hsl(0, 0%, 100%)",
              borderColor: "hsl(0, 0%, 85%)",
            }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md transition-colors flex-shrink-0"
                style={{
                  borderWidth: "1px",
                  borderColor: "hsl(0, 0%, 85%)",
                  backgroundColor: "hsl(0, 0%, 100%)",
                  color: "hsl(330, 3%, 19%)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "hsl(0, 0%, 95%)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "hsl(0, 0%, 100%)")
                }
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarCollapsed ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  )}
                </svg>
              </button>
              <div>
                <h1
                  className="text-2xl font-semibold"
                  style={{ color: "hsl(330, 3%, 19%)" }}
                >
                  Documents
                </h1>
                <p
                  className="text-sm mt-1"
                  style={{ color: "hsl(330, 3%, 49%)" }}
                >
                  Manage your uploaded documents
                </p>
              </div>
            </div>
          </div>

          {/* Content Area - Split View */}
          <div
            className="flex-1 overflow-hidden flex"
            style={{ backgroundColor: "#fafafa" }}
          >
            {/* Left Side: Document List */}
            <div
              className="w-1/3 border-r overflow-y-auto"
              style={{ borderColor: "hsl(0, 0%, 85%)" }}
            >
              <DocumentListing
                documents={documents}
                selectedDocument={selectedDocument}
                onSelect={handleSelectDocument}
                onDelete={handleDeleteDocument}
                onUploadNew={() => setIsModalOpen(true)}
                isLoading={isLoading}
                error={error}
                apiKey={apiKey}
                totalPages={totalPages}
                hasNextPage={hasNextPage}
                currentPage={currentPage}
                onPageChange={paginate}
              />
            </div>

            {/* Right Side: Document Preview */}
            <div className="flex-1 overflow-y-auto">
              <DocumentPreview
                document={selectedDocument}
                isLoading={isLoadingDocument}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {isModalOpen && (
        <UploadDocumentModal
          selectedFile={selectedFile}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFile(null);
          }}
        />
      )}
    </div>
  );
}
