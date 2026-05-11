import { apiFetch } from "@/app/lib/apiClient";
import { JobStatusData } from "@/app/lib/types/knowledgeBase";
import { Collection } from "@/app/lib/types/document";
import {
  saveCollectionData,
  getCollectionDataByCollectionId,
  getEntriesWithoutCollectionId,
  setCollectionIdForJob,
} from "./knowledgeBaseCache";

export type JobStatusMap = Map<
  string,
  { status: string | null; collectionId: string | null }
>;

export const enrichCollectionWithCache = (
  collection: Collection,
  jobStatusMap: JobStatusMap,
): Collection => {
  const cached = getCollectionDataByCollectionId(collection.id);

  let jobId = cached.job_id;
  let collectionJobStatus: string | null = null;
  let name = cached.name;
  let description = cached.description;

  if (!jobId) {
    for (const entry of getEntriesWithoutCollectionId()) {
      const jobInfo = jobStatusMap.get(entry.jobId);
      if (jobInfo?.collectionId === collection.id) {
        jobId = entry.jobId;
        name = entry.name;
        description = entry.description;
        collectionJobStatus = jobInfo.status;
        setCollectionIdForJob(entry.jobId, collection.id);
        break;
      }
    }
  }

  if (jobId && !collectionJobStatus) {
    const jobInfo = jobStatusMap.get(jobId);
    if (jobInfo?.status) {
      collectionJobStatus = jobInfo.status;
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

export const preFetchJobStatuses = async (
  collections: Collection[],
  apiKey: string,
): Promise<JobStatusMap> => {
  const jobIdsToFetch = new Set<string>();
  collections.forEach((collection) => {
    const cached = getCollectionDataByCollectionId(collection.id);
    if (!cached.job_id) {
      for (const entry of getEntriesWithoutCollectionId()) {
        jobIdsToFetch.add(entry.jobId);
      }
    }
  });

  if (jobIdsToFetch.size === 0) return new Map();

  const results = await Promise.all(
    Array.from(jobIdsToFetch).map(async (jobId) => {
      try {
        const result = await apiFetch<{ data?: JobStatusData } & JobStatusData>(
          `/api/collections/jobs/${jobId}`,
          apiKey,
        );
        const jobData = result.data || result;
        const collectionId =
          jobData.collection?.id || jobData.collection_id || null;
        return {
          jobId,
          status: jobData.status || null,
          collectionId,
        };
      } catch (error) {
        console.error("Error fetching job status:", error);
      }
      return { jobId, status: null, collectionId: null };
    }),
  );

  const jobStatusMap: JobStatusMap = new Map();
  results.forEach(({ jobId, status, collectionId }) => {
    jobStatusMap.set(jobId, { status, collectionId });
  });
  return jobStatusMap;
};

export const fetchJobStatus = async (
  jobId: string,
  apiKey: string,
): Promise<JobStatusData | null> => {
  try {
    const result = await apiFetch<{ data?: JobStatusData } & JobStatusData>(
      `/api/collections/jobs/${jobId}`,
      apiKey,
    );
    return result.data || result;
  } catch (error) {
    console.error("Error fetching job status:", error);
    return null;
  }
};
