import { useState, useEffect, useCallback } from 'react';
import type { SupportTicketWithRelations, TicketStatus, TicketPriority } from '@/types/tickets';

// ============================================================================
// USE TICKET HOOK
// ============================================================================
// Fetches and manages single ticket with full relations
// Supports updating status and priority
// ============================================================================

interface UseTicketOptions {
  ticketId: string;
  isAdmin?: boolean;
}

interface UseTicketResult {
  ticket: SupportTicketWithRelations | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateStatus: (status: TicketStatus) => Promise<void>;
  updatePriority: (priority: TicketPriority) => Promise<void>;
  assignTo: (userId: string | null) => Promise<void>;
  markAsRead: () => Promise<void>;
}

export function useTicket({ ticketId, isAdmin = false }: UseTicketOptions): UseTicketResult {
  const [ticket, setTicket] = useState<SupportTicketWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const endpoint = isAdmin ? `/api/admin/tickets/${ticketId}` : `/api/tickets/${ticketId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Failed to fetch ticket: ${response.statusText}`);
      }

      const data = await response.json();
      setTicket(data);
    } catch (err: any) {
      console.error('Error fetching ticket:', err);
      setError(err.message || 'Failed to load ticket');
      setTicket(null);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [ticketId, isAdmin]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const updateStatus = useCallback(
    async (status: TicketStatus) => {
      if (!ticket) return;

      try {
        const response = await fetch(`/api/admin/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update status: ${response.statusText}`);
        }

        // Refetch to get updated ticket
        await fetchTicket();
      } catch (err: any) {
        console.error('Error updating status:', err);
        throw err;
      }
    },
    [ticket, ticketId, fetchTicket]
  );

  const updatePriority = useCallback(
    async (priority: TicketPriority) => {
      if (!ticket) return;

      try {
        const response = await fetch(`/api/admin/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update priority: ${response.statusText}`);
        }

        await fetchTicket();
      } catch (err: any) {
        console.error('Error updating priority:', err);
        throw err;
      }
    },
    [ticket, ticketId, fetchTicket]
  );

  const assignTo = useCallback(
    async (userId: string | null) => {
      if (!ticket) return;

      try {
        const response = await fetch(`/api/admin/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_to: userId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to assign ticket: ${response.statusText}`);
        }

        await fetchTicket();
      } catch (err: any) {
        console.error('Error assigning ticket:', err);
        throw err;
      }
    },
    [ticket, ticketId, fetchTicket]
  );

  const markAsRead = useCallback(async () => {
    try {
      await fetch(`/api/admin/tickets/${ticketId}/mark-read`, {
        method: 'POST',
      });
      // Silently refetch to update unread count (no loading flicker)
      await fetchTicket(false);
    } catch (err: any) {
      console.error('Error marking ticket as read:', err);
      // Non-critical, don't throw
    }
  }, [ticketId, fetchTicket]);

  return {
    ticket,
    isLoading,
    error,
    refetch: fetchTicket,
    updateStatus,
    updatePriority,
    assignTo,
    markAsRead,
  };
}
