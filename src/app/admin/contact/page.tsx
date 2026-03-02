"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Inbox,
  Mail,
  Search,
  Loader2,
  Calendar,
} from '@/components/ui/icons';

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export default function AdminContactPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      // Table may not exist yet
      if (error?.code === '42P01') {
        setSubmissions([]);
      } else {
        console.error('Error fetching contact submissions:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredSubmissions = submissions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.message.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Contact Submissions</h1>
          <p className="text-theme-tertiary">Messages received from the contact form</p>
        </div>
        <div className="text-theme-tertiary text-sm">
          {submissions.length} total
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-black/[0.12] rounded-xl text-theme-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 focus:border-[#D37E91]/40"
        />
      </div>

      {/* Submissions Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-4 text-theme-tertiary font-medium">From</th>
              <th className="text-left p-4 text-theme-tertiary font-medium">Message</th>
              <th className="text-left p-4 text-theme-tertiary font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 min-w-[200px]">
                  <div className="text-theme-primary font-medium">{s.name}</div>
                  <div className="text-theme-tertiary text-sm flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    <a href={`mailto:${s.email}`} className="hover:text-[#D37E91] transition-colors">
                      {s.email}
                    </a>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-theme-secondary text-sm whitespace-pre-line line-clamp-3">{s.message}</p>
                </td>
                <td className="p-4 text-theme-tertiary text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(s.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-xs mt-0.5 text-theme-tertiary/70">
                    {new Date(s.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSubmissions.length === 0 && (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-theme-tertiary">
              {searchTerm ? 'No submissions match your search' : 'No contact submissions yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
