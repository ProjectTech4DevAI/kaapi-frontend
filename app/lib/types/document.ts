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
  knowledge_base_id?: string;
  inserted_at: string;
  updated_at: string;
  status?: string;
  job_id?: string;
  documents?: Document[];
}
