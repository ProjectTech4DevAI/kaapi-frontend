import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import {
  CollectionResponse,
  DocumentResponse,
  CreateCollectionResponse,
  DeleteCollectionResponse,
  DocumentDetailResponse,
} from "@/app/lib/types/knowledgeBase";
import { Document, Collection } from "@/app/lib/types/document";
import {
  saveCollectionData,
  getCollectionDataByCollectionId,
  deleteCollectionFromCache,
  pruneStaleCache,
  setCollectionIdForJob,
} from "@/app/lib/utils/knowledgeBaseCache";
import {
  enrichCollectionWithCache,
  preFetchJobStatuses,
  fetchJobStatus,
} from "@/app/lib/utils/collectionEnrichment";

interface CreateCollectionParams {
  name: string;
  description: string;
  documentIds: string[];
}

export function useCollections() {
  const { activeKey: apiKey, isAuthenticated } = useAuth();
  const toast = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const apiKeyRef = useRef<typeof apiKey>(null);
  const activeJobsRef = useRef<Map<string, string>>(new Map());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchCollectionsRef = useRef<(() => Promise<void>) | null>(null);
  const fetchDocumentsRef = useRef<(() => Promise<void>) | null>(null);

  const fetchCollectionDetails = useCallback(
    async (collectionId: string) => {
      if (!isAuthenticated) return;

      const fromList = collections.find((c) => c.id === collectionId);
      if (fromList) setSelectedCollection(fromList);

      if (collectionId.startsWith("optimistic-")) return;

      setIsLoadingDetail(true);
      try {
        const result = await apiFetch<CollectionResponse & Collection>(
          `/api/collections/${collectionId}`,
          apiKey?.key ?? "",
        );
        const collectionData = (result.data as Collection) || result;
        const cached = getCollectionDataByCollectionId(collectionId);

        let status: string | undefined = undefined;
        if (cached.job_id) {
          const jobData = await fetchJobStatus(
            cached.job_id,
            apiKey?.key ?? "",
          );
          status = jobData?.status || undefined;
        }

        setSelectedCollection({
          ...collectionData,
          name: cached.name || collectionData.name || "Untitled Collection",
          description: cached.description || collectionData.description || "",
          status,
          job_id: cached.job_id,
        });
      } catch (error) {
        console.error("Error fetching collection details:", error);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [apiKey, collections, isAuthenticated],
  );

  const fetchCollections = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const result = await apiFetch<CollectionResponse>(
        "/api/collections",
        apiKey?.key ?? "",
      );
      const list = (
        Array.isArray(result.data) ? result.data : []
      ) as Collection[];

      const jobStatusMap = await preFetchJobStatuses(list, apiKey?.key ?? "");
      const enriched = list.map((c) =>
        enrichCollectionWithCache(c, jobStatusMap),
      );

      pruneStaleCache(new Set<string>(enriched.map((c) => c.id)));

      setCollections((prev) => {
        const fetchedJobIds = new Set(
          enriched.map((c) => c.job_id).filter(Boolean),
        );
        const activeOptimistic = prev.filter(
          (c) =>
            c.id.startsWith("optimistic-") &&
            (!c.job_id || !fetchedJobIds.has(c.job_id)),
        );
        return [...activeOptimistic, ...enriched].sort(
          (a, b) =>
            new Date(b.inserted_at).getTime() -
            new Date(a.inserted_at).getTime(),
        );
      });

      let replacementId: string | null = null;
      setSelectedCollection((prev) => {
        if (prev?.id.startsWith("optimistic-") && prev.job_id) {
          const replacement = enriched.find((c) => c.job_id === prev.job_id);
          if (replacement) replacementId = replacement.id;
        }
        return prev;
      });

      if (replacementId) {
        fetchCollectionDetails(replacementId);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isAuthenticated, fetchCollectionDetails]);

  const fetchDocuments = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const result = await apiFetch<Document[] | DocumentResponse>(
        "/api/document",
        apiKey?.key ?? "",
      );
      const documentList = Array.isArray(result)
        ? result
        : (result as DocumentResponse).data || [];
      const sorted = documentList.sort(
        (a, b) =>
          new Date(b.inserted_at || 0).getTime() -
          new Date(a.inserted_at || 0).getTime(),
      );
      setAvailableDocuments(sorted);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  }, [apiKey, isAuthenticated]);

  const startPolling = useCallback(() => {
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
        const jobData = await fetchJobStatus(jobId, currentApiKey?.key ?? "");
        if (!jobData) continue;

        const status = jobData.status || null;
        const realCollectionId =
          jobData.collection?.id || jobData.collection_id || null;
        const knowledgeBaseId = jobData.collection?.knowledge_base_id || null;

        if (!status) continue;

        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId || c.job_id === jobId
              ? {
                  ...c,
                  status,
                  knowledge_base_id: knowledgeBaseId || c.knowledge_base_id,
                }
              : c,
          ),
        );
        setSelectedCollection((prev) =>
          prev?.id === collectionId || prev?.job_id === jobId
            ? {
                ...prev,
                status,
                knowledge_base_id: knowledgeBaseId || prev?.knowledge_base_id,
              }
            : prev,
        );

        const isComplete = !["pending", "processing"].includes(
          status.toLowerCase(),
        );
        if (isComplete) {
          jobs.delete(collectionId);
          anyResolved = true;
          if (collectionId.startsWith("optimistic-") && realCollectionId) {
            setCollectionIdForJob(jobId, realCollectionId);
          }
        }
      }

      if (anyResolved && fetchCollectionsRef.current) {
        fetchCollectionsRef.current();
      }
    }, 5000);
  }, [isAuthenticated]);

  const createCollection = useCallback(
    async ({ name, description, documentIds }: CreateCollectionParams) => {
      if (!isAuthenticated) {
        toast.error("Please log in to continue");
        return;
      }
      if (!name.trim() || documentIds.length === 0) {
        toast.error("Please provide a name and select at least one document");
        return;
      }

      setIsCreating(true);

      const optimisticId = `optimistic-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticDocuments: Document[] = documentIds
        .map((id) => availableDocuments.find((d) => d.id === id))
        .filter((d): d is Document => !!d);

      const optimisticCollection: Collection = {
        id: optimisticId,
        name,
        description,
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
              name,
              description,
              documents: documentIds,
              provider: "openai",
            }),
          },
        );

        const jobId = result.data?.job_id;
        if (jobId) {
          saveCollectionData(jobId, name, description);
          setCollections((prev) =>
            prev.map((c) =>
              c.id === optimisticId ? { ...c, job_id: jobId } : c,
            ),
          );
          setSelectedCollection((prev) =>
            prev?.id === optimisticId ? { ...prev, job_id: jobId } : prev,
          );
          activeJobsRef.current.set(optimisticId, jobId);
          startPolling();
        } else {
          console.error("No job ID found in response");
        }

        await fetchCollections();
      } catch (error) {
        console.error("Error creating knowledge base:", error);
        toast.error(
          `Failed to create knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        setCollections((prev) => prev.filter((c) => c.id !== optimisticId));
        setSelectedCollection(null);
      } finally {
        setIsCreating(false);
      }
    },
    [
      apiKey,
      availableDocuments,
      fetchCollections,
      isAuthenticated,
      startPolling,
      toast,
    ],
  );

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      if (!isAuthenticated) return;

      const originalCollection = collections.find((c) => c.id === collectionId);

      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, status: "deleting" } : c,
        ),
      );
      setSelectedCollection((prev) =>
        prev?.id === collectionId ? { ...prev, status: "deleting" } : prev,
      );

      const restoreOnFailure = () => {
        if (originalCollection) {
          setCollections((prev) =>
            prev.map((c) => (c.id === collectionId ? originalCollection : c)),
          );
          setSelectedCollection((prev) =>
            prev?.id === collectionId ? originalCollection : prev,
          );
        }
      };

      try {
        const result = await apiFetch<DeleteCollectionResponse>(
          `/api/collections/${collectionId}`,
          apiKey?.key ?? "",
          { method: "DELETE" },
        );

        const jobId = result.data?.job_id;

        if (!jobId) {
          deleteCollectionFromCache(collectionId);
          setCollections((prev) => prev.filter((c) => c.id !== collectionId));
          setSelectedCollection(null);
          return;
        }

        const pollDeleteStatus = async () => {
          const currentApiKey = apiKeyRef.current;
          if (!currentApiKey) return;

          const jobData = await fetchJobStatus(jobId, currentApiKey?.key ?? "");
          if (!jobData) {
            toast.error("Failed to check delete status");
            restoreOnFailure();
            return;
          }

          const statusLower = jobData.status?.toLowerCase();
          if (statusLower === "successful") {
            deleteCollectionFromCache(collectionId);
            setCollections((prev) => prev.filter((c) => c.id !== collectionId));
            setSelectedCollection(null);
            toast.success("Knowledge base deleted");
          } else if (statusLower === "failed") {
            toast.error("Failed to delete collection");
            restoreOnFailure();
          } else {
            setTimeout(pollDeleteStatus, 2000);
          }
        };

        pollDeleteStatus();
      } catch (error) {
        console.error("Error deleting collection:", error);
        toast.error("Failed to delete collection");
        restoreOnFailure();
      }
    },
    [apiKey, collections, isAuthenticated, toast],
  );

  const fetchAndPreviewDoc = useCallback(
    async (doc: Document): Promise<Document> => {
      if (!isAuthenticated) return doc;
      try {
        const data = await apiFetch<DocumentDetailResponse & Document>(
          `/api/document/${doc.id}`,
          apiKey?.key ?? "",
        );
        return (data.data || data) as Document;
      } catch (err) {
        console.error("Failed to fetch document details:", err);
        return doc;
      }
    },
    [apiKey, isAuthenticated],
  );

  useEffect(() => {
    fetchCollectionsRef.current = fetchCollections;
  }, [fetchCollections]);

  useEffect(() => {
    fetchDocumentsRef.current = fetchDocuments;
  }, [fetchDocuments]);

  useEffect(() => {
    if (!isAuthenticated || !apiKey) return;
    fetchCollectionsRef.current?.();
    fetchDocumentsRef.current?.();
  }, [apiKey, isAuthenticated]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  useEffect(() => {
    const currentIds = new Set(collections.map((c) => c.id));
    for (const [id] of Array.from(activeJobsRef.current)) {
      if (!currentIds.has(id)) activeJobsRef.current.delete(id);
    }

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
  }, [collections, isAuthenticated, startPolling]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  return {
    collections,
    availableDocuments,
    selectedCollection,
    isLoading,
    isLoadingDetail,
    isCreating,
    setSelectedCollection,
    fetchCollectionDetails,
    createCollection,
    deleteCollection,
    fetchAndPreviewDoc,
  };
}
