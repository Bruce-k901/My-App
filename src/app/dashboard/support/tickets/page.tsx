'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Ticket, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Image as ImageIcon,
  User,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare
} from '@/components/ui/icons';

interface SupportTicket {
  id: string;
  company_id: string;
  site_id: string | null;
  created_by: string;
  assigned_to: string | null;
  type: 'issue' | 'idea' | 'question';
  module: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  page_url: string | null;
  created_at: string;
  updated_at: string;
  created_by_profile?: { full_name: string; email: string };
  assigned_to_profile?: { full_name: string; email: string };
  attachments?: TicketAttachment[];
}

interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export default function TicketsPage() {
  const { profile, companyId } = useAppContext();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filters, setFilters] = useState({
    status: 'all' as string,
    type: 'all' as string,
    module: 'all' as string,
    priority: 'all' as string,
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Check if user is admin or owner
  const isAdmin = profile?.app_role === 'owner' || profile?.app_role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchTickets();
  }, [companyId, isAdmin, filters]);

  const fetchTickets = async () => {
    if (!companyId) return;

    setLoading(true);

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        created_by_profile:profiles!support_tickets_created_by_fkey(full_name, email),
        assigned_to_profile:profiles!support_tickets_assigned_to_fkey(full_name, email)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }
    if (filters.module !== 'all') {
      query = query.eq('module', filters.module);
    }
    if (filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
    } else {
      // Fetch attachments for each ticket
      const ticketsWithAttachments = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: attachments } = await supabase
            .from('ticket_attachments')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: false });

          return {
            ...ticket,
            attachments: attachments || []
          };
        })
      );

      setTickets(ticketsWithAttachments as SupportTicket[]);
    }

    setLoading(false);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      console.error('Error updating ticket:', error);
    } else {
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus as any });
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Ticket className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400 bg-red-500/20 border-red-500/40';
      case 'high':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'low':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/40';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    }
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      checkly: 'text-[#D37E91] bg-[#D37E91]/25 border-[#D37E91]/40',
      stockly: 'text-green-400 bg-green-500/20 border-green-500/40',
      teamly: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
      planly: 'text-teal-400 bg-teal-500/20 border-teal-500/40',
      assetly: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40',
      msgly: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
      general: 'text-gray-400 bg-gray-500/20 border-gray-500/40'
    };
    return colors[module] || colors.general;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Restricted</h2>
          <p className="text-gray-400">Only administrators and owners can view support tickets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Support Tickets</h1>
          <p className="text-gray-400 text-sm">Manage and track support requests from your team</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white hover:bg-white/[0.1] transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search tickets..."
                  className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              >
                <option value="all">All</option>
                <option value="issue">Issue</option>
                <option value="idea">Idea</option>
                <option value="question">Question</option>
              </select>
            </div>

            {/* Module */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Module</label>
              <select
                value={filters.module}
                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
              >
                <option value="all">All</option>
                <option value="checkly">Checkly</option>
                <option value="stockly">Stockly</option>
                <option value="teamly">Teamly</option>
                <option value="planly">Planly</option>
                <option value="assetly">Assetly</option>
                <option value="msgly">Msgly</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading tickets...</p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No tickets found</h2>
            <p className="text-gray-400">No tickets match your current filters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 bg-white/[0.03] border rounded-lg cursor-pointer transition-colors ${
                  selectedTicket?.id === ticket.id
                    ? 'border-[#D37E91]/40 bg-[#D37E91]/15'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white text-sm line-clamp-2">{ticket.title}</h3>
                  {getStatusIcon(ticket.status)}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs border ${getModuleColor(ticket.module)}`}>
                    {ticket.module}
                  </span>
                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <ImageIcon className="w-3 h-3" />
                      {ticket.attachments.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Ticket Detail */}
          {selectedTicket && (
            <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-white">{selectedTicket.title}</h2>
                    {getStatusIcon(selectedTicket.status)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs border ${getModuleColor(selectedTicket.module)}`}>
                      {selectedTicket.module}
                    </span>
                    <span className="px-2 py-1 rounded text-xs border border-white/20 text-white/60">
                      {selectedTicket.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-300">Status:</label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                  className="px-3 py-1 bg-white/[0.06] border border-white/[0.1] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Description</h3>
                <div className="p-4 bg-white/[0.06] border border-white/[0.1] rounded-lg">
                  <p className="text-white/90 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {selectedTicket.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/support-tickets/${attachment.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-white/[0.06] border border-white/[0.1] rounded-lg hover:bg-white/[0.1] transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white/80">{attachment.file_name}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {(attachment.file_size / 1024).toFixed(1)} KB
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Created By</p>
                  <p className="text-sm text-white">
                    {selectedTicket.created_by_profile?.full_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Assigned To</p>
                  <p className="text-sm text-white">
                    {selectedTicket.assigned_to_profile?.full_name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Created</p>
                  <p className="text-sm text-white">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedTicket.page_url && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Page URL</p>
                    <a
                      href={selectedTicket.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#D37E91] hover:text-[#D37E91]"
                    >
                      View Page
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
