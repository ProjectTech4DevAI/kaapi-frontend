export interface PaginatedResponse<T> {
  success: boolean;
  data: T[] | null;
  error?: string | null;
  metadata?: { has_more?: boolean } | null;
}

export interface UsePaginatedListResult<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}
