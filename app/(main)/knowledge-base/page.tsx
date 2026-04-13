"use client";

import { useState, useEffect, useRef } from "react";
import { formatDate } from "@/app/components/utils";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import Modal from "@/app/components/Modal";
import {
  CloseIcon,
  TrashIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from "@/app/components/icons";
import { Button, Field } from "@/app/components";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { apiFetch } from "@/app/lib/apiClient";
import {
  JobStatusData,
  CollectionResponse,
  DocumentResponse,
  CreateCollectionResponse,
  DeleteCollectionResponse,
  DocumentDetailResponse,
} from "@/app/lib/types/knowledgeBase";
import { Document, Collection } from "@/app/lib/types/document";

export default function KnowledgeBasePage() {
  const { sidebarCollapsed } = useApp();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  );
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const { activeKey: apiKey, isAuthenticated } = useAuth();
  const [showAllDocs, setShowAllDocs] = useState(false);

  // Polling refs — persist across renders, no stale closures
  const apiKeyRef = useRef<typeof apiKey>(null);
  const activeJobsRef = useRef<Map<string, string>>(new Map()); // collectionId → jobId
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchCollectionsRef = useRef<(() => Promise<void>) | null>(null);

  // Form state
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  // Helper functions for name cache - using job_id as key
  const CACHE_KEY = "collection_job_cache";

  const saveCollectionData = (
    jobId: string,
    name: string,
    description: string,
    collectionId?: string,
  ) => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      cache[jobId] = { name, description, collection_id: collectionId };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Failed to save collection data:", e);
    }
  };

  const getCollectionDataByCollectionId = (
    collectionId: string,
  ): { name?: string; description?: string; job_id?: string } => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      // Find the entry where collection_id matches
      for (const [jobId, data] of Object.entries(cache)) {
        const cacheData = data as {
          name: string;
          description: string;
          collection_id?: string;
        };
        if (cacheData.collection_id === collectionId) {
          return {
            name: cacheData.name,
            description: cacheData.description,
            job_id: jobId,
          };
        }
      }
      return {};
    } catch (e) {
      console.error("Failed to get collection data:", e);
      return {};
    }
  };

  const deleteCollectionFromCache = (collectionId: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      for (const [jobId, data] of Object.entries(cache)) {
        const cacheData = data as { collection_id?: string };
        if (cacheData.collection_id === collectionId) {
          delete cache[jobId];
          break;
        }
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Failed to delete collection from cache:", e);
    }
  };

  const pruneStaleCache = (liveCollectionIds: Set<string>) => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      let changed = false;
      for (const [jobId, data] of Object.entries(cache)) {
        const cacheData = data as { collection_id?: string };
        // Only prune entries that have a collection_id but it's no longer in the live list
        if (
          cacheData.collection_id &&
          !liveCollectionIds.has(cacheData.collection_id)
        ) {
          delete cache[jobId];
          changed = true;
        }
      }
      if (changed) localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Failed to prune stale cache:", e);
    }
  };

  const enrichCollectionWithCache = async (
    collection: Collection,
    jobStatusMap: Map<
      string,
      { status: string | null; collectionId: string | null }
    >,
  ): Promise<Collection> => {
    // First try to look up cached data by collection_id
    const cached = getCollectionDataByCollectionId(collection.id);

    let jobId = cached.job_id;
    let collectionJobStatus = null;
    let name = cached.name;
    let description = cached.description;

    // If we don't have cached data by collection_id, we need to find it by checking all jobs
    if (!jobId) {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");

      // Try each job_id in the cache to find which one matches this collection
      for (const [cachedJobId, data] of Object.entries(cache)) {
        const cacheData = data as {
          name: string;
          description: string;
          collection_id?: string;
        };

        // If collection_id is not set yet, check the pre-fetched job status
        if (!cacheData.collection_id) {
          const jobInfo = jobStatusMap.get(cachedJobId);
          if (jobInfo?.collectionId === collection.id) {
            jobId = cachedJobId;
            name = cacheData.name;
            description = cacheData.description;
            collectionJobStatus = jobInfo.status;

            // Update cache with collection_id for faster lookup next time
            saveCollectionData(
              cachedJobId,
              cacheData.name,
              cacheData.description,
              collection.id,
            );
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
          saveCollectionData(
            jobId,
            name || "",
            description || "",
            jobInfo.collectionId,
          );
        }
      }
    }

    return {
      ...collection,
      name: name || "Untitled Collection",
      description: description || "",
      status: collectionJobStatus || undefined,
      job_id: jobId,
    };
  };

  // Pre-fetch job statuses only for entries that need collection_id resolution
  const preFetchJobStatuses = async (
    collections: Collection[],
  ): Promise<
    Map<string, { status: string | null; collectionId: string | null }>
  > => {
    if (!isAuthenticated) return new Map();

    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");

    // Only fetch job statuses for entries without collection_id AND that might match our collections
    const jobIdsToFetch = new Set<string>();

    collections.forEach((collection) => {
      // First check if this collection already has cached data with collection_id
      const cached = getCollectionDataByCollectionId(collection.id);
      if (!cached.job_id) {
        // No cached data found by collection_id, need to check all uncached jobs
        for (const [jobId, data] of Object.entries(cache)) {
          const cacheData = data as {
            name: string;
            description: string;
            collection_id?: string;
          };
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
          const result = await apiFetch<
            { data?: JobStatusData } & JobStatusData
          >(`/api/collections/jobs/${jobId}`, apiKey?.key ?? "");
          const jobData = result.data || result;
          const collectionId =
            jobData.collection?.id || jobData.collection_id || null;

          return {
            jobId,
            status: jobData.status || null,
            collectionId: collectionId,
          };
        } catch (error) {
          console.error("Error fetching job status:", error);
        }
        return { jobId, status: null, collectionId: null };
      }),
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
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const result = await apiFetch<CollectionResponse>(
        "/api/collections",
        apiKey?.key ?? "",
      );
      const collections = (
        Array.isArray(result.data) ? result.data : []
      ) as Collection[];

      // Pre-fetch job statuses only for collections that need it
      const jobStatusMap = await preFetchJobStatuses(collections);

      // Enrich collections with cached names and live status
      const enrichedCollections = await Promise.all(
        collections.map((collection: Collection) =>
          enrichCollectionWithCache(collection, jobStatusMap),
        ),
      );

      // Remove cache entries whose collection no longer exists on the backend
      const liveIds = new Set<string>(
        enrichedCollections.map((c: Collection) => c.id),
      );
      pruneStaleCache(liveIds);

      // Preserve optimistic entries not yet replaced by a real collection
      setCollections((prev) => {
        const fetchedJobIds = new Set(
          enrichedCollections.map((c: Collection) => c.job_id).filter(Boolean),
        );
        const activeOptimistic = prev.filter(
          (c) =>
            c.id.startsWith("optimistic-") &&
            (!c.job_id || !fetchedJobIds.has(c.job_id)),
        );
        // Sort by inserted_at in descending order (latest first)
        const combined = [...activeOptimistic, ...enrichedCollections];
        return combined.sort(
          (a, b) =>
            new Date(b.inserted_at).getTime() -
            new Date(a.inserted_at).getTime(),
        );
      });

      // If selectedCollection is optimistic and the real one just arrived, fetch full details
      // Extract the logic outside the updater to avoid side effects
      let replacementId: string | null = null;
      setSelectedCollection((prev) => {
        if (prev?.id.startsWith("optimistic-") && prev.job_id) {
          const replacement = enrichedCollections.find(
            (c: Collection) => c.job_id === prev.job_id,
          );
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
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available documents
  const fetchDocuments = async () => {
    if (!isAuthenticated) return;

    try {
      const result = await apiFetch<Document[] | DocumentResponse>(
        "/api/document",
        apiKey?.key ?? "",
      );

      // Handle both direct array and wrapped response
      const documentList = Array.isArray(result)
        ? result
        : (result as DocumentResponse).data || [];

      // Sort by inserted_at in descending order (latest first)
      const sortedDocuments = documentList.sort(
        (a: Document, b: Document) =>
          new Date(b.inserted_at || 0).getTime() -
          new Date(a.inserted_at || 0).getTime(),
      );

      setAvailableDocuments(sortedDocuments);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  // Fetch collection details with documents
  const fetchCollectionDetails = async (collectionId: string) => {
    if (!isAuthenticated) return;

    // Don't fetch optimistic collections from the server
    if (collectionId.startsWith("optimistic-")) {
      const optimisticCollection = collections.find(
        (c) => c.id === collectionId,
      );
      if (optimisticCollection) {
        setSelectedCollection(optimisticCollection);
      }
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiFetch<CollectionResponse & Collection>(
        `/api/collections/${collectionId}`,
        apiKey?.key ?? "",
      );

      // Handle different response formats
      const collectionData = (result.data as Collection) || result;

      // Get cached data to find the job_id
      const cached = getCollectionDataByCollectionId(collectionId);

      // If we have a job_id, fetch its status
      let status = undefined;
      if (cached.job_id) {
        try {
          const jobResult = await apiFetch<
            { data?: JobStatusData } & JobStatusData
          >(`/api/collections/jobs/${cached.job_id}`, apiKey?.key ?? "");
          const jobData = jobResult.data || jobResult;
          status = jobData.status || undefined;
        } catch (error) {
          console.error(
            "Error fetching job status for collection details:",
            error,
          );
        }
      }

      // Enrich the collection with cached name/description and live status
      const enrichedCollection = {
        ...collectionData,
        name: cached.name || collectionData.name || "Untitled Collection",
        description: cached.description || collectionData.description || "",
        status: status,
        job_id: cached.job_id,
      };

      setSelectedCollection(enrichedCollection);
    } catch (error) {
      console.error("Error fetching collection details:", error);
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
      if (!currentApiKey && !isAuthenticated) return;

      const jobs = activeJobsRef.current;
      if (jobs.size === 0) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        return;
      }

      let anyResolved = false;

      for (const [collectionId, jobId] of Array.from(jobs)) {
        try {
          const result = await apiFetch<
            { data?: JobStatusData } & JobStatusData
          >(`/api/collections/jobs/${jobId}`, currentApiKey?.key ?? "");
          const jobData = result.data || result;
          const status = jobData.status || null;
          const realCollectionId =
            jobData.collection?.id || jobData.collection_id || null;
          const knowledgeBaseId = jobData.collection?.knowledge_base_id || null;

          if (status) {
            // Always update status in UI (including in_progress/pending states)
            setCollections((prev) =>
              prev.map((c) => {
                // Update by collectionId OR by job_id (handles optimistic->real transition)
                if (c.id === collectionId || c.job_id === jobId) {
                  return {
                    ...c,
                    status,
                    knowledge_base_id: knowledgeBaseId || c.knowledge_base_id,
                  };
                }
                return c;
              }),
            );
            setSelectedCollection((prev) => {
              if (prev?.id === collectionId || prev?.job_id === jobId) {
                return {
                  ...prev,
                  status,
                  knowledge_base_id: knowledgeBaseId || prev?.knowledge_base_id,
                };
              }
              return prev;
            });

            // If job is complete (not pending/in_progress/processing), remove from polling and trigger full refresh
            const isComplete = !["pending", "processing"].includes(
              status.toLowerCase(),
            );
            if (isComplete) {
              jobs.delete(collectionId);
              anyResolved = true;

              // Persist real collectionId so enrichment finds it on next load
              if (collectionId.startsWith("optimistic-") && realCollectionId) {
                try {
                  const cache = JSON.parse(
                    localStorage.getItem(CACHE_KEY) || "{}",
                  );
                  const existing = cache[jobId] || {};
                  cache[jobId] = {
                    ...existing,
                    collection_id: realCollectionId,
                  };
                  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                } catch (e) {
                  console.error("Failed to update cache:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("Polling error for job", jobId, error);
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
    if (!isAuthenticated) {
      alert("Please log in to continue");
      return;
    }

    if (!collectionName.trim() || selectedDocuments.size === 0) {
      alert("Please provide a name and select at least one document");
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
    setCollectionName("");
    setCollectionDescription("");
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
      status: "pending",
      documents: optimisticDocuments,
    };

    setCollections((prev) => [optimisticCollection, ...prev]);
    setSelectedCollection(optimisticCollection);

    try {
      const result = await apiFetch<CreateCollectionResponse>(
        "/api/collections",
        apiKey?.key ?? "",
        {
          method: "POST",
          body: JSON.stringify({
            name: nameAtCreation,
            description: descriptionAtCreation,
            documents: docsAtCreation,
            provider: "openai",
          }),
        },
      );

      const jobId = result.data?.job_id;

      if (jobId) {
        saveCollectionData(jobId, nameAtCreation, descriptionAtCreation);

        // Attach job_id to the optimistic entry so polling picks it up
        setCollections((prev) =>
          prev.map((c) =>
            c.id === optimisticId ? { ...c, job_id: jobId } : c,
          ),
        );
        setSelectedCollection((prev) =>
          prev?.id === optimisticId ? { ...prev, job_id: jobId } : prev,
        );

        // Register for polling immediately — don't wait for the next collections render
        activeJobsRef.current.set(optimisticId, jobId);
        startPolling();
      } else {
        console.error(
          "No job ID found in response - cannot save name to cache",
        );
      }

      // Refresh the real list from the backend (replaces the optimistic entry once the backend knows about it)
      await fetchCollections();
    } catch (error) {
      console.error("Error creating knowledge base:", error);
      alert(
        `Failed to create knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setCollections((prev) => prev.filter((c) => c.id !== optimisticId));
      setSelectedCollection(null);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete collection - show confirmation modal
  const handleDeleteCollection = (collectionId: string) => {
    if (!isAuthenticated) return;
    setCollectionToDelete(collectionId);
    setShowConfirmDelete(true);
  };

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!collectionToDelete || !isAuthenticated) return;

    setShowConfirmDelete(false);
    const collectionId = collectionToDelete;
    setCollectionToDelete(null);

    // Store the original collection in case we need to restore it
    const originalCollection = collections.find((c) => c.id === collectionId);

    // Update status to "deleting" instead of removing immediately
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, status: "deleting" } : c,
      ),
    );
    setSelectedCollection((prev) =>
      prev?.id === collectionId ? { ...prev, status: "deleting" } : prev,
    );

    try {
      const result = await apiFetch<DeleteCollectionResponse>(
        `/api/collections/${collectionId}`,
        apiKey?.key ?? "",
        { method: "DELETE" },
      );

      const jobId = result.data?.job_id;

      if (jobId) {
        // Poll the delete job status
        const pollDeleteStatus = async () => {
          const currentApiKey = apiKeyRef.current;
          if (!currentApiKey) return;

          try {
            const jobResult = await apiFetch<
              { data?: JobStatusData } & JobStatusData
            >(`/api/collections/jobs/${jobId}`, currentApiKey?.key ?? "");
            const jobData = jobResult.data || jobResult;
            const status = jobData.status;
            const statusLower = status?.toLowerCase();

            if (statusLower === "successful") {
              // Job completed successfully - remove from UI and clean up cache
              deleteCollectionFromCache(collectionId);
              setCollections((prev) =>
                prev.filter((c) => c.id !== collectionId),
              );
              setSelectedCollection(null);
            } else if (statusLower === "failed") {
              // Job failed - restore original collection
              alert("Failed to delete collection");
              if (originalCollection) {
                setCollections((prev) =>
                  prev.map((c) =>
                    c.id === collectionId ? originalCollection : c,
                  ),
                );
                setSelectedCollection((prev) =>
                  prev?.id === collectionId ? originalCollection : prev,
                );
              }
            } else {
              // Still processing - keep status as "deleting" and poll again
              setTimeout(pollDeleteStatus, 2000); // Poll every 2 seconds
            }
          } catch (error) {
            console.error("Error polling delete status:", error);
            alert("Failed to check delete status");
            if (originalCollection) {
              setCollections((prev) =>
                prev.map((c) =>
                  c.id === collectionId ? originalCollection : c,
                ),
              );
              setSelectedCollection((prev) =>
                prev?.id === collectionId ? originalCollection : prev,
              );
            }
          }
        };

        // Start polling
        pollDeleteStatus();
      } else {
        // No job_id returned, assume immediate success
        deleteCollectionFromCache(collectionId);
        setCollections((prev) => prev.filter((c) => c.id !== collectionId));
        setSelectedCollection(null);
      }
    } catch (error) {
      console.error("Error deleting collection:", error);
      alert("Failed to delete collection");
      // Restore the original collection on error
      if (originalCollection) {
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? originalCollection : c)),
        );
        setSelectedCollection((prev) =>
          prev?.id === collectionId ? originalCollection : prev,
        );
      }
    }
  };

  // Fetch document details and set preview
  const fetchAndPreviewDoc = async (doc: Document) => {
    setPreviewDoc(doc);
    if (isAuthenticated) {
      try {
        const data = await apiFetch<DocumentDetailResponse & Document>(
          `/api/document/${doc.id}`,
          apiKey?.key ?? "",
        );
        const documentDetails = (data.data || data) as Document;
        setPreviewDoc(documentDetails);
      } catch (err) {
        console.error("Failed to fetch document details:", err);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchCollections();
      fetchDocuments();
    }
  }, [apiKey]);

  // Keep apiKeyRef in sync so polling always has the current key
  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey, isAuthenticated]);

  // Keep fetchCollectionsRef in sync so polling always has the current function
  useEffect(() => {
    fetchCollectionsRef.current = fetchCollections;
  }, [fetchCollections]);

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
      const isProcessing =
        c.status && ["pending", "processing"].includes(c.status.toLowerCase());

      if (isProcessing && c.job_id && !activeJobsRef.current.has(c.id)) {
        activeJobsRef.current.set(c.id, c.job_id);
        newJobAdded = true;
      }
    });

    if (newJobAdded && isAuthenticated) startPolling();
  }, [collections, isAuthenticated]);

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
    <div className="flex h-screen bg-bg-primary">
      <Sidebar collapsed={sidebarCollapsed} activeRoute="/knowledge-base" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Knowledge Base"
          subtitle="Manage your knowledge bases for RAG"
        />

        {/* Content Area - Split View */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Collections List */}
          <div className="w-1/3 border-r border-border flex flex-col">
            {/* Create Button */}
            <div className="px-6 py-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateForm(true);
                  setSelectedCollection(null);
                }}
              >
                + Create
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {isLoading && collections.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  Loading knowledge bases...
                </div>
              ) : collections.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  No knowledge bases yet. Create your first one!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {collections.map((collection) => {
                    const isSelected = selectedCollection?.id === collection.id;
                    return (
                      <button
                        key={collection.id}
                        onClick={() => {
                          setShowCreateForm(false);
                          setShowDocumentPicker(false);
                          fetchCollectionDetails(collection.id);
                        }}
                        className={`w-full text-left rounded-lg p-3 transition-all duration-150 border ${
                          isSelected
                            ? "bg-neutral-100 border-border font-semibold"
                            : "bg-white border-border hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <BookOpenIcon
                                className={`w-4 h-4 shrink-0 ${isSelected ? "text-text-primary" : "text-text-secondary"}`}
                              />
                              <h3 className="text-sm font-medium text-text-primary truncate">
                                {collection.name}
                              </h3>
                            </div>
                            {collection.description && (
                              <p className="text-xs text-text-secondary truncate pl-6">
                                {collection.description}
                              </p>
                            )}
                            <p className="text-xs text-text-secondary mt-0.5 pl-6">
                              {formatDate(collection.inserted_at)}
                            </p>
                          </div>
                          {!collection.id.startsWith("optimistic-") && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCollection(collection.id);
                              }}
                              className="p-1.5 rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                              title="Delete Knowledge Base"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="w-2/3 flex flex-col">
            {showCreateForm ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    Create Knowledge Base
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setShowDocumentPicker(false);
                      setCollectionName("");
                      setCollectionDescription("");
                      setSelectedDocuments(new Set());
                    }}
                    className="p-2 rounded-md text-text-secondary hover:bg-neutral-100 transition-colors"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Name Input */}
                <div className="mb-4">
                  <Field
                    label="Name *"
                    value={collectionName}
                    onChange={setCollectionName}
                    placeholder="Enter collection name"
                  />
                </div>

                {/* Description Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    Description
                  </label>
                  <textarea
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    placeholder="Enter collection description (optional)"
                    rows={3}
                    className="w-full px-4 py-2 rounded-md border border-border bg-bg-secondary text-text-primary text-sm resize-none focus:outline-none focus:ring-1 focus:ring-border"
                  />
                </div>

                {/* Document Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    Select Documents *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDocumentPicker(true)}
                    className="w-full px-4 py-3 rounded-md border border-border bg-bg-secondary text-text-primary text-left flex items-center justify-between hover:bg-neutral-100 transition-colors"
                  >
                    <span className="text-sm">
                      {selectedDocuments.size === 0
                        ? "Click to select documents"
                        : `${selectedDocuments.size} document${selectedDocuments.size > 1 ? "s" : ""} selected`}
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
                  </button>

                  {selectedDocuments.size > 0 && (
                    <div className="mt-3 space-y-2">
                      {Array.from(selectedDocuments).map((docId) => {
                        const doc = availableDocuments.find(
                          (d) => d.id === docId,
                        );
                        if (!doc) return null;
                        return (
                          <div
                            key={docId}
                            className="flex items-center justify-between p-2 rounded-md border border-border bg-bg-secondary"
                          >
                            <span className="text-sm text-text-primary truncate">
                              {doc.fname}
                            </span>
                            <button
                              onClick={() => toggleDocumentSelection(docId)}
                              className="ml-2 p-1 rounded-md text-text-secondary hover:text-red-500 transition-colors"
                            >
                              <CloseIcon className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleCreateClick}
                    disabled={
                      isCreating ||
                      !collectionName.trim() ||
                      selectedDocuments.size === 0
                    }
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            ) : selectedCollection ? (
              <>
                <div className="p-6 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-text-primary">
                        {selectedCollection.name}
                      </h2>
                      {selectedCollection.description && (
                        <p className="text-sm mt-1 text-text-secondary">
                          {selectedCollection.description}
                        </p>
                      )}
                    </div>
                    {!selectedCollection.id.startsWith("optimistic-") && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          handleDeleteCollection(selectedCollection.id)
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-3 mt-6">
                    <div className="flex items-center gap-3">
                      <div className="text-xs uppercase font-semibold text-text-secondary">
                        Status:
                      </div>
                      <div className="text-sm font-semibold text-text-primary">
                        {(selectedCollection.status || "N/A")
                          .replace(/_/g, " ")
                          .toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs uppercase font-semibold text-text-secondary">
                        Knowledge Base ID:
                      </div>
                      <div className="text-sm font-semibold text-text-primary">
                        {selectedCollection.knowledge_base_id || "N/A"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs uppercase font-semibold text-text-secondary">
                        Created:
                      </div>
                      <div className="text-sm font-semibold text-text-primary">
                        {formatDate(selectedCollection.inserted_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs uppercase font-semibold text-text-secondary">
                        Last Updated:
                      </div>
                      <div className="text-sm font-semibold text-text-primary">
                        {formatDate(selectedCollection.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-text-primary">
                      Documents Present (
                      {selectedCollection.documents?.length || 0})
                    </h3>
                    {selectedCollection.documents &&
                      selectedCollection.documents.length > 0 && (
                        <button
                          onClick={() => {
                            setShowDocPreviewModal(true);
                            fetchAndPreviewDoc(
                              selectedCollection.documents![0],
                            );
                          }}
                          className="text-xs px-3 py-1.5 rounded-md border border-border bg-bg-secondary text-text-primary hover:bg-neutral-100 transition-colors"
                        >
                          Preview
                        </button>
                      )}
                  </div>

                  {selectedCollection.documents &&
                  selectedCollection.documents.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold uppercase text-text-secondary">
                            Name
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <p className="text-[10px] font-semibold uppercase text-text-secondary">
                            Uploaded At
                          </p>
                        </div>
                      </div>

                      {/* Document Rows */}
                      <div className="space-y-2">
                        {selectedCollection.documents
                          .slice(
                            0,
                            showAllDocs
                              ? selectedCollection.documents.length
                              : 3,
                          )
                          .map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between py-1"
                            >
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm text-text-primary truncate">
                                  {doc.fname}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <p className="text-xs text-text-secondary">
                                  {doc.inserted_at
                                    ? formatDate(doc.inserted_at)
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Show More / Show Less Button */}
                      {selectedCollection.documents.length > 3 && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            onClick={() => setShowAllDocs(!showAllDocs)}
                          >
                            {showAllDocs
                              ? "Show Less"
                              : `Show More (${selectedCollection.documents.length - 3} more)`}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-center py-8 text-text-secondary">
                      No documents in this collection
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                Select a knowledge base to view details
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setCollectionToDelete(null);
        }}
        title="Delete Collection"
        maxWidth="max-w-md"
      >
        <div className="px-6 pb-6">
          <p className="text-sm text-text-secondary mb-6">
            Are you sure you want to delete this collection? This action cannot
            be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDelete(false);
                setCollectionToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showDocumentPicker}
        onClose={() => setShowDocumentPicker(false)}
        title="Select Documents"
      >
        <div className="p-6">
          <div className="mb-4">
            {availableDocuments.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-secondary">
                No documents available. Please upload documents first.
              </div>
            ) : (
              <div className="space-y-2">
                {availableDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className={`flex items-center p-4 rounded-md border cursor-pointer transition-colors ${
                      selectedDocuments.has(doc.id)
                        ? "bg-neutral-50 border-border"
                        : "border-transparent hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(doc.id)}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="mr-3 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {doc.fname}
                      </p>
                      <p className="text-xs mt-1 text-text-secondary">
                        ID: {doc.id.substring(0, 8)}...
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected Count and Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <p className="text-sm text-text-secondary">
              {selectedDocuments.size} document
              {selectedDocuments.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDocumentPicker(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowDocumentPicker(false)}
                disabled={selectedDocuments.size === 0}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showDocPreviewModal && !!selectedCollection?.documents}
        onClose={() => {
          setShowDocPreviewModal(false);
          setPreviewDoc(null);
        }}
        title="Document Preview"
        maxWidth="max-w-5xl"
        maxHeight="h-[80vh]"
      >
        <div className="flex flex-1 overflow-hidden h-full">
          <div
            className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-5xl h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-1 min-h-0">
              <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
                {selectedCollection?.documents?.map((doc: Document) => (
                  <button
                    key={doc.id}
                    onClick={() => fetchAndPreviewDoc(doc)}
                    className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                      previewDoc?.id === doc.id
                        ? "bg-neutral-100"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <p className="text-sm text-text-primary truncate">
                      {doc.fname}
                    </p>
                    {doc.inserted_at && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatDate(doc.inserted_at)}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 bg-neutral-50">
                {previewDoc?.signed_url ? (
                  <iframe
                    key={previewDoc.id}
                    src={previewDoc.signed_url}
                    title={previewDoc.fname}
                    className="w-full h-full border-none"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-text-secondary">
                      {previewDoc
                        ? "No preview available for this document"
                        : "Select a document to preview"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
