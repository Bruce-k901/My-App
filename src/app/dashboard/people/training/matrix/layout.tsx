// Prevent static generation for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TrainingMatrixLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
