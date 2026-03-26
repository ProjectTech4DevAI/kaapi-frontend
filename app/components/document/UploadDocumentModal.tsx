import { UploadDocumentModalProps } from "@/app/lib/types/document";
import { useEffect } from "react";

export function UploadDocumentModal({
  selectedFile,
  isUploading,
  onFileSelect,
  onUpload,
  onClose,
}: UploadDocumentModalProps) {
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modalBackdrop"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modalContent"
        style={{
          backgroundColor: "hsl(0, 0%, 100%)",
          borderColor: "hsl(0, 0%, 85%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="border-b px-6 py-4 flex items-center justify-between"
          style={{ borderColor: "hsl(0, 0%, 85%)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "hsl(330, 3%, 19%)" }}
          >
            Upload New Document
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors"
            style={{ color: "hsl(330, 3%, 49%)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "hsl(0, 0%, 95%)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm mb-6" style={{ color: "hsl(330, 3%, 49%)" }}>
            Upload a document file. Supported formats: pdf, doc, txt and more.
          </p>

          {/* File Selection Area */}
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
            style={{
              borderColor: "hsl(0, 0%, 85%)",
            }}
          >
            <div className="space-y-4">
              <div style={{ color: "hsl(330, 3%, 49%)" }}>
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <label
                  htmlFor="document-file-upload"
                  className="px-6 py-2 rounded-md transition-colors inline-block text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: isUploading
                      ? "hsl(0, 0%, 95%)"
                      : "#171717",
                    color: isUploading
                      ? "hsl(330, 3%, 49%)"
                      : "hsl(0, 0%, 100%)",
                    cursor: isUploading ? "not-allowed" : "pointer",
                  }}
                >
                  Choose File
                </label>
                <input
                  id="document-file-upload"
                  type="file"
                  onChange={onFileSelect}
                  disabled={isUploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                />
              </div>
              {selectedFile && (
                <div className="text-sm" style={{ color: "hsl(330, 3%, 49%)" }}>
                  Selected:{" "}
                  <span
                    className="font-medium"
                    style={{ color: "hsl(330, 3%, 19%)" }}
                  >
                    {selectedFile.name}
                  </span>
                  <span className="ml-2">
                    ({Math.round(selectedFile.size / 1024)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Document Name Field (Read-only) */}
          {selectedFile && (
            <div className="mt-6">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "hsl(330, 3%, 19%)" }}
              >
                Document Name
              </label>
              <input
                type="text"
                value={selectedFile.name}
                readOnly
                className="w-full px-4 py-2 rounded-md border text-sm"
                style={{
                  borderColor: "hsl(0, 0%, 85%)",
                  backgroundColor: "hsl(0, 0%, 97%)",
                  color: "hsl(330, 3%, 49%)",
                  cursor: "not-allowed",
                }}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "hsl(330, 3%, 49%)" }}
              >
                The file will be uploaded with this name
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="border-t px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderColor: "hsl(0, 0%, 85%)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
            Cancel
          </button>
          <button
            onClick={onUpload}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                !selectedFile || isUploading ? "hsl(0, 0%, 95%)" : "#171717",
              color:
                !selectedFile || isUploading
                  ? "hsl(330, 3%, 49%)"
                  : "hsl(0, 0%, 100%)",
              cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = "#404040";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = "#171717";
              }
            }}
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>
    </div>
  );
}
