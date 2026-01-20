'use client';

import { ReviewPortal } from './ReviewPortal';
import type { ReviewWithDetails } from '@/types/reviews';

interface ReviewPageContentProps {
  review: ReviewWithDetails;
  currentUserId: string;
  isEmployee: boolean;
  isManager: boolean;
}

export default function ReviewPageContent(props: ReviewPageContentProps) {
  if (!ReviewPortal) {
    console.error('ReviewPortal is not defined');
    return <div className="text-white p-4">Error: ReviewPortal component not found</div>;
  }
  return <ReviewPortal {...props} />;
}

