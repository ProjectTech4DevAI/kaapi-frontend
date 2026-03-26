import { useEffect, useState } from "react";
import { DocumentPreviewProps } from "@/app/lib/types/document";
import { formatDate } from "@/app/components/utils";

export function DocumentPreview({ document, isLoading }: DocumentPreviewProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoadError(false);
  }, [document?.id]);

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };

  const getMimeType = (filename: string) => {
    const ext = getFileExtension(filename);
    const mimeTypes: { [key: string]: string } = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      txt: "text/plain",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    return mimeTypes[ext] || "application/octet-stream";
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(0, 0%, 98%)]">
        <div className="text-center text-[hsl(330, 3%, 49%)]">
          <svg
            className="w-12 h-12 mx-auto mb-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(0, 0%, 98%)]">
        <div className="text-center text-[hsl(330, 3%, 49%)]">
          <svg
            className="mx-auto h-16 w-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-medium text-[hsl(330, 3%, 19%)]">
            No document selected
          </p>
          <p className="text-sm mt-2">
            Select a document from the list to preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-[hsl(0, 0%, 98%)]">
      <div className="max-w-4xl mx-auto">
        <div className="border rounded-lg p-6 mb-6 bg-[hsl(0, 0%, 100%)] border-[hsl(0, 0%, 85%)]">
          <h2 className="text-lg font-semibold mb-4 text-[hsl(330, 3%, 19%)]">
            {document.fname}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase font-semibold mb-1 text-[hsl(330, 3%, 49%)]">
                File Type
              </div>
              <div className="text-sm font-medium text-[hsl(330, 3%, 19%)]">
                {getFileExtension(document.fname).toUpperCase() || "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1 text-[hsl(330, 3%, 49%)]">
                File Size
              </div>
              <div className="text-sm font-medium text-[hsl(330, 3%, 19%)]">
                {document.file_size
                  ? document.file_size < 1024 * 1024
                    ? `${Math.round(document.file_size / 1024)} KB`
                    : `${(document.file_size / (1024 * 1024)).toFixed(2)} MB`
                  : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1 text-[hsl(330, 3%, 49%)]">
                Uploaded at
              </div>
              <div className="text-sm font-medium text-[hsl(330, 3%, 19%)]">
                {formatDate(document.inserted_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="border rounded-lg p-6 min-h-[600px] bg-[hsl(0, 0%, 100%)] border-[hsl(0, 0%, 85%)]">
          <h3 className="text-lg font-semibold mb-4 text-[hsl(330, 3%, 19%)]">
            Preview
          </h3>

          {/* Info message if signed_url is not available */}
          {!document.signed_url && document.object_store_url && (
            <div className="mb-4 p-3 rounded-lg bg-[hsl(48, 100%, 95%)] border border-[hsl(48, 100%, 80%)]">
              <p className="text-xs text-[hsl(48, 100%, 30%)]">
                ⚠️ Direct preview unavailable. The backend is not generating
                signed URLs. Please download the file to view it.
              </p>
            </div>
          )}

          {document.signed_url ? (
            <>
              {getMimeType(document.fname).startsWith("image/") ? (
                imageLoadError ? (
                  <div className="text-center p-8">
                    <p className="text-[hsl(330, 3%, 49%)]">
                      Failed to load image preview. Check console for details.
                    </p>
                  </div>
                ) : (
                  <img
                    src={document.signed_url}
                    alt={document.fname}
                    className="max-w-full h-auto rounded"
                    onError={() => {
                      setImageLoadError(true);
                    }}
                  />
                )
              ) : getMimeType(document.fname) === "application/pdf" ? (
                <iframe
                  src={document.signed_url}
                  className="w-full h-[700px] rounded border border-[hsl(0, 0%, 85%)]"
                  title={document.fname}
                />
              ) : getMimeType(document.fname).startsWith("text/") ? (
                <div className="border rounded p-4 min-h-[400px] bg-[hsl(0, 0%, 98%)] border-[hsl(0, 0%, 85%)] text-[hsl(330, 3%, 19%)]">
                  <p className="text-sm mb-2 text-[hsl(330, 3%, 49%)]">
                    Text file preview:
                  </p>
                  <iframe
                    src={document.signed_url}
                    className="w-full h-[500px] rounded border border-[hsl(0, 0%, 85%)] bg-white"
                    title={document.fname}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-[hsl(330, 3%, 49%)]">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mb-2">
                      Preview not available for this file type
                    </p>
                    <p className="text-xs mb-4">
                      Supported types: Images, PDFs, Text files
                    </p>
                    <p className="text-xs mb-4 text-[hsl(330, 3%, 70%)]">
                      File type: {getMimeType(document.fname)}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[400px] text-[hsl(330, 3%, 49%)]">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="mb-2">No preview available</p>
                <p className="text-xs mb-4">
                  Signed URL not generated by backend
                </p>
              </div>
            </div>
          )}

          {/* Download button */}
          <div className="mt-6 text-center">
            {(document.signed_url || document.object_store_url) && (
              <a
                href={document.signed_url || document.object_store_url}
                download={document.fname}
                className="inline-block px-6 py-2 rounded-md text-sm font-medium transition-colors bg-[#171717] text-[hsl(0, 0%, 100%)]"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#404040")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#171717")
                }
              >
                Download {document.fname}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
