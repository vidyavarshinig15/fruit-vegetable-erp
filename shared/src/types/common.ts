/**
 * Standard API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error?: {
    code: string;
    details?: unknown;
  };
}

/**
 * Base Entity with Shop Scoping
 */
export interface BaseShopEntity {
  id: string;
  shopId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination Query Parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
