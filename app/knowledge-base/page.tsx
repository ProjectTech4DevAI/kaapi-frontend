"use client"

import { useState, useEffect } from 'react';
import { colors } from '@/app/lib/colors';
import { formatDate } from '@/app/components/utils';
import Sidebar from '@/app/components/Sidebar';
import { APIKey, STORAGE_KEY } from '../keystore/page';

export interface Document {
  id: string;
  fname: string;
  object_store_url: string;
  signed_url?: string;
  file_size?: number;
  inserted_at?: string;
  updated_at?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  inserted_at: string;
  updated_at: string;
  documents?: Document[];
}

export default function KnowledgeBasePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [apiKey, setApiKey] = useState<APIKey | null>(null);

  // Form state
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

  // Fetch collections
  const fetchCollections = async () => {
    if (!apiKey) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/collection', {
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();
        setCollections(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available documents
  const fetchDocuments = async () => {
    if (!apiKey) {
      console.log('No API key available');
      return;
    }

    try {
      console.log('Fetching documents with API key:', apiKey.key ? 'present' : 'missing');

      const response = await fetch('/api/document', {
        headers: { 'X-API-KEY': apiKey.key },
      });

      console.log('Document fetch response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Raw document response:', result);

        // Handle both direct array and wrapped response
        const documentList = Array.isArray(result) ? result : (result.data || []);
        console.log('Processed document list:', documentList);
        setAvailableDocuments(documentList);
      } else {
        const error = await response.json().catch(() => ({}));
        console.error('Failed to fetch documents:', response.status, error);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // Fetch collection details with documents
  const fetchCollectionDetails = async (collectionId: string) => {
    if (!apiKey) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/collection/${collectionId}`, {
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedCollection(result.data);
      }
    } catch (error) {
      console.error('Error fetching collection details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create collection
  const handleCreateCollection = async () => {
    if (!apiKey) {
      alert('No API key found');
      return;
    }

    if (!collectionName.trim() || selectedDocuments.size === 0) {
      alert('Please provide a name and select at least one document');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: collectionName,
          description: collectionDescription,
          documents: Array.from(selectedDocuments),
          batch_size: 1,
          provider: 'openai',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Collection created! Job ID: ${result.data?.id || 'Unknown'}`);
        setShowCreateModal(false);
        setCollectionName('');
        setCollectionDescription('');
        setSelectedDocuments(new Set());
        fetchCollections();
      } else {
        const error = await response.json();
        alert(`Failed to create collection: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete collection
  const handleDeleteCollection = async (collectionId: string) => {
    if (!apiKey) return;
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      const response = await fetch(`/api/collection/${collectionId}`, {
        method: 'DELETE',
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        alert('Collection deleted successfully');
        setSelectedCollection(null);
        fetchCollections();
      } else {
        alert('Failed to delete collection');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection');
    }
  };

  // Toggle document selection
  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

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

  useEffect(() => {
    if (apiKey) {
      fetchCollections();
      fetchDocuments();
    }
  }, [apiKey]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: colors.bg.primary }}>
      <Sidebar collapsed={sidebarCollapsed} activeRoute="/knowledge-base" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Collapse Button */}
        <div className="border-b px-6 py-4" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-md transition-colors flex-shrink-0"
              style={{
                borderWidth: '1px',
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
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
              <h1 className="text-2xl font-semibold" style={{ color: colors.text.primary }}>
                Knowledge Base
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>
                Manage your knowledge bases for RAG
              </p>
            </div>
          </div>
        </div>

        {/* Content Area - Split View */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Collections List */}
          <div
            className="w-1/2 border-r flex flex-col"
            style={{ borderColor: colors.border }}
          >
            {/* Create Button */}
            <div className="p-6 flex justify-end">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                + Create
              </button>
            </div>

            {/* Collections List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading && collections.length === 0 ? (
            <div className="text-center py-8" style={{ color: colors.text.secondary }}>
              Loading collections...
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8" style={{ color: colors.text.secondary }}>
              No collections yet. Create your first one!
            </div>
          ) : (
            <div className="space-y-3">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  onClick={() => fetchCollectionDetails(collection.id)}
                  className="p-4 rounded-lg border cursor-pointer transition-all"
                  style={{
                    backgroundColor: selectedCollection?.id === collection.id ? colors.bg.secondary : 'transparent',
                    borderColor: selectedCollection?.id === collection.id ? colors.border : 'transparent',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm" style={{ color: colors.text.primary }}>
                        {collection.name}
                      </h3>
                      {collection.description && (
                        <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                          {collection.description}
                        </p>
                      )}
                      <p className="text-xs mt-2" style={{ color: colors.text.secondary }}>
                        Created: {formatDate(collection.inserted_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 flex flex-col">
        {selectedCollection ? (
          <>
            {/* Preview Header */}
            <div className="p-6 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold" style={{ color: colors.text.primary }}>
                    {selectedCollection.name}
                  </h2>
                  {selectedCollection.description && (
                    <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>
                      {selectedCollection.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteCollection(selectedCollection.id)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                  }}
                >
                  Delete
                </button>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <div className="text-xs uppercase font-semibold mb-1" style={{ color: colors.text.secondary }}>
                    Created
                  </div>
                  <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                    {formatDate(selectedCollection.inserted_at)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold mb-1" style={{ color: colors.text.secondary }}>
                    Last Updated
                  </div>
                  <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                    {formatDate(selectedCollection.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents in Collection */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ color: colors.text.primary }}>
                Documents ({selectedCollection.documents?.length || 0})
              </h3>
              {selectedCollection.documents && selectedCollection.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedCollection.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-md border"
                      style={{
                        backgroundColor: colors.bg.secondary,
                        borderColor: colors.border,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: colors.text.primary }}>
                            {doc.fname}
                          </p>
                          <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                            ID: {doc.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: colors.text.secondary }}>
                  No documents in this collection
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: colors.text.secondary }}>
            Select a collection to view details
          </div>
        )}
        </div>
      </div>
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: colors.bg.primary }}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text.primary }}>
              Create Knowledge Base
            </h2>

            {/* Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text.primary }}>
                Name *
              </label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Enter collection name"
                className="w-full px-4 py-2 rounded-md border text-sm"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                }}
              />
            </div>

            {/* Description Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text.primary }}>
                Description
              </label>
              <textarea
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                placeholder="Enter collection description (optional)"
                rows={3}
                className="w-full px-4 py-2 rounded-md border text-sm resize-none"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                }}
              />
            </div>

            {/* Document Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text.primary }}>
                Select Documents *
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDocumentPicker(!showDocumentPicker)}
                  className="w-full px-4 py-3 rounded-md border text-left flex items-center justify-between"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg.secondary,
                    color: colors.text.primary,
                  }}
                >
                  <span className="text-sm">
                    {selectedDocuments.size === 0
                      ? 'Click to select documents'
                      : `${selectedDocuments.size} document${selectedDocuments.size > 1 ? 's' : ''} selected`}
                  </span>
                  <svg
                    className="w-5 h-5 transition-transform"
                    style={{ transform: showDocumentPicker ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Document Picker Dropdown */}
                {showDocumentPicker && (
                  <div
                    className="absolute z-10 w-full mt-2 border rounded-md shadow-lg max-h-64 overflow-y-auto"
                    style={{
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.border,
                    }}
                  >
                    {availableDocuments.length === 0 ? (
                      <div className="p-4 text-center text-sm" style={{ color: colors.text.secondary }}>
                        No documents available. Please upload documents first.
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: colors.border }}>
                        {availableDocuments.map((doc) => (
                          <label
                            key={doc.id}
                            className="flex items-center p-3 cursor-pointer transition-colors"
                            style={{
                              backgroundColor: selectedDocuments.has(doc.id) ? colors.bg.secondary : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!selectedDocuments.has(doc.id)) {
                                e.currentTarget.style.backgroundColor = colors.bg.secondary;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!selectedDocuments.has(doc.id)) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDocuments.has(doc.id)}
                              onChange={() => toggleDocumentSelection(doc.id)}
                              className="mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: colors.text.primary }}>
                                {doc.fname}
                              </p>
                              <p className="text-xs" style={{ color: colors.text.secondary }}>
                                ID: {doc.id.substring(0, 8)}...
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Show selected documents */}
              {selectedDocuments.size > 0 && (
                <div className="mt-3 space-y-2">
                  {Array.from(selectedDocuments).map((docId) => {
                    const doc = availableDocuments.find((d) => d.id === docId);
                    if (!doc) return null;
                    return (
                      <div
                        key={docId}
                        className="flex items-center justify-between p-2 rounded-md"
                        style={{
                          backgroundColor: colors.bg.secondary,
                          borderColor: colors.border,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <span className="text-sm truncate" style={{ color: colors.text.primary }}>
                          {doc.fname}
                        </span>
                        <button
                          onClick={() => toggleDocumentSelection(docId)}
                          className="ml-2 p-1 rounded-md transition-colors"
                          style={{ color: colors.text.secondary }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowDocumentPicker(false);
                  setCollectionName('');
                  setCollectionDescription('');
                  setSelectedDocuments(new Set());
                }}
                disabled={isCreating}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: 'transparent',
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={isCreating || !collectionName.trim() || selectedDocuments.size === 0}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  opacity: isCreating || !collectionName.trim() || selectedDocuments.size === 0 ? 0.5 : 1,
                }}
              >
                {isCreating ? 'Creating...' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
