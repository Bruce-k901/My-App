import { useState, useEffect, useCallback } from 'react';
import type { TicketListItem, TicketFilters, TicketSortOptions } from '@/types/tickets';

// ============================================================================
// USE TICKETS HOOK
// ============================================================================
// Fetches and manages ticket list with filtering and pagination
// Used by admin ticket list page
// ============================================================================

interface UseTicketsOptions {
  filters?: TicketFilters;
  sort?: TicketSortOptions;
  pageSize?: number;
}

interface UseTicketsResult {
  tickets: TicketListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  nextPage: () => void;
  prevPage: () => void;
  setFilters: (filters: TicketFilters) => void;
  setSort: (sort: TicketSortOptions) => void;
}

export function useTickets(options: UseTicketsOptions = {}): UseTicketsResult {
  const { filters: initialFilters, sort: initialSort, pageSize: initialPageSize = 20 } = options;

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TicketFilters>(initialFilters || {});
  const [sort, setSortState] = useState<TicketSortOptions>(
    initialSort || { field: 'created_at', direction: 'desc' }
  );

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query string
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortField: sort.field,
        sortDirection: sort.direction,
      });

      // Add filters
      if (filters.status && filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.priority && filters.priority.length > 0) {
        params.append('priority', filters.priority.join(','));
      }
      if (filters.type && filters.type.length > 0) {
        params.append('type', filters.type.join(','));
      }
      if (filters.module && filters.module.length > 0) {
        params.append('module', filters.module.join(','));
      }
      if (filters.assignedTo && filters.assignedTo.length > 0) {
        params.append('assignedTo', filters.assignedTo.join(','));
      }
      if (filters.createdBy && filters.createdBy.length > 0) {
        params.append('createdBy', filters.createdBy.join(','));
      }
      if (filters.companyId && filters.companyId.length > 0) {
        params.append('companyId', filters.companyId.join(','));
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`/api/admin/tickets?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`);
      }

      const data = await response.json();

      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters, sort]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const nextPage = useCallback(() => {
    if (hasMore) {
      setPage((p) => p + 1);
    }
  }, [hasMore]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  }, [page]);

  const setFilters = useCallback((newFilters: TicketFilters) => {
    setFiltersState(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const setSort = useCallback((newSort: TicketSortOptions) => {
    setSortState(newSort);
    setPage(1); // Reset to first page when sort changes
  }, []);

  return {
    tickets,
    total,
    page,
    pageSize,
    hasMore,
    isLoading,
    error,
    refetch: fetchTickets,
    nextPage,
    prevPage,
    setFilters,
    setSort,
  };
}
