import { Document } from "./document";

export interface Collection {
  id: string;
  name?: string;
  description?: string;
  knowledge_base_id?: string;
  inserted_at: string;
  updated_at: string;
  status?: string;
  job_id?: string;
  documents?: Document[];
}

export interface JobStatusData {
  status?: string | null;
  collection?: { id?: string; knowledge_base_id?: string };
  collection_id?: string | null;
}

export interface CollectionResponse {
  data?: Collection[] | Collection;
}

export interface DocumentResponse {
  data?: Document[];
}

export interface CreateCollectionResponse {
  data?: { job_id?: string };
}

export interface DeleteCollectionResponse {
  data?: { job_id?: string };
}

export interface DocumentDetailResponse {
  data?: Document;
}
