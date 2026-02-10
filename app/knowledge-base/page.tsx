"use client"

import { useState, useEffect, useRef } from 'react';
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [apiKey, setApiKey] = useState<APIKey | null>(null);
  const [showAllDocs, setShowAllDocs] = useState(false);

  // Polling refs — persist across renders, no stale closures
  const apiKeyRef = useRef<APIKey | null>(null);
  const activeJobsRef = useRef<Map<string, string>>(new Map()); // collectionId → jobId
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchCollectionsRef = useRef<(() => Promise<void>) | null>(null);

  // Form state
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

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

  const enrichCollectionWithCache = async (
    collection: Collection,
    jobStatusMap: Map<string, { status: string | null; collectionId: string | null }>
  ): Promise<Collection> => {
    // First try to look up cached data by collection_id
    let cached = getCollectionDataByCollectionId(collection.id);

    let jobId = cached.job_id;
    let collectionJobStatus = null;
    let name = cached.name;
    let description = cached.description;

    // If we don't have cached data by collection_id, we need to find it by checking all jobs
    if (!jobId) {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');

      // Try each job_id in the cache to find which one matches this collection
      for (const [cachedJobId, data] of Object.entries(cache)) {
        const cacheData = data as { name: string; description: string; collection_id?: string };

        // If collection_id is not set yet, check the pre-fetched job status
        if (!cacheData.collection_id) {
          const jobInfo = jobStatusMap.get(cachedJobId);
          if (jobInfo?.collectionId === collection.id) {
            jobId = cachedJobId;
            name = cacheData.name;
            description = cacheData.description;
            collectionJobStatus = jobInfo.status;

            // Update cache with collection_id for faster lookup next time
            saveCollectionData(cachedJobId, cacheData.name, cacheData.description, collection.id);
            break;
          }
        }
      }
    }

    // If we have job_id but no status yet, get it from the map
    if (jobId && !collectionJobStatus) {
      const jobInfo = jobStatusMap.get(jobId);
      if (jobInfo?.status) {
        collectionJobStatus = jobInfo.status;

        // Update cache with collection_id if not already set
        if (jobInfo.collectionId && !cached.job_id) {
          saveCollectionData(jobId, name || '', description || '', jobInfo.collectionId);
        }
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

  // Pre-fetch job statuses only for entries that need collection_id resolution
  const preFetchJobStatuses = async (collections: Collection[]): Promise<Map<string, { status: string | null; collectionId: string | null }>> => {
    if (!apiKey) return new Map();

    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');

    // Only fetch job statuses for entries without collection_id AND that might match our collections
    const jobIdsToFetch = new Set<string>();

    collections.forEach(collection => {
      // First check if this collection already has cached data with collection_id
      const cached = getCollectionDataByCollectionId(collection.id);
      if (!cached.job_id) {
        // No cached data found by collection_id, need to check all uncached jobs
        for (const [jobId, data] of Object.entries(cache)) {
          const cacheData = data as { name: string; description: string; collection_id?: string };
          if (!cacheData.collection_id) {
            jobIdsToFetch.add(jobId);
          }
        }
      }
    });

    // If no jobs need fetching, return empty map
    if (jobIdsToFetch.size === 0) {
      return new Map();
    }

    // Fetch only the necessary job statuses in parallel
    const results = await Promise.all(
      Array.from(jobIdsToFetch).map(async (jobId) => {
        try {
          const response = await fetch(`/api/collections/jobs/${jobId}`, {
            headers: { 'X-API-KEY': apiKey.key },
          });

          if (response.ok) {
            const result = await response.json();
            const jobData = result.data || result;
            const collectionId = jobData.collection?.id || jobData.collection_id || null;

            return {
              jobId,
              status: jobData.status || null,
              collectionId: collectionId
            };
          }
        } catch (error) {
          console.error('Error fetching job status:', error);
        }
        return { jobId, status: null, collectionId: null };
      })
    );

    // Convert to Map for O(1) lookup
    const jobStatusMap = new Map();
    results.forEach(({ jobId, status, collectionId }) => {
      jobStatusMap.set(jobId, { status, collectionId });
    });

    return jobStatusMap;
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

        // Pre-fetch job statuses only for collections that need it
        const jobStatusMap = await preFetchJobStatuses(collections);

        // Enrich collections with cached names and live status
        const enrichedCollections = await Promise.all(
          collections.map((collection: Collection) => enrichCollectionWithCache(collection, jobStatusMap))
        );
        // Preserve optimistic entries not yet replaced by a real collection
        setCollections((prev) => {
          const fetchedJobIds = new Set(enrichedCollections.map((c: Collection) => c.job_id).filter(Boolean));
          const activeOptimistic = prev.filter(
            (c) => c.id.startsWith('optimistic-') && (!c.job_id || !fetchedJobIds.has(c.job_id))
          );
          return [...activeOptimistic, ...enrichedCollections];
        });

        // If selectedCollection is optimistic and the real one just arrived, fetch full details
        // Extract the logic outside the updater to avoid side effects
        let replacementId: string | null = null;
        setSelectedCollection((prev) => {
          if (prev?.id.startsWith('optimistic-') && prev.job_id) {
            const replacement = enrichedCollections.find((c: Collection) => c.job_id === prev.job_id);
            if (replacement) {
              replacementId = replacement.id;
              // Don't set the replacement yet - let fetchCollectionDetails do it with full data
            }
          }
          return prev;
        });

        // Fetch full details (including documents) for the replacement
        if (replacementId) {
          fetchCollectionDetails(replacementId);
        }
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

    // Don't fetch optimistic collections from the server
    if (collectionId.startsWith('optimistic-')) {
      const optimisticCollection = collections.find(c => c.id === collectionId);
      if (optimisticCollection) {
        setSelectedCollection(optimisticCollection);
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();

        // Handle different response formats
        const collectionData = result.data || result;

        // Get cached data to find the job_id
        const cached = getCollectionDataByCollectionId(collectionId);

        // If we have a job_id, fetch its status
        let status = undefined;
        if (cached.job_id) {
          try {
            const jobResponse = await fetch(`/api/collections/jobs/${cached.job_id}`, {
              headers: { 'X-API-KEY': apiKey.key },
            });
            if (jobResponse.ok) {
              const jobResult = await jobResponse.json();
              const jobData = jobResult.data || jobResult;
              status = jobData.status || undefined;
            }
          } catch (error) {
            console.error('Error fetching job status for collection details:', error);
          }
        }

        // Enrich the collection with cached name/description and live status
        const enrichedCollection = {
          ...collectionData,
          name: cached.name || collectionData.name || 'Untitled Collection',
          description: cached.description || collectionData.description || '',
          status: status,
          job_id: cached.job_id,
        };

        setSelectedCollection(enrichedCollection);
      }
    } catch (error) {
      console.error('Error fetching collection details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start the 3-second polling loop (idempotent — safe to call multiple times)
  const startPolling = () => {
    if (pollingRef.current) return;
    if (activeJobsRef.current.size === 0) return;

    pollingRef.current = setInterval(async () => {
      const currentApiKey = apiKeyRef.current;
      if (!currentApiKey) return;

      const jobs = activeJobsRef.current;
      if (jobs.size === 0) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        return;
      }

      let anyResolved = false;

      for (const [collectionId, jobId] of Array.from(jobs)) {
        try {
          const response = await fetch(`/api/collections/jobs/${jobId}`, {
            headers: { 'X-API-KEY': currentApiKey.key },
          });
          if (!response.ok) continue;

          const result = await response.json();
          const jobData = result.data || result;
          const status = jobData.status || null;
          const realCollectionId = jobData.collection?.id || jobData.collection_id || null;

          if (status) {
            // Always update status in UI (including in_progress/pending states)
            setCollections((prev) =>
              prev.map((c) => {
                // Update by collectionId OR by job_id (handles optimistic->real transition)
                if (c.id === collectionId || c.job_id === jobId) {
                  return { ...c, status };
                }
                return c;
              })
            );
            setSelectedCollection((prev) => {
              if (prev?.id === collectionId || prev?.job_id === jobId) {
                return { ...prev, status };
              }
              return prev;
            });

            // If job is complete (not pending/in_progress/processing), remove from polling and trigger full refresh
            const isComplete = !['pending', 'processing'].includes(status.toLowerCase());
            if (isComplete) {
              jobs.delete(collectionId);
              anyResolved = true;

              // Persist real collectionId so enrichment finds it on next load
              if (collectionId.startsWith('optimistic-') && realCollectionId) {
                try {
                  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                  const existing = cache[jobId] || {};
                  cache[jobId] = { ...existing, collection_id: realCollectionId };
                  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                } catch (e) {
                  console.error('Failed to update cache:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('Polling error for job', jobId, error);
        }
      }

      // At least one job finished — refresh the full list to swap in real collections
      if (anyResolved && fetchCollectionsRef.current) {
        fetchCollectionsRef.current();
      }
    }, 5000);
  };

  // Create knowledge base
  const handleCreateClick = async () => {
    if (!apiKey) {
      alert('No API key found');
      return;
    }

    if (!collectionName.trim() || selectedDocuments.size === 0) {
      alert('Please provide a name and select at least one document');
      return;
    }

    setIsCreating(true);

    // Capture form values before clearing them
    const nameAtCreation = collectionName;
    const descriptionAtCreation = collectionDescription;
    const docsAtCreation = Array.from(selectedDocuments);

    // Immediately clear the form and switch to preview
    setShowCreateForm(false);
    setShowDocumentPicker(false);
    setCollectionName('');
    setCollectionDescription('');
    setSelectedDocuments(new Set());

    // Build an optimistic collection and show the preview right away
    const optimisticId = `optimistic-${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticDocuments: Document[] = docsAtCreation
      .map((id) => availableDocuments.find((d) => d.id === id))
      .filter((d): d is Document => !!d);

    const optimisticCollection: Collection = {
      id: optimisticId,
      name: nameAtCreation,
      description: descriptionAtCreation,
      inserted_at: now,
      updated_at: now,
      status: 'pending',
      documents: optimisticDocuments,
    };

    setCollections((prev) => [optimisticCollection, ...prev]);
    setSelectedCollection(optimisticCollection);

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nameAtCreation,
          description: descriptionAtCreation,
          documents: docsAtCreation,
          provider: 'openai',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const jobId = result.data?.job_id;

        if (jobId) {
          saveCollectionData(jobId, nameAtCreation, descriptionAtCreation);

          // Attach job_id to the optimistic entry so polling picks it up
          setCollections((prev) =>
            prev.map((c) =>
              c.id === optimisticId ? { ...c, job_id: jobId } : c
            )
          );
          setSelectedCollection((prev) =>
            prev?.id === optimisticId ? { ...prev, job_id: jobId } : prev
          );

          // Register for polling immediately — don't wait for the next collections render
          activeJobsRef.current.set(optimisticId, jobId);
          startPolling();
        } else {
          console.error('No job ID found in response - cannot save name to cache');
        }

        // Refresh the real list from the backend (replaces the optimistic entry once the backend knows about it)
        await fetchCollections();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to create knowledge base: ${error.error || 'Unknown error'}`);
        // Remove the optimistic entry on failure
        setCollections((prev) => prev.filter((c) => c.id !== optimisticId));
        setSelectedCollection(null);
      }
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      alert('Failed to create knowledge base');
      setCollections((prev) => prev.filter((c) => c.id !== optimisticId));
      setSelectedCollection(null);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete collection - show confirmation modal
  const handleDeleteCollection = (collectionId: string) => {
    if (!apiKey) return;
    setCollectionToDelete(collectionId);
    setShowConfirmDelete(true);
  };

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!collectionToDelete || !apiKey) return;

    setShowConfirmDelete(false);
    const collectionId = collectionToDelete;
    setCollectionToDelete(null);

    // Store the original collection in case we need to restore it
    const originalCollection = collections.find((c) => c.id === collectionId);

    // Update status to "deleting" instead of removing immediately
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, status: 'deleting' } : c))
    );
    setSelectedCollection((prev) =>
      prev?.id === collectionId ? { ...prev, status: 'deleting' } : prev
    );

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
        headers: { 'X-API-KEY': apiKey.key },
      });

      if (response.ok) {
        const result = await response.json();
        const jobId = result.data?.job_id;

        if (jobId) {
          // Poll the delete job status
          const pollDeleteStatus = async () => {
            const currentApiKey = apiKeyRef.current;
            if (!currentApiKey) return;

            try {
              const jobResponse = await fetch(`/api/collections/jobs/${jobId}`, {
                headers: { 'X-API-KEY': currentApiKey.key },
              });

              if (jobResponse.ok) {
                const jobResult = await jobResponse.json();
                const jobData = jobResult.data || jobResult;
                const status = jobData.status;
                const statusLower = status?.toLowerCase();

                if (statusLower === 'successful') {
                  // Job completed successfully - remove from UI
                  setCollections((prev) => prev.filter((c) => c.id !== collectionId));
                  setSelectedCollection(null);
                } else if (statusLower === 'failed') {
                  // Job failed - restore original collection
                  alert('Failed to delete collection');
                  if (originalCollection) {
                    setCollections((prev) =>
                      prev.map((c) => (c.id === collectionId ? originalCollection : c))
                    );
                    setSelectedCollection((prev) =>
                      prev?.id === collectionId ? originalCollection : prev
                    );
                  }
                } else {
                  // Still processing - keep status as "deleting" and poll again
                  setTimeout(pollDeleteStatus, 2000); // Poll every 2 seconds
                }
              } else {
                // Failed to get job status
                alert('Failed to check delete status');
                if (originalCollection) {
                  setCollections((prev) =>
                    prev.map((c) => (c.id === collectionId ? originalCollection : c))
                  );
                  setSelectedCollection((prev) =>
                    prev?.id === collectionId ? originalCollection : prev
                  );
                }
              }
            } catch (error) {
              console.error('Error polling delete status:', error);
              alert('Failed to check delete status');
              if (originalCollection) {
                setCollections((prev) =>
                  prev.map((c) => (c.id === collectionId ? originalCollection : c))
                );
                setSelectedCollection((prev) =>
                  prev?.id === collectionId ? originalCollection : prev
                );
              }
            }
          };

          // Start polling
          pollDeleteStatus();
        } else {
          // No job_id returned, assume immediate success
          setCollections((prev) => prev.filter((c) => c.id !== collectionId));
          setSelectedCollection(null);
        }
      } else {
        alert('Failed to delete collection');
        // Restore the original collection on failure
        if (originalCollection) {
          setCollections((prev) =>
            prev.map((c) => (c.id === collectionId ? originalCollection : c))
          );
          setSelectedCollection((prev) =>
            prev?.id === collectionId ? originalCollection : prev
          );
        }
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection');
      // Restore the original collection on error
      if (originalCollection) {
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? originalCollection : c))
        );
        setSelectedCollection((prev) =>
          prev?.id === collectionId ? originalCollection : prev
        );
      }
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

  // Keep apiKeyRef in sync so polling always has the current key
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);

  // Keep fetchCollectionsRef in sync so polling always has the current function
  useEffect(() => { fetchCollectionsRef.current = fetchCollections; }, [fetchCollections]);

  // Sync activeJobsRef when collections change (picks up in-progress entries on initial load)
  useEffect(() => {
    // Remove tracked jobs whose collections no longer exist in the list
    const currentIds = new Set(collections.map((c) => c.id));
    for (const [id] of Array.from(activeJobsRef.current)) {
      if (!currentIds.has(id)) activeJobsRef.current.delete(id);
    }

    // Add any new pending / processing collections
    let newJobAdded = false;
    collections.forEach((c) => {
      const isProcessing = c.status && ['pending', 'processing'].includes(c.status.toLowerCase());

      if (isProcessing && c.job_id && !activeJobsRef.current.has(c.id)) {
        activeJobsRef.current.set(c.id, c.job_id);
        newJobAdded = true;
      }
    });

    if (newJobAdded && apiKey) startPolling();
  }, [collections, apiKey]);

  // Reset showAllDocs when selectedCollection changes
  useEffect(() => {
    setShowAllDocs(false);
  }, [selectedCollection?.id]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

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
            className="w-1/3 border-r flex flex-col"
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
            <div className="space-y-2">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowDocumentPicker(false);
                    fetchCollectionDetails(collection.id);
                  }}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedCollection?.id === collection.id ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={{
                    backgroundColor: selectedCollection?.id === collection.id
                      ? 'hsl(202, 100%, 95%)'
                      : colors.bg.primary,
                    borderColor: selectedCollection?.id === collection.id
                      ? 'hsl(202, 100%, 50%)'
                      : colors.border,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.text.primary }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <h3 className="text-sm font-semibold truncate" style={{ color: colors.text.primary }}>
                          {collection.name}
                        </h3>
                      </div>
                      {collection.description && (
                        <p className="text-xs truncate" style={{ color: colors.text.secondary }}>
                          {collection.description}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                        {formatDate(collection.inserted_at)}
                      </p>
                    </div>
                    {!collection.id.startsWith('optimistic-') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(collection.id);
                        }}
                        className="p-1.5 rounded-md transition-colors flex-shrink-0"
                        style={{
                          borderWidth: '1px',
                          borderColor: 'hsl(8, 86%, 80%)',
                          backgroundColor: colors.bg.primary,
                          color: 'hsl(8, 86%, 40%)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(8, 86%, 95%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = colors.bg.primary;
                        }}
                        title="Delete Knowledge Base"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Create Form or Preview */}
        <div className="w-2/3 flex flex-col">
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
                {!selectedCollection.id.startsWith('optimistic-') && (
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
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3">
                  <div className="text-xs uppercase font-semibold" style={{ color: colors.text.secondary }}>
                    Status:
                  </div>
                  <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    {(selectedCollection.status || 'N/A').replace(/_/g, ' ').toUpperCase()}
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
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                  Documents Present ({selectedCollection.documents?.length || 0})
                </h3>
                {selectedCollection.documents && selectedCollection.documents.length > 0 && (
                  <button
                    onClick={() => {
                      setPreviewDoc(selectedCollection.documents![0]);
                      setShowDocPreviewModal(true);
                    }}
                    className="text-xs px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity"
                    style={{
                      color: colors.text.primary,
                      backgroundColor: colors.bg.secondary,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    Preview
                  </button>
                )}
              </div>

              {/* Document List */}
              {selectedCollection.documents && selectedCollection.documents.length > 0 ? (
                <div>
                  {/* Header Row */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: colors.border }}>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: colors.text.secondary }}>
                        Name
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: colors.text.secondary }}>
                        Uploaded At
                      </p>
                    </div>
                  </div>

                  {/* Document Rows */}
                  <div className="space-y-2">
                    {selectedCollection.documents
                      .slice(0, showAllDocs ? selectedCollection.documents.length : 3)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between py-1"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="text-sm truncate" style={{ color: colors.text.primary }}>
                              {doc.fname}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <p className="text-xs" style={{ color: colors.text.secondary }}>
                              {doc.inserted_at ? formatDate(doc.inserted_at) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Show More / Show Less Button */}
                  {selectedCollection.documents.length > 3 && (
                    <button
                      onClick={() => setShowAllDocs(!showAllDocs)}
                      className="w-full py-2 px-4 rounded-md text-sm font-medium transition-colors mt-3"
                      style={{
                        backgroundColor: 'transparent',
                        color: colors.text.secondary,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {showAllDocs ? 'Show Less' : `Show More (${selectedCollection.documents.length - 3} more)`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: colors.text.secondary }}>
                  No documents in this collection
                </p>
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

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-lg p-6 w-full max-w-md"
            style={{ backgroundColor: colors.bg.primary }}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text.primary }}>
              Delete Collection
            </h2>
            <p className="text-sm mb-6" style={{ color: colors.text.secondary }}>
              Are you sure you want to delete this collection? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setCollectionToDelete(null);
                }}
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
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: '1px solid #ef4444',
                }}
              >
                Delete
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

      {/* Document Preview Modal */}
      {showDocPreviewModal && selectedCollection?.documents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="rounded-lg w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden"
            style={{ backgroundColor: colors.bg.primary }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                Document Preview
              </h2>
              <button
                onClick={() => {
                  setShowDocPreviewModal(false);
                  setPreviewDoc(null);
                }}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Two-pane body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left pane — doc list */}
              <div
                className="w-1/5 flex flex-col overflow-y-auto flex-shrink-0"
                style={{ borderRight: `1px solid ${colors.border}` }}
              >
                {selectedCollection.documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className="text-left px-4 py-3 flex-shrink-0 transition-colors"
                    style={{
                      backgroundColor: previewDoc?.id === doc.id ? colors.bg.secondary : 'transparent',
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <p className="text-sm truncate" style={{ color: colors.text.primary }}>
                      {doc.fname}
                    </p>
                    {doc.inserted_at && (
                      <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                        {formatDate(doc.inserted_at)}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Right pane — preview content */}
              <div className="flex-1 overflow-hidden flex items-center justify-center" style={{ backgroundColor: colors.bg.secondary }}>
                {previewDoc?.signed_url ? (
                  <iframe
                    key={previewDoc.id}
                    src={previewDoc.signed_url}
                    title={previewDoc.fname}
                    className="w-full h-full"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <p className="text-sm" style={{ color: colors.text.secondary }}>
                    {previewDoc ? 'No preview available for this document' : 'Select a document to preview'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
