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
  name?: string;
  description?: string;
  inserted_at: string;
  updated_at: string;
  status?: string;
  job_id?: string;
  documents?: Document[];
}

export default function KnowledgeBasePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [apiKey, setApiKey] = useState<APIKey | null>(null);

  // Form state
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [batchSize, setBatchSize] = useState(1);

  // Helper functions for name cache - using job_id as key
  const CACHE_KEY = 'collection_job_cache';

  const saveCollectionData = (jobId: string, name: string, description: string, collectionId?: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      cache[jobId] = { name, description, collection_id: collectionId };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to save collection data:', e);
    }
  };

  const getCollectionDataByCollectionId = (collectionId: string): { name?: string; description?: string; job_id?: string } => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      // Find the entry where collection_id matches
      for (const [jobId, data] of Object.entries(cache)) {
        const cacheData = data as { name: string; description: string; collection_id?: string };
        if (cacheData.collection_id === collectionId) {
          return { name: cacheData.name, description: cacheData.description, job_id: jobId };
        }
      }
      return {};
    } catch (e) {
      console.error('Failed to get collection data:', e);
      return {};
    }
  };

  const enrichCollectionWithCache = async (collection: Collection): Promise<Collection> => {
    // First try to look up cached data by collection_id
    let cached = getCollectionDataByCollectionId(collection.id);

    let jobId = cached.job_id;
    let collectionJobStatus = null;
    let name = cached.name;
    let description = cached.description;

    // If we don't have cached data by collection_id, we need to find it by checking all jobs
    if (!jobId && apiKey) {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');

      // Try each job_id in the cache to find which one matches this collection
      for (const [cachedJobId, data] of Object.entries(cache)) {
        const cacheData = data as { name: string; description: string; collection_id?: string };

        // If collection_id is not set yet, fetch job info to check
        if (!cacheData.collection_id) {
          try {
            const jobInfo = await fetchJobStatus(cachedJobId);
            if (jobInfo?.collectionId === collection.id) {
              jobId = cachedJobId;
              name = cacheData.name;
              description = cacheData.description;
              collectionJobStatus = jobInfo.status;

              // Update cache with collection_id for faster lookup next time
              saveCollectionData(cachedJobId, cacheData.name, cacheData.description, collection.id);
              break;
            }
          } catch (error) {
            console.error('Error checking job:', cachedJobId, error);
          }
        }
      }
    }

    // If we have job_id but no status yet, fetch it
    if (jobId && !collectionJobStatus && apiKey) {
      try {
        const jobInfo = await fetchJobStatus(jobId);
        if (jobInfo?.status) {
          collectionJobStatus = jobInfo.status;

          // Update cache with collection_id if not already set
          if (jobInfo.collectionId && !cached.job_id) {
            saveCollectionData(jobId, name || '', description || '', jobInfo.collectionId);
          }
        }
      } catch (error) {
        console.error('Failed to fetch live status:', error);
      }
    }

    return {
      ...collection,
      name: name || 'Untitled Collection',
      description: description || '',
      status: collectionJobStatus || undefined,
      job_id: jobId,
    };
  };

  // Fetch job status for a collection
  const fetchJobStatus = async (jobId: string) => {
    if (!apiKey) return null;

    try {
      const response = await fetch(`/api/collections/jobs/${jobId}`, {
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();
        const jobData = result.data || result;

        // Extract collection ID from collection object or collection_id field
        const collectionId = jobData.collection?.id || jobData.collection_id || null;

        return {
          status: jobData.status || null,
          collectionId: collectionId
        };
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    }
    return null;
  };

  // Fetch collections
  const fetchCollections = async () => {
    if (!apiKey) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/collections', {
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();
        const collections = result.data || [];

        // Enrich collections with cached names and live status
        const enrichedCollections = await Promise.all(
          collections.map(collection => enrichCollectionWithCache(collection))
        );
        setCollections(enrichedCollections);
      } else {
        const error = await response.json().catch(() => ({}));
        console.error('Failed to fetch collections:', response.status, error);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available documents
  const fetchDocuments = async () => {
    if (!apiKey) return;

    try {
      const response = await fetch('/api/document', {
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();

        // Handle both direct array and wrapped response
        const documentList = Array.isArray(result) ? result : (result.data || []);
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

    setShowAllDocuments(false); // Reset to show only 3 documents
    setIsLoading(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();

        // Handle different response formats
        const collectionData = result.data || result;
        const enrichedCollection = await enrichCollectionWithCache(collectionData);
        setSelectedCollection(enrichedCollection);
      }
    } catch (error) {
      console.error('Error fetching collection details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show confirmation dialog
  const handleCreateClick = () => {
    if (!apiKey) {
      alert('No API key found');
      return;
    }

    if (!collectionName.trim() || selectedDocuments.size === 0) {
      alert('Please provide a name and select at least one document');
      return;
    }

    setShowConfirmCreate(true);
  };

  // Create knowledge base
  const handleConfirmCreate = async () => {
    setShowConfirmCreate(false);
    setIsCreating(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: collectionName,
          description: collectionDescription,
          documents: Array.from(selectedDocuments),
          batch_size: batchSize,
          provider: 'openai',
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Extract job_id from response (this is the collection job ID)
        const jobId = result.data?.job_id;

        // Save immediately with job_id (don't wait for collection_id as it gets created later)
        if (jobId) {
          saveCollectionData(jobId, collectionName, collectionDescription);
        } else {
          console.error('No job ID found in response - cannot save name to cache');
        }

        setShowCreateForm(false);
        setShowDocumentPicker(false);
        setCollectionName('');
        setCollectionDescription('');
        setSelectedDocuments(new Set());
        setBatchSize(1);
        await fetchCollections();
      } else {
        const error = await response.json();
        alert(`Failed to create knowledge base: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      alert('Failed to create knowledge base');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete collection
  const handleDeleteCollection = async (collectionId: string) => {
    if (!apiKey) return;
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
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
            className="w-2/5 border-r flex flex-col"
            style={{ borderColor: colors.border }}
          >
            {/* Create Button */}
            <div className="p-6 flex justify-end">
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setSelectedCollection(null);
                }}
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
              Loading knowledge bases...
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8" style={{ color: colors.text.secondary }}>
              No knowledge bases yet. Create your first one!
            </div>
          ) : (
            <div className="space-y-3">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowDocumentPicker(false);
                    fetchCollectionDetails(collection.id);
                  }}
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

        {/* Right Panel - Create Form or Preview */}
        <div className="w-3/5 flex flex-col">
        {showCreateForm ? (
          /* Create Form */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: colors.text.primary }}>
                Create Knowledge Base
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setShowDocumentPicker(false);
                  setCollectionName('');
                  setCollectionDescription('');
                  setSelectedDocuments(new Set());
                  setBatchSize(1);
                }}
                className="p-2 rounded-md transition-colors"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

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

            {/* Batch Size Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: colors.text.primary }}>
                Batch Size
                <div className="relative group">
                  <svg
                    className="w-4 h-4 cursor-help"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: colors.text.secondary }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div
                    className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 rounded-md text-xs z-10"
                    style={{
                      backgroundColor: colors.bg.secondary,
                      color: colors.text.primary,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    Number of documents to send to the knowledge base provider in a single transaction.
                  </div>
                </div>
              </label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-full px-4 py-2 rounded-md border text-sm"
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
              <button
                type="button"
                onClick={() => setShowDocumentPicker(true)}
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

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

            {/* Create Button */}
            <div className="flex justify-end">
              <button
                onClick={handleCreateClick}
                disabled={isCreating || !collectionName.trim() || selectedDocuments.size === 0}
                className="px-6 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  opacity: isCreating || !collectionName.trim() || selectedDocuments.size === 0 ? 0.5 : 1,
                }}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ) : selectedCollection ? (
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
              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase font-semibold" style={{ color: colors.text.secondary }}>
                    Status:
                  </div>
                  <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    {selectedCollection.status || 'N/A'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase font-semibold" style={{ color: colors.text.secondary }}>
                    Created:
                  </div>
                  <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    {formatDate(selectedCollection.inserted_at)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase font-semibold" style={{ color: colors.text.secondary }}>
                    Last Updated:
                  </div>
                  <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    {formatDate(selectedCollection.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents in Collection */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ color: colors.text.primary }}>
                Documents Present ({selectedCollection.documents?.length || 0})
              </h3>
              {selectedCollection.documents && selectedCollection.documents.length > 0 ? (
                <div>
                  {/* Header Row */}
                  <div className="flex items-center justify-between py-2 px-3 mb-2 gap-4" style={{ borderBottom: `2px solid ${colors.border}` }}>
                    <p className="text-xs font-semibold flex-1 pl-4" style={{ color: colors.text.secondary }}>
                      File Name
                    </p>
                    <p className="text-xs font-semibold pr-4" style={{ color: colors.text.secondary }}>
                      Uploaded At
                    </p>
                    <p className="text-xs font-semibold flex-shrink-0 pl-4" style={{ color: colors.text.secondary, width: '70px' }}>
                      Action
                    </p>
                  </div>
                  {/* Document List */}
                  <div className="space-y-1">
                    {(showAllDocuments ? selectedCollection.documents : selectedCollection.documents.slice(0, 3)).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between py-2 px-3 hover:bg-opacity-50 transition-colors gap-4"
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        <p className="text-sm flex-1 truncate" style={{ color: colors.text.primary }}>
                          {doc.fname}
                        </p>
                        <p className="text-xs" style={{ color: colors.text.secondary }}>
                          {doc.inserted_at ? formatDate(doc.inserted_at) : 'N/A'}
                        </p>
                        {doc.signed_url && (
                          <a
                            href={doc.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-md hover:opacity-80 transition-opacity flex-shrink-0"
                            style={{
                              color: colors.text.primary,
                              backgroundColor: colors.bg.secondary,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            Preview
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Show More Button */}
                  {selectedCollection.documents.length > 3 && !showAllDocuments && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowAllDocuments(true)}
                        className="text-sm px-4 py-2 rounded-md hover:opacity-80 transition-opacity"
                        style={{
                          color: colors.text.primary,
                          backgroundColor: colors.bg.secondary,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        Show More ({selectedCollection.documents.length - 3} more)
                      </button>
                    </div>
                  )}
                  {/* Show Less Button */}
                  {showAllDocuments && selectedCollection.documents.length > 3 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowAllDocuments(false)}
                        className="text-sm px-4 py-2 rounded-md hover:opacity-80 transition-opacity"
                        style={{
                          color: colors.text.primary,
                          backgroundColor: colors.bg.secondary,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        Show Less
                      </button>
                    </div>
                  )}
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
            Select a knowledge base to view details
          </div>
        )}
        </div>
      </div>
      </div>

      {/* Confirm Create Modal */}
      {showConfirmCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-lg p-6 w-full max-w-md"
            style={{ backgroundColor: colors.bg.primary }}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text.primary }}>
              Create Knowledge Base
            </h2>
            <p className="text-sm mb-6" style={{ color: colors.text.secondary }}>
              This will take few seconds. 
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmCreate(false)}
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
                onClick={handleConfirmCreate}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Picker Modal */}
      {showDocumentPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
            style={{ backgroundColor: colors.bg.primary }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ color: colors.text.primary }}>
                Select Documents
              </h2>
              <button
                onClick={() => setShowDocumentPicker(false)}
                className="p-2 rounded-md transition-colors"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto mb-4">
              {availableDocuments.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: colors.text.secondary }}>
                  No documents available. Please upload documents first.
                </div>
              ) : (
                <div className="space-y-2">
                  {availableDocuments.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center p-4 rounded-md border cursor-pointer transition-colors"
                      style={{
                        backgroundColor: selectedDocuments.has(doc.id) ? colors.bg.secondary : 'transparent',
                        borderColor: selectedDocuments.has(doc.id) ? colors.border : 'transparent',
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
                        className="mr-3 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: colors.text.primary }}>
                          {doc.fname}
                        </p>
                        <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                          ID: {doc.id.substring(0, 8)}...
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Count and Actions */}
            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.border }}>
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDocumentPicker(false)}
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
                  onClick={() => setShowDocumentPicker(false)}
                  disabled={selectedDocuments.size === 0}
                  className="px-4 py-2 rounded-md text-sm font-medium"
                  style={{
                    backgroundColor: colors.bg.secondary,
                    color: colors.text.primary,
                    border: `1px solid ${colors.border}`,
                    opacity: selectedDocuments.size === 0 ? 0.5 : 1,
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
