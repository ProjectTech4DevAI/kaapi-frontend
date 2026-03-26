import { APIKey } from "@/app/lib/types/credentials";
import { KaapiDocument } from "@/app/lib/types/document";
import { formatDate } from "@/app/components/utils";

interface DocumentListingProps {
  documents: KaapiDocument[];
  selectedDocument: KaapiDocument | null;
  onSelect: (document: KaapiDocument) => void;
  onDelete: (documentId: string) => void;
  onUploadNew: () => void;
  isLoading: boolean;
  error: string | null;
  apiKey: APIKey | null;
  totalPages: number | null;
  hasNextPage: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function DocumentListing({
  documents,
  selectedDocument,
  onSelect,
  onDelete,
  onUploadNew,
  isLoading,
  error,
  apiKey,
  totalPages,
  hasNextPage,
  currentPage,
  onPageChange,
}: DocumentListingProps) {
  return (
    <div className="h-full flex flex-col">
      <div
        className="p-4 border-b"
        style={{
          backgroundColor: "hsl(0, 0%, 100%)",
          borderColor: "hsl(0, 0%, 85%)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2
            className="text-lg font-semibold"
            style={{ color: "hsl(330, 3%, 19%)" }}
          >
            Your Documents
          </h2>
          <button
            onClick={onUploadNew}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: "#171717",
              color: "hsl(0, 0%, 100%)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#404040")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#171717")
            }
          >
            + Upload
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ backgroundColor: "hsl(0, 0%, 98%)" }}
      >
        {/* Loading State */}
        {isLoading && documents.length === 0 ? (
          <div
            className="text-center py-12"
            style={{ color: "hsl(330, 3%, 49%)" }}
          >
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
            <p className="text-sm">Loading documents...</p>
          </div>
        ) : !apiKey ? (
          <div
            className="text-center py-12"
            style={{ color: "hsl(330, 3%, 49%)" }}
          >
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <p
              className="font-medium mb-2"
              style={{ color: "hsl(330, 3%, 19%)" }}
            >
              No API key found
            </p>
            <p className="text-sm mb-4">
              Please add an API key in the Keystore
            </p>
            <a
              href="/keystore"
              className="inline-block px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: "#171717",
                color: "hsl(0, 0%, 100%)",
              }}
            >
              Go to Keystore
            </a>
          </div>
        ) : error ? (
          <div
            className="border rounded-lg p-6"
            style={{
              backgroundColor: "hsl(8, 86%, 95%)",
              borderColor: "hsl(8, 86%, 80%)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "hsl(8, 86%, 40%)" }}
            >
              Error: {error}
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div
            className="text-center py-12"
            style={{ color: "hsl(330, 3%, 49%)" }}
          >
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p
              className="font-medium mb-2"
              style={{ color: "hsl(330, 3%, 19%)" }}
            >
              No documents found
            </p>
            <p className="text-sm mb-4">
              Upload your first document to get started
            </p>
            <button
              onClick={onUploadNew}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: "#171717",
                color: "hsl(0, 0%, 100%)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#404040")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#171717")
              }
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelect(doc)}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedDocument?.id === doc.id ? "ring-2 ring-offset-1" : ""
                }`}
                style={{
                  backgroundColor:
                    selectedDocument?.id === doc.id
                      ? "hsl(202, 100%, 95%)"
                      : "hsl(0, 0%, 100%)",
                  borderColor:
                    selectedDocument?.id === doc.id
                      ? "hsl(202, 100%, 50%)"
                      : "hsl(0, 0%, 85%)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-5 h-5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{ color: "#171717" }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <h3
                        className="text-sm font-semibold truncate"
                        style={{ color: "hsl(330, 3%, 19%)" }}
                      >
                        {doc.fname}
                      </h3>
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "hsl(330, 3%, 49%)" }}
                    >
                      <div>{formatDate(doc.inserted_at)}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc.id);
                    }}
                    className="p-1.5 rounded-md transition-colors flex-shrink-0"
                    style={{
                      borderWidth: "1px",
                      borderColor: "hsl(8, 86%, 80%)",
                      backgroundColor: "hsl(0, 0%, 100%)",
                      color: "hsl(8, 86%, 40%)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "hsl(8, 86%, 95%)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "hsl(0, 0%, 100%)";
                    }}
                    title="Delete Document"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination — outside the scrollable area so it always stays visible */}
      {!isLoading &&
        !error &&
        apiKey &&
        (currentPage > 1 ||
          hasNextPage ||
          (totalPages !== null && totalPages > 1)) && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{
              backgroundColor: "hsl(0, 0%, 100%)",
              borderColor: "hsl(0, 0%, 85%)",
              flexShrink: 0,
            }}
          >
            <p className="text-sm" style={{ color: "hsl(330, 3%, 49%)" }}>
              {totalPages !== null
                ? `${currentPage} / ${totalPages}`
                : `Page ${currentPage}`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor:
                    currentPage === 1 ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 100%)",
                  color:
                    currentPage === 1
                      ? "hsl(330, 3%, 70%)"
                      : "hsl(330, 3%, 19%)",
                  borderWidth: "1px",
                  borderColor: "hsl(0, 0%, 85%)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={
                  totalPages !== null ? currentPage >= totalPages : !hasNextPage
                }
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: (
                    totalPages !== null
                      ? currentPage >= totalPages
                      : !hasNextPage
                  )
                    ? "hsl(0, 0%, 95%)"
                    : "hsl(0, 0%, 100%)",
                  color: (
                    totalPages !== null
                      ? currentPage >= totalPages
                      : !hasNextPage
                  )
                    ? "hsl(330, 3%, 70%)"
                    : "hsl(330, 3%, 19%)",
                  borderWidth: "1px",
                  borderColor: "hsl(0, 0%, 85%)",
                  cursor: (
                    totalPages !== null
                      ? currentPage >= totalPages
                      : !hasNextPage
                  )
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
