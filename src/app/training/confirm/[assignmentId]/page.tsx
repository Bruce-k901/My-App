'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ConfirmCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAppContext();
  const assignmentId = params.assignmentId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  
  const [confirmedName, setConfirmedName] = useState('');
  const [confirmedSiteId, setConfirmedSiteId] = useState<string>('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!assignmentId || !profile?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch assignment
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('course_assignments')
          .select('*, course:training_courses(*), profile:profiles(*)')
          .eq('id', assignmentId)
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (assignmentError || !assignmentData) {
          toast.error('Assignment not found or you do not have access');
          router.push('/dashboard');
          return;
        }

        if (assignmentData.status !== 'invited') {
          toast.error(`This assignment is already ${assignmentData.status}`);
          router.push('/dashboard');
          return;
        }

        setAssignment(assignmentData);
        setCourse(assignmentData.course);
        setConfirmedName(assignmentData.profile?.full_name || '');

        // Fetch user's sites
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', profile.company_id)
          .order('name');

        setSites(sitesData || []);

        // Set default site
        if (assignmentData.profile?.home_site || assignmentData.profile?.site_id) {
          setConfirmedSiteId(assignmentData.profile.home_site || assignmentData.profile.site_id);
        } else if (sitesData && sitesData.length > 0) {
          setConfirmedSiteId(sitesData[0].id);
        }
      } catch (error: any) {
        console.error('Error fetching assignment:', error);
        toast.error('Failed to load assignment details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assignmentId, profile, router]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acknowledged) {
      toast.error('Please acknowledge the charge');
      return;
    }

    if (!confirmedName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/training/assignments/${assignmentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmationName: confirmedName.trim(),
          confirmationSiteId: confirmedSiteId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm assignment');
      }

      const data = await response.json();
      
      toast.success('Course confirmed! Redirecting to course...');
      
      // Redirect to course
      if (course?.content_path) {
        router.push(`/learn/${course.content_path}`);
      } else {
        router.push('/dashboard/courses');
      }
    } catch (error: any) {
      console.error('Failed to confirm assignment:', error);
      toast.error(error?.message || 'Failed to confirm assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D13]">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading assignment details...
        </div>
      </div>
    );
  }

  if (!assignment || !course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D13]">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <h1 className="text-xl font-semibold text-red-300 mb-2">Assignment Not Found</h1>
          <p className="text-red-200/80 mb-4">This assignment could not be found or you do not have access.</p>
          <Link href="/dashboard" className="text-pink-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const durationHours = course.duration_minutes 
    ? Math.round(course.duration_minutes / 60 * 10) / 10 
    : null;

  return (
    <div className="min-h-screen bg-[#0B0D13] py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Confirm Course Enrollment</h1>
          <p className="text-slate-400 mb-6">Please confirm your details to begin the course</p>

          <div className="mb-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <h2 className="font-semibold text-white mb-2">{course.name}</h2>
            {course.description && (
              <p className="text-sm text-slate-300 mb-3">{course.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {durationHours && <span>Duration: ~{durationHours} hours</span>}
              {assignment.deadline_date && (
                <span>Deadline: {new Date(assignment.deadline_date).toLocaleDateString('en-GB')}</span>
              )}
            </div>
          </div>

          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                Your Name <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={confirmedName}
                onChange={(e) => setConfirmedName(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                placeholder="Enter your full name"
              />
            </div>

            {sites.length > 0 && (
              <div>
                <label htmlFor="site" className="block text-sm font-medium text-slate-300 mb-2">
                  Your Site
                </label>
                <select
                  id="site"
                  value={confirmedSiteId}
                  onChange={(e) => setConfirmedSiteId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                >
                  <option value="">Select a site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-[#0f1220] text-magenta-500 focus:ring-2 focus:ring-magenta-500"
                  required
                />
                <span className="text-sm text-amber-200">
                  I understand that a <strong>£5 charge</strong> will be applied to{' '}
                  {confirmedSiteId && sites.find(s => s.id === confirmedSiteId)?.name || 'your site'}{' '}
                  upon successful completion of this course.
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => router.push('/dashboard')}
                variant="outline"
                disabled={submitting}
                className="flex-1 border-neutral-600 text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !acknowledged || !confirmedName.trim()}
                className="flex-1 bg-magenta-500 hover:bg-magenta-600 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm & Start Course
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
