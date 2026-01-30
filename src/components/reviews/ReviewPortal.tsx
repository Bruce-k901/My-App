'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Calendar, 
  CheckSquare, 
  FileText, 
  User, 
  Clock,
  Plus,
  Send,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/components/ui';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import { toast } from 'sonner';
import { 
  addNote, 
  getReviewNotes, 
  createFollowUp,
  createSchedule,
  getTemplates
} from '@/app/actions/reviews';
import type { ReviewWithDetails, ReviewNote, ReviewFollowUp, ReviewResponse } from '@/types/reviews';
import { ReviewForm } from './ReviewForm';
import { ReviewComparisonView } from './ReviewComparisonView';

interface ReviewPortalProps {
  review: ReviewWithDetails;
  currentUserId: string;
  isEmployee: boolean;
  isManager: boolean;
}

type NotePhase = 'before' | 'during' | 'after';

export function ReviewPortal({ review, currentUserId, isEmployee, isManager }: ReviewPortalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'form' | 'notes' | 'followups' | 'calendar'>('form');
  const [viewMode, setViewMode] = useState<'edit' | 'compare'>('edit');
  
  // Memoize filtered responses to prevent recalculation on every render
  // Use a ref to preserve responses even if review.responses temporarily becomes empty during refresh
  const responsesRef = React.useRef<ReviewResponse[]>(review.responses || []);
  
  // Update ref when responses are available, but don't clear it if they become empty
  React.useEffect(() => {
    if (review.responses && review.responses.length > 0) {
      responsesRef.current = review.responses;
      console.log('📝 Updated responses ref:', {
        count: review.responses.length,
        sample: review.responses[0] ? {
          id: review.responses[0].id,
          question_id: review.responses[0].question_id,
          respondent_type: review.responses[0].respondent_type,
        } : null,
      });
    } else if (review.responses && review.responses.length === 0 && responsesRef.current.length > 0) {
      console.warn('⚠️ Review responses became empty, preserving previous responses:', responsesRef.current.length);
    }
  }, [review.responses]);
  
  // Use current responses if available, otherwise fall back to ref
  const currentResponses = (review.responses && review.responses.length > 0) 
    ? review.responses 
    : responsesRef.current;
  
  const employeeResponses = React.useMemo(() => {
    return currentResponses.filter(r => {
      const respondentType = (r.respondent_type || '').toLowerCase();
      return respondentType === 'employee';
    });
  }, [currentResponses]);
  
  const managerResponses = React.useMemo(() => {
    return currentResponses.filter(r => {
      const respondentType = (r.respondent_type || '').toLowerCase();
      return respondentType === 'manager';
    });
  }, [currentResponses]);
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [notePhase, setNotePhase] = useState<NotePhase>('before');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    type: 'action' as ReviewFollowUp['type'],
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as ReviewFollowUp['priority'],
    assigned_to: '',
  });

  // Load notes on mount
  React.useEffect(() => {
    loadNotes();
  }, [review.id]);

  const loadNotes = async () => {
    try {
      const loadedNotes = await getReviewNotes(review.id);
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      toast.error('Please enter a note');
      return;
    }

    startTransition(async () => {
      try {
        await addNote({
          review_id: review.id,
          note_text: newNoteText,
          content: newNoteText,
          note_type: 'general',
          phase: notePhase,
        });
        toast.success('Note added');
        setNewNoteText('');
        loadNotes();
      } catch (error) {
        console.error('Error adding note:', error);
        toast.error('Failed to add note');
      }
    });
  };

  const handleCreateFollowUp = async () => {
    if (!followUpData.title.trim() || !followUpData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    startTransition(async () => {
      try {
        await createFollowUp({
          review_id: review.id,
          ...followUpData,
          assigned_to: followUpData.assigned_to || review.employee_id,
        });
        toast.success('Follow-up task created');
        setShowFollowUpForm(false);
        setFollowUpData({
          type: 'action',
          title: '',
          description: '',
          due_date: '',
          priority: 'medium',
          assigned_to: '',
        });
        router.refresh();
      } catch (error) {
        console.error('Error creating follow-up:', error);
        toast.error('Failed to create follow-up');
      }
    });
  };

  const handleScheduleFollowUpReview = async () => {
    if (!followUpData.due_date) {
      toast.error('Please select a date');
      return;
    }

    startTransition(async () => {
      try {
        const templates = await getTemplates();
        if (templates.length === 0) {
          toast.error('No templates available');
          return;
        }

        // Use the same template or first available
        const templateId = review.template_id || templates[0].id;

        await createSchedule({
          employee_id: review.employee_id,
          template_id: templateId,
          scheduled_date: followUpData.due_date,
          title: followUpData.title || `Follow-up Review: ${review.template?.name || 'Review'}`,
          due_date: followUpData.due_date,
        });
        toast.success('Follow-up review scheduled');
        setShowFollowUpForm(false);
        router.refresh();
      } catch (error) {
        console.error('Error scheduling follow-up review:', error);
        toast.error('Failed to schedule follow-up review');
      }
    });
  };

  const canEdit = isManager || (isEmployee && review.status === 'draft');
  const notesByPhase = {
    before: notes.filter(n => n.phase === 'before'),
    during: notes.filter(n => n.phase === 'during'),
    after: notes.filter(n => n.phase === 'after'),
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div>
            <h1 className="text-2xl font-bold text-white">{review.template?.name || 'Review'}</h1>
            <p className="text-neutral-400 text-sm mt-1">
              {review.employee?.full_name} • {new Date(review.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded text-sm ${
              review.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              review.status === 'in_meeting' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {review.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06]">
          {[
            { id: 'form', label: 'Review Form', icon: FileText },
            { id: 'notes', label: 'Notes', icon: MessageSquare },
            { id: 'followups', label: 'Follow-ups', icon: CheckSquare },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#EC4899] text-[#EC4899]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'form' && (
        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'edit' 
                  ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]' 
                  : 'text-neutral-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              Edit Responses
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'compare' 
                  ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]' 
                  : 'text-neutral-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              Compare & Discuss
            </button>
          </div>
          
          {/* Conditional Render */}
          {viewMode === 'edit' ? (
            <ReviewForm 
              review={review} 
              currentUserId={currentUserId}
              isEmployee={isEmployee}
              isManager={isManager}
            />
          ) : (
            <ReviewComparisonView
              review={review}
              employeeResponses={employeeResponses}
              managerResponses={managerResponses}
            />
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <NotesTab
          notes={notesByPhase}
          newNoteText={newNoteText}
          setNewNoteText={setNewNoteText}
          notePhase={notePhase}
          setNotePhase={setNotePhase}
          onAddNote={handleAddNote}
          isPending={isPending}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'followups' && (
        <FollowUpsTab
          review={review}
          showForm={showFollowUpForm}
          setShowForm={setShowFollowUpForm}
          followUpData={followUpData}
          setFollowUpData={setFollowUpData}
          onCreateFollowUp={handleCreateFollowUp}
          onScheduleReview={handleScheduleFollowUpReview}
          isPending={isPending}
          canCreate={isManager}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarTab review={review} />
      )}
    </div>
  );
}

function NotesTab({
  notes,
  newNoteText,
  setNewNoteText,
  notePhase,
  setNotePhase,
  onAddNote,
  isPending,
  canEdit,
}: {
  notes: { before: ReviewNote[]; during: ReviewNote[]; after: ReviewNote[] };
  newNoteText: string;
  setNewNoteText: (text: string) => void;
  notePhase: NotePhase;
  setNotePhase: (phase: NotePhase) => void;
  onAddNote: () => void;
  isPending: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Add Note Form */}
      {canEdit && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add Note</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-white mb-2">Note Phase</Label>
              <div className="flex gap-2">
                {(['before', 'during', 'after'] as NotePhase[]).map((phase) => (
                  <button
                    key={phase}
                    onClick={() => setNotePhase(phase)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      notePhase === phase
                        ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]'
                        : 'bg-white/[0.05] text-neutral-400 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {phase.charAt(0).toUpperCase() + phase.slice(1)} Review
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-white mb-2">Note</Label>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add your note here..."
                className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC4899] resize-none"
                rows={4}
              />
            </div>
            <Button
              onClick={onAddNote}
              disabled={isPending || !newNoteText.trim()}
              className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
            >
              <Send className="h-4 w-4 mr-2" />
              {isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>
      )}

      {/* Notes by Phase */}
      {(['before', 'during', 'after'] as NotePhase[]).map((phase) => (
        <div key={phase} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {phase.charAt(0).toUpperCase() + phase.slice(1)} Review Notes ({notes[phase].length})
          </h3>
          {notes[phase].length === 0 ? (
            <p className="text-neutral-400 text-sm">No notes for this phase</p>
          ) : (
            <div className="space-y-3">
              {notes[phase].map((note) => (
                <div key={note.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm text-neutral-300">{note.author?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-neutral-500">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{note.note_text || note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FollowUpsTab({
  review,
  showForm,
  setShowForm,
  followUpData,
  setFollowUpData,
  onCreateFollowUp,
  onScheduleReview,
  isPending,
  canCreate,
}: {
  review: ReviewWithDetails;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  followUpData: any;
  setFollowUpData: (data: any) => void;
  onCreateFollowUp: () => void;
  onScheduleReview: () => void;
  isPending: boolean;
  canCreate: boolean;
}) {
  return (
    <div className="space-y-6">
      {canCreate && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Follow-up
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Create Follow-up</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Type</Label>
              <select
                value={followUpData.type}
                onChange={(e) => setFollowUpData({ ...followUpData, type: e.target.value })}
                className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
              >
                <option value="action">Action Item</option>
                <option value="training">Training</option>
                <option value="goal">Goal</option>
                <option value="meeting">Meeting</option>
                <option value="review">Follow-up Review</option>
                <option value="document">Document</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label className="text-white">Priority</Label>
              <select
                value={followUpData.priority}
                onChange={(e) => setFollowUpData({ ...followUpData, priority: e.target.value })}
                className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-white">Title *</Label>
            <Input
              value={followUpData.title}
              onChange={(e) => setFollowUpData({ ...followUpData, title: e.target.value })}
              placeholder="Follow-up title"
            />
          </div>

          <div>
            <Label className="text-white">Description</Label>
            <textarea
              value={followUpData.description}
              onChange={(e) => setFollowUpData({ ...followUpData, description: e.target.value })}
              placeholder="Describe the follow-up action..."
              className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC4899] resize-none"
              rows={4}
            />
          </div>

          <div>
            <Label className="text-white">Due Date *</Label>
            <Input
              type="date"
              value={followUpData.due_date}
              onChange={(e) => setFollowUpData({ ...followUpData, due_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="flex gap-4">
            <Button
              onClick={followUpData.type === 'review' ? onScheduleReview : onCreateFollowUp}
              disabled={isPending}
              className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
            >
              {isPending ? 'Creating...' : 'Create Follow-up'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setFollowUpData({
                  type: 'action',
                  title: '',
                  description: '',
                  due_date: '',
                  priority: 'medium',
                  assigned_to: '',
                });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Existing Follow-ups */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Follow-up Items</h3>
        {review.follow_ups && review.follow_ups.length > 0 ? (
          <div className="space-y-3">
            {review.follow_ups.map((followUp: any) => (
              <div key={followUp.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-medium">{followUp.title}</h4>
                    <p className="text-sm text-neutral-400 mt-1">{followUp.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    followUp.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    followUp.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    followUp.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {followUp.priority}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Due: {new Date(followUp.due_date).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-0.5 bg-white/[0.05] rounded">
                    {followUp.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-400 text-sm">No follow-up items yet</p>
        )}
      </div>
    </div>
  );
}

function CalendarTab({ review }: { review: ReviewWithDetails }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Review Calendar</h3>
      
      <div className="space-y-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Scheduled Date</h4>
          <p className="text-neutral-300">
            {review.schedule_id ? (
              <span>Review scheduled for {new Date(review.created_at).toLocaleDateString()}</span>
            ) : (
              <span>Created on {new Date(review.created_at).toLocaleDateString()}</span>
            )}
          </p>
        </div>

        {review.meeting_scheduled_at && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Meeting Scheduled</h4>
            <p className="text-neutral-300">
              {new Date(review.meeting_scheduled_at).toLocaleString()}
            </p>
          </div>
        )}

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Calendar Integration</h4>
          <p className="text-neutral-400 text-sm">
            This review appears on the team calendar. All scheduled reviews and review meetings 
            are automatically added to the calendar for visibility across the team.
          </p>
        </div>
      </div>
    </div>
  );
}

