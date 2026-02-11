'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Loader2, AlertCircle } from '@/components/ui/icons';
import { toast } from 'sonner';

interface AssignCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  courseId: string;
  courseName: string;
  siteId?: string | null;
  siteName?: string | null;
  onSuccess?: () => void;
}

export function AssignCourseModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  courseId,
  courseName,
  siteId,
  siteName,
  onSuccess,
}: AssignCourseModalProps) {
  const [deadlineDate, setDeadlineDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // Default: 14 days from now
    return date.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileId || !courseId) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/training/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId,
          courseId,
          deadline: deadlineDate || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign course');
      }

      const data = await response.json();
      
      toast.success(`Course assigned successfully! ${profileName} will receive a notification.`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Failed to assign course:', error);
      toast.error(error?.message || 'Failed to assign course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            Assign Course
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-neutral-300">Employee</label>
              <p className="text-white mt-1">{profileName}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-300">Course</label>
              <p className="text-white mt-1">{courseName}</p>
            </div>

            {siteName && (
              <div>
                <label className="text-sm font-medium text-neutral-300">Site</label>
                <p className="text-white mt-1">{siteName}</p>
              </div>
            )}

            <div>
              <label htmlFor="deadline" className="text-sm font-medium text-neutral-300 block mb-2">
                Deadline (optional)
              </label>
              <input
                id="deadline"
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-200">
                  <p className="font-medium mb-1">Charge Notice</p>
                  <p>A <strong>£5 charge</strong> will be applied to {siteName || 'the site'} upon successful completion of this course.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
              className="border-neutral-600 text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-magenta-500 hover:bg-magenta-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                'Assign Course'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
