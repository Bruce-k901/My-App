import { CourseResultsClient } from '@/components/course-v3/CourseResultsClient';

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
  searchParams: Promise<{
    trainingRecordId?: string;
    certificateNumber?: string;
    scorePercentage?: string;
    passed?: string;
    error?: string;
    courseId?: string;
  }>;
}

export default async function CourseResultsPage({ params, searchParams }: PageProps) {
  const { courseId } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <CourseResultsClient
      courseId={courseId}
      trainingRecordId={resolvedSearchParams.trainingRecordId || null}
      certificateNumber={resolvedSearchParams.certificateNumber || null}
      scorePercentage={parseInt(resolvedSearchParams.scorePercentage || '0', 10)}
      passed={resolvedSearchParams.passed === 'true'}
      error={resolvedSearchParams.error || null}
    />
  );
}
