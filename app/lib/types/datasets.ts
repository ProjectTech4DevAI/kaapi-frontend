export interface Dataset {
  dataset_id: number;
  dataset_name: string;
  description?: string;
  total_items: number;
  original_items: number;
  duplication_factor: number;
  langfuse_dataset_id: string;
  object_store_url: string;
}
