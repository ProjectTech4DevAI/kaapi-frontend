"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'
import { APIKey, STORAGE_KEY } from '../keystore/page';
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/Toast';
import { formatDate } from '../components/utils';

// Backend response interface
export interface Document {
  id: string;  // UUID from backend
  fname: string;  // Filename from backend
  object_store_url: string;
  signed_url?: string;  // Signed URL for accessing the document
  file_size?: number;  // File size in bytes (stored from client upload)
  inserted_at?: string;
  updated_at?: string;
}

export default function DocumentPage() {
  const router = useRouter();
  const toast = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<APIKey | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load API key from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        if (keys.length > 0) {
          setApiKey(keys[0]);
        }
      } catch (e) {
        console.error('Failed to load API key:', e);
      }
    }
  }, []);

  // Fetch documents from backend when API key is available
  useEffect(() => {
    if (apiKey) {
      fetchDocuments();
    }
  }, [apiKey]);

  const fetchDocuments = async () => {
    if (!apiKey) {
      setError('No API key found. Please add an API key in the Keystore.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/document', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey.key,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch documents: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched documents:', data); // Debug log
      const documentList = Array.isArray(data) ? data : (data.data || []);

      // Load file sizes from localStorage
      const fileSizeMap = JSON.parse(localStorage.getItem('document_file_sizes') || '{}');
      const documentsWithSize = documentList.map((doc: Document) => ({
        ...doc,
        file_size: fileSizeMap[doc.id] || doc.file_size
      }));

      console.log('Document list:', documentsWithSize); // Debug log
      setDocuments(documentsWithSize);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError(err.message || 'Failed to fetch documents');
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
      formData.append('src', selectedFile);

      // Upload to backend
      const response = await fetch('/api/document', {
        method: 'POST',
        body: formData,
        headers: {
          'X-API-KEY': apiKey.key,
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Document uploaded successfully:', data);

      // Store file size in localStorage for the uploaded document
      if (selectedFile && data.data?.id) {
        const fileSizeMap = JSON.parse(localStorage.getItem('document_file_sizes') || '{}');
        fileSizeMap[data.data.id] = selectedFile.size;
        localStorage.setItem('document_file_sizes', JSON.stringify(fileSizeMap));
      }

      // Refresh documents list
      await fetchDocuments();

      // Reset form
      setSelectedFile(null);

      // Close modal
      setIsModalOpen(false);

      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!apiKey) {
      toast.error('No API key found');
      return;
    }

    // Using browser confirm for now - could be replaced with a custom modal later
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/document/${documentId}`, {
        method: 'DELETE',
        headers: {
          'X-API-KEY': apiKey.key,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Delete failed with status ${response.status}`);
      }

      // Clear selected document if it was deleted
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }

      // Refresh documents list
      await fetchDocuments();
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocuments = documents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(documents.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Fetch full document details including signed_url
  const handleSelectDocument = async (doc: Document) => {
    if (!apiKey) return;

    setIsLoadingDocument(true);
    try {
      const response = await fetch(`/api/document/${doc.id}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey.key,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document details');
      }

      const data = await response.json();
      const documentDetails = data.data || data;

      // Load file size from localStorage
      const fileSizeMap = JSON.parse(localStorage.getItem('document_file_sizes') || '{}');
      const docWithSize = {
        ...documentDetails,
        file_size: fileSizeMap[documentDetails.id] || documentDetails.file_size
      };

      setSelectedDocument(docWithSize);
    } catch (err) {
      console.error('Failed to fetch document details:', err);
      toast.error('Failed to load document preview');
      // Fallback to the basic document info
      setSelectedDocument(doc);
    } finally {
      setIsLoadingDocument(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: '#fafafa' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/document" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section with Collapse Button */}
          <div className="border-b px-6 py-4" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md transition-colors flex-shrink-0"
                style={{
                  borderWidth: '1px',
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
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
                <h1 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Documents</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Manage your uploaded documents</p>
              </div>
            </div>
          </div>

          {/* Content Area - Split View */}
          <div className="flex-1 overflow-hidden flex" style={{ backgroundColor: '#fafafa' }}>
            {/* Left Side: Document List */}
            <div className="w-2/5 border-r overflow-y-auto" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <DocumentListing
                documents={currentDocuments}
                selectedDocument={selectedDocument}
                onSelect={handleSelectDocument}
                onDelete={handleDeleteDocument}
                onUploadNew={() => setIsModalOpen(true)}
                isLoading={isLoading}
                error={error}
                apiKey={apiKey}
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={paginate}
              />
            </div>

            {/* Right Side: Document Preview */}
            <div className="flex-1 overflow-y-auto">
              <DocumentPreview document={selectedDocument} isLoading={isLoadingDocument} />
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

// ============ DOCUMENT LISTING COMPONENT ============
interface DocumentListingProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelect: (document: Document) => void;
  onDelete: (documentId: string) => void;
  onUploadNew: () => void;
  isLoading: boolean;
  error: string | null;
  apiKey: APIKey | null;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function DocumentListing({
  documents,
  selectedDocument,
  onSelect,
  onDelete,
  onUploadNew,
  isLoading,
  error,
  apiKey,
  totalPages,
  currentPage,
  onPageChange,
}: DocumentListingProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
            Your Documents
          </h2>
          <button
            onClick={onUploadNew}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: '#171717',
              color: 'hsl(0, 0%, 100%)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#404040'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
          >
            + Upload
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}>
        {/* Loading State */}
        {isLoading && documents.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'hsl(330, 3%, 49%)' }}>
            <svg className="w-12 h-12 mx-auto mb-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-sm">Loading documents...</p>
          </div>
        ) : !apiKey ? (
          <div className="text-center py-12" style={{ color: 'hsl(330, 3%, 49%)' }}>
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <p className="font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>No API key found</p>
            <p className="text-sm mb-4">Please add an API key in the Keystore</p>
            <a
              href="/keystore"
              className="inline-block px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#171717',
                color: 'hsl(0, 0%, 100%)'
              }}
            >
              Go to Keystore
            </a>
          </div>
        ) : error ? (
          <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(8, 86%, 95%)', borderColor: 'hsl(8, 86%, 80%)' }}>
            <p className="text-sm font-medium" style={{ color: 'hsl(8, 86%, 40%)' }}>
              Error: {error}
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'hsl(330, 3%, 49%)' }}>
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
            <p className="font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>No documents found</p>
            <p className="text-sm mb-4">Upload your first document to get started</p>
            <button
              onClick={onUploadNew}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#171717',
                color: 'hsl(0, 0%, 100%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#404040'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
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
                  selectedDocument?.id === doc.id
                    ? 'ring-2 ring-offset-1'
                    : ''
                }`}
                style={{
                  backgroundColor: selectedDocument?.id === doc.id
                    ? 'hsl(202, 100%, 95%)'
                    : 'hsl(0, 0%, 100%)',
                  borderColor: selectedDocument?.id === doc.id
                    ? 'hsl(202, 100%, 50%)'
                    : 'hsl(0, 0%, 85%)'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#171717' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'hsl(330, 3%, 19%)' }}>
                        {doc.fname}
                      </h3>
                    </div>
                    <div className="text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
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
                      borderWidth: '1px',
                      borderColor: 'hsl(8, 86%, 80%)',
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      color: 'hsl(8, 86%, 40%)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(8, 86%, 95%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)';
                    }}
                    title="Delete Document"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && apiKey && documents.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
            <p className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: currentPage === 1 ? 'hsl(0, 0%, 95%)' : 'hsl(0, 0%, 100%)',
                  color: currentPage === 1 ? 'hsl(330, 3%, 70%)' : 'hsl(330, 3%, 19%)',
                  borderWidth: '1px',
                  borderColor: 'hsl(0, 0%, 85%)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: currentPage === totalPages ? 'hsl(0, 0%, 95%)' : 'hsl(0, 0%, 100%)',
                  color: currentPage === totalPages ? 'hsl(330, 3%, 70%)' : 'hsl(330, 3%, 19%)',
                  borderWidth: '1px',
                  borderColor: 'hsl(0, 0%, 85%)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ DOCUMENT PREVIEW COMPONENT ============
interface DocumentPreviewProps {
  document: Document | null;
  isLoading: boolean;
}

function DocumentPreview({ document, isLoading }: DocumentPreviewProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  // Reset error state when document changes
  useEffect(() => {
    setImageLoadError(false);
  }, [document?.id]);

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

 // const getFileSize = 

  const getMimeType = (filename: string) => {
    const ext = getFileExtension(filename);
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}>
        <div className="text-center" style={{ color: 'hsl(330, 3%, 49%)' }}>
          <svg className="w-12 h-12 mx-auto mb-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}>
        <div className="text-center" style={{ color: 'hsl(330, 3%, 49%)' }}>
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
          <p className="text-lg font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>No document selected</p>
          <p className="text-sm mt-2">Select a document from the list to preview</p>
        </div>
      </div>
    );
  }

  console.log('Document preview:', document); // Debug log

  return (
    <div className="h-full overflow-y-auto p-8" style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="border rounded-lg p-6 mb-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>
            {document.fname}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>File Type</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{getFileExtension(document.fname).toUpperCase() || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>File Size</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>
                {document.file_size
                  ? document.file_size < 1024 * 1024
                    ? `${Math.round(document.file_size / 1024)} KB`
                    : `${(document.file_size / (1024 * 1024)).toFixed(2)} MB`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Uploaded at</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{formatDate(document.inserted_at)}</div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="border rounded-lg p-6 min-h-[600px]" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Preview</h3>

          {/* Info message if signed_url is not available */}
          {!document.signed_url && document.object_store_url && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'hsl(48, 100%, 95%)', borderColor: 'hsl(48, 100%, 80%)', borderWidth: '1px' }}>
              <p className="text-xs" style={{ color: 'hsl(48, 100%, 30%)' }}>
                ⚠️ Direct preview unavailable. The backend is not generating signed URLs. Please download the file to view it.
              </p>
            </div>
          )}

          {document.signed_url ? (
            <>
              {getMimeType(document.fname).startsWith('image/') ? (
                imageLoadError ? (
                  <div className="text-center p-8">
                    <p style={{ color: 'hsl(330, 3%, 49%)' }}>
                      Failed to load image preview. Check console for details.
                    </p>
                  </div>
                ) : (
                  <img
                    src={document.signed_url}
                    alt={document.fname}
                    className="max-w-full h-auto rounded"
                    onError={() => {
                      console.error('Failed to load image:', document.signed_url);
                      setImageLoadError(true);
                    }}
                    onLoad={() => console.log('Image loaded successfully')}
                  />
                )
              ) : getMimeType(document.fname) === 'application/pdf' ? (
                <iframe
                  src={document.signed_url}
                  className="w-full h-[700px] rounded border"
                  title={document.fname}
                  style={{ borderColor: 'hsl(0, 0%, 85%)' }}
                  onLoad={() => console.log('PDF iframe loaded successfully')}
                />
              ) : getMimeType(document.fname).startsWith('text/') ? (
                <div className="border rounded p-4 min-h-[400px]" style={{ backgroundColor: 'hsl(0, 0%, 98%)', borderColor: 'hsl(0, 0%, 85%)', color: 'hsl(330, 3%, 19%)' }}>
                  <p className="text-sm mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Text file preview:</p>
                  <iframe
                    src={document.signed_url}
                    className="w-full h-[500px] rounded border"
                    title={document.fname}
                    style={{ borderColor: 'hsl(0, 0%, 85%)', backgroundColor: 'white' }}
                    onLoad={() => console.log('Text file loaded successfully')}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px]" style={{ color: 'hsl(330, 3%, 49%)' }}>
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
                    <p className="mb-2">Preview not available for this file type</p>
                    <p className="text-xs mb-4">Supported types: Images, PDFs, Text files</p>
                    <p className="text-xs mb-4" style={{ color: 'hsl(330, 3%, 70%)' }}>File type: {getMimeType(document.fname)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[400px]" style={{ color: 'hsl(330, 3%, 49%)' }}>
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
                <p className="text-xs mb-4">Signed URL not generated by backend</p>
              </div>
            </div>
          )}

          {/* Download button */}
          <div className="mt-6 text-center">
            {(document.signed_url || document.object_store_url) && (
              <a
                href={document.signed_url || document.object_store_url}
                download={document.fname}
                className="inline-block px-6 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#171717',
                  color: 'hsl(0, 0%, 100%)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#404040'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
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

// ============ UPLOAD DOCUMENT MODAL ============
export interface UploadDocumentModalProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClose: () => void;
}

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
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modalBackdrop"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modalContent"
        style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Upload New Document</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'hsl(330, 3%, 49%)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm mb-6" style={{ color: 'hsl(330, 3%, 49%)' }}>
            Upload a document file. Supported formats: pdf, doc, txt and more.
          </p>

          {/* File Selection Area */}
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
            style={{
              borderColor: 'hsl(0, 0%, 85%)',
            }}
          >
            <div className="space-y-4">
              <div style={{ color: 'hsl(330, 3%, 49%)' }}>
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
                    backgroundColor: isUploading ? 'hsl(0, 0%, 95%)' : '#171717',
                    color: isUploading ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
                    cursor: isUploading ? 'not-allowed' : 'pointer'
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
                <div className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                  Selected: <span className="font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{selectedFile.name}</span>
                  <span className="ml-2">({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Document Name Field (Read-only) */}
          {selectedFile && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Document Name
              </label>
              <input
                type="text"
                value={selectedFile.name}
                readOnly
                className="w-full px-4 py-2 rounded-md border text-sm"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 97%)',
                  color: 'hsl(330, 3%, 49%)',
                  cursor: 'not-allowed'
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                The file will be uploaded with this name
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-3" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'hsl(0, 0%, 85%)',
              backgroundColor: 'hsl(0, 0%, 100%)',
              color: 'hsl(330, 3%, 19%)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
          >
            Cancel
          </button>
          <button
            onClick={onUpload}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: (!selectedFile || isUploading) ? 'hsl(0, 0%, 95%)' : '#171717',
              color: (!selectedFile || isUploading) ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
              cursor: (!selectedFile || isUploading) ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = '#404040';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFile && !isUploading) {
                e.currentTarget.style.backgroundColor = '#171717';
              }
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
