'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  AlertTriangle,
  MessageSquare,
  CreditCard,
  Loader2,
  ChevronRight,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

type Tab = 'issues' | 'messages' | 'credits';

interface Issue {
  id: string;
  issue_number?: string;
  issue_type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  order?: { id: string; delivery_date: string } | null;
  customer?: { id: string; name: string; email: string } | null;
}

interface MessageThread {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  last_message_at: string;
  last_message?: { content: string; created_at: string; sender_type: string } | null;
  unread_count: number;
  customer?: { id: string; name: string; email: string } | null;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  sender_name?: string;
  created_at: string;
  attachments?: any[];
}

interface CreditRequest {
  id: string;
  reason: string;
  requested_amount: number;
  approved_amount?: number;
  status: string;
  created_at: string;
  order?: { id: string; delivery_date: string } | null;
  issue?: { id: string; issue_number: string; title: string } | null;
  customer?: { id: string; name: string; email: string } | null;
}

interface IssueComment {
  id: string;
  comment: string;
  commenter_type: string;
  commenter_name?: string;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function CustomerSupportPage() {
  const { companyId } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('issues');
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [credits, setCredits] = useState<CreditRequest[]>([]);

  // Detail views
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueComments, setIssueComments] = useState<IssueComment[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'issues') {
        const res = await fetch('/api/planly/customer-support/issues');
        if (res.ok) {
          const data = await res.json();
          setIssues(data.data || []);
        }
      } else if (activeTab === 'messages') {
        const res = await fetch('/api/planly/customer-support/messages');
        if (res.ok) {
          const data = await res.json();
          setThreads(data.data || []);
        }
      } else if (activeTab === 'credits') {
        const res = await fetch('/api/planly/customer-support/credit-requests');
        if (res.ok) {
          const data = await res.json();
          setCredits(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openIssue(issue: Issue) {
    setSelectedIssue(issue);
    try {
      const res = await fetch(`/api/planly/customer-support/issues/${issue.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setIssueComments(data.data || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async function openThread(thread: MessageThread) {
    setSelectedThread(thread);
    try {
      const res = await fetch(`/api/planly/customer-support/messages/${thread.id}`);
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(data.data?.messages || []);
        setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread_count: 0 } : t));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);

    try {
      if (selectedThread) {
        const res = await fetch(`/api/planly/customer-support/messages/${selectedThread.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: replyText }),
        });
        if (res.ok) {
          const data = await res.json();
          setThreadMessages(prev => [...prev, data.data]);
          setReplyText('');
        }
      } else if (selectedIssue) {
        const res = await fetch(`/api/planly/customer-support/issues/${selectedIssue.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: replyText }),
        });
        if (res.ok) {
          const data = await res.json();
          setIssueComments(prev => [...prev, data.data]);
          setReplyText('');
          setSelectedIssue(prev => prev ? { ...prev, status: 'in_progress' } : null);
        }
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  }

  async function updateIssueStatus(issueId: string, status: string) {
    try {
      const res = await fetch('/api/planly/customer-support/issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_id: issueId, status }),
      });
      if (res.ok) {
        setSelectedIssue(prev => prev ? { ...prev, status } : null);
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status } : i));
      }
    } catch (error) {
      console.error('Error updating issue:', error);
    }
  }

  async function updateCreditStatus(id: string, status: string, approved_amount?: number) {
    try {
      const res = await fetch('/api/planly/customer-support/credit-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, approved_amount }),
      });
      if (res.ok) {
        setCredits(prev => prev.map(c => c.id === id ? { ...c, status, approved_amount } : c));
      }
    } catch (error) {
      console.error('Error updating credit request:', error);
    }
  }

  // Detail view: Issue
  if (selectedIssue) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <button
          onClick={() => { setSelectedIssue(null); setIssueComments([]); setReplyText(''); }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to issues
        </button>

        <div className="bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedIssue.title}</h2>
              <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
                {selectedIssue.customer?.name || 'Unknown Customer'} &middot;{' '}
                {format(new Date(selectedIssue.created_at), 'd MMM yyyy HH:mm')}
              </p>
            </div>
            <StatusBadge status={selectedIssue.status} />
          </div>

          <div className="text-sm text-gray-500 dark:text-white/60 mb-2">Type: {selectedIssue.issue_type}</div>
          {selectedIssue.order && (
            <div className="text-sm text-gray-500 dark:text-white/60 mb-2">
              Related order: {format(new Date(selectedIssue.order.delivery_date), 'd MMM yyyy')}
            </div>
          )}
          <p className="text-gray-700 dark:text-white/80 mt-4 whitespace-pre-wrap">{selectedIssue.description}</p>

          {selectedIssue.status !== 'resolved' && selectedIssue.status !== 'closed' && (
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => updateIssueStatus(selectedIssue.id, 'resolved')}
                className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-500/30 dark:hover:bg-green-500/10"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Resolve
              </Button>
              <Button
                variant="outline"
                onClick={() => updateIssueStatus(selectedIssue.id, 'closed')}
                className="text-gray-400 border-gray-200 hover:bg-gray-50 dark:text-white/40 dark:border-white/10 dark:hover:bg-white/5"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-3 mb-4">
          {issueComments.map(c => (
            <div
              key={c.id}
              className={`rounded-xl p-4 ${
                c.commenter_type === 'admin'
                  ? 'bg-orange-50 border border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20 ml-8'
                  : 'bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-700 dark:text-white/80">
                  {c.commenter_type === 'admin' ? (c.commenter_name || 'You') : 'Customer'}
                </span>
                <span className="text-xs text-gray-400 dark:text-white/40">
                  {format(new Date(c.created_at), 'd MMM HH:mm')}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-white/70 whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <div className="bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-4">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a response..."
            className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 border-none outline-none resize-none min-h-[80px]"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Send className="w-4 h-4 mr-1" />
              {sending ? 'Sending...' : 'Reply'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Detail view: Message Thread
  if (selectedThread) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <button
          onClick={() => { setSelectedThread(null); setThreadMessages([]); setReplyText(''); }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to messages
        </button>

        <div className="bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedThread.subject || 'No subject'}</h2>
          <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
            {selectedThread.customer?.name || 'Unknown Customer'} &middot;{' '}
            {format(new Date(selectedThread.created_at), 'd MMM yyyy')}
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-4">
          {threadMessages.map(m => (
            <div
              key={m.id}
              className={`rounded-xl p-4 ${
                m.sender_type === 'admin'
                  ? 'bg-orange-50 border border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20 ml-8'
                  : 'bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-700 dark:text-white/80">
                  {m.sender_type === 'admin' ? (m.sender_name || 'You') : 'Customer'}
                </span>
                <span className="text-xs text-gray-400 dark:text-white/40">
                  {format(new Date(m.created_at), 'd MMM HH:mm')}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-white/70 whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <div className="bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-4">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 border-none outline-none resize-none min-h-[80px]"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={sendReply}
              disabled={sending || !replyText.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Send className="w-4 h-4 mr-1" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Tabs + counts
  const tabCounts = {
    issues: issues.filter(i => i.status === 'open' || i.status === 'in_progress').length,
    messages: threads.reduce((sum, t) => sum + t.unread_count, 0),
    credits: credits.filter(c => c.status === 'pending').length,
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'issues', label: 'Issues', icon: AlertTriangle },
    { key: 'messages', label: 'Messages', icon: MessageSquare },
    { key: 'credits', label: 'Credit Requests', icon: CreditCard },
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Customer Support</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-white/[0.06] pb-3">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-orange-500 text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Issues List */}
          {activeTab === 'issues' && (
            <div className="space-y-2">
              {issues.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-white/40">No customer issues yet</div>
              ) : (
                issues.map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => openIssue(issue)}
                    className="w-full text-left bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-900 dark:text-white font-medium truncate">{issue.title}</span>
                          <StatusBadge status={issue.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-white/40">
                          <span>{issue.customer?.name || 'Unknown'}</span>
                          <span>{issue.issue_type}</span>
                          <span>{format(new Date(issue.created_at), 'd MMM yyyy')}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/30 flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Messages List */}
          {activeTab === 'messages' && (
            <div className="space-y-2">
              {threads.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-white/40">No customer messages yet</div>
              ) : (
                threads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => openThread(thread)}
                    className="w-full text-left bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-900 dark:text-white font-medium truncate">
                            {thread.subject || 'No subject'}
                          </span>
                          {thread.unread_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-xs bg-orange-500 text-white">
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-white/40">
                          <span>{thread.customer?.name || 'Unknown'}</span>
                          {thread.last_message && (
                            <span className="truncate max-w-[300px]">
                              {thread.last_message.sender_type === 'admin' ? 'You: ' : ''}
                              {thread.last_message.content}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-300 dark:text-white/30">
                          {thread.last_message_at
                            ? format(new Date(thread.last_message_at), 'd MMM')
                            : ''}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/30" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Credit Requests List */}
          {activeTab === 'credits' && (
            <div className="space-y-2">
              {credits.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-white/40">No credit requests yet</div>
              ) : (
                credits.map(cr => (
                  <div
                    key={cr.id}
                    className="bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.06] rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {cr.customer?.name || 'Unknown'}
                          </span>
                          <StatusBadge status={cr.status} />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-white/60">{cr.reason}</p>
                        {cr.order && (
                          <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
                            Order: {format(new Date(cr.order.delivery_date), 'd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          £{Number(cr.requested_amount).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-white/40">requested</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-white/40 mb-3">
                      <span>{format(new Date(cr.created_at), 'd MMM yyyy')}</span>
                      {cr.issue && <span>Issue: {cr.issue.title}</span>}
                    </div>

                    {cr.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => updateCreditStatus(cr.id, 'approved', cr.requested_amount)}
                          className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-500/30 dark:hover:bg-green-500/10 text-xs px-3 py-1"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve £{Number(cr.requested_amount).toFixed(2)}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateCreditStatus(cr.id, 'rejected')}
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10 text-xs px-3 py-1"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {cr.status === 'approved' && cr.approved_amount && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Approved: £{Number(cr.approved_amount).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
