/**
 * LocalStorage cache for knowledge-base collections.
 */

const CACHE_KEY = "collection_job_cache";

interface CacheEntry {
  name: string;
  description: string;
  collection_id?: string;
}

type Cache = Record<string, CacheEntry>;

const readCache = (): Cache => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Cache;
  } catch (e) {
    console.error("Failed to read collection cache:", e);
    return {};
  }
};

const writeCache = (cache: Cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to write collection cache:", e);
  }
};

export const saveCollectionData = (
  jobId: string,
  name: string,
  description: string,
  collectionId?: string,
) => {
  const cache = readCache();
  cache[jobId] = { name, description, collection_id: collectionId };
  writeCache(cache);
};

export const getCollectionDataByCollectionId = (
  collectionId: string,
): { name?: string; description?: string; job_id?: string } => {
  const cache = readCache();
  for (const [jobId, data] of Object.entries(cache)) {
    if (data.collection_id === collectionId) {
      return {
        name: data.name,
        description: data.description,
        job_id: jobId,
      };
    }
  }
  return {};
};

export const deleteCollectionFromCache = (collectionId: string) => {
  const cache = readCache();
  for (const [jobId, data] of Object.entries(cache)) {
    if (data.collection_id === collectionId) {
      delete cache[jobId];
      break;
    }
  }
  writeCache(cache);
};

export const pruneStaleCache = (liveCollectionIds: Set<string>) => {
  const cache = readCache();
  let changed = false;
  for (const [jobId, data] of Object.entries(cache)) {
    if (data.collection_id && !liveCollectionIds.has(data.collection_id)) {
      delete cache[jobId];
      changed = true;
    }
  }
  if (changed) writeCache(cache);
};

export const getEntriesWithoutCollectionId = (): Array<{
  jobId: string;
  name: string;
  description: string;
}> => {
  const cache = readCache();
  return Object.entries(cache)
    .filter(([, data]) => !data.collection_id)
    .map(([jobId, data]) => ({
      jobId,
      name: data.name,
      description: data.description,
    }));
};

export const setCollectionIdForJob = (jobId: string, collectionId: string) => {
  const cache = readCache();
  if (cache[jobId]) {
    cache[jobId] = { ...cache[jobId], collection_id: collectionId };
    writeCache(cache);
  }
};
