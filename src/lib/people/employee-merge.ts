export interface MergeResult {
  success: boolean;
  updatedRecords: number;
  error?: string;
}

/**
 * Merges multiple employee profiles into one canonical profile.
 * Calls server-side API route that uses admin client to bypass RLS.
 */
export async function mergeEmployees(
  canonicalProfileId: string,
  mergeProfileIds: string[],
  companyId: string
): Promise<MergeResult> {
  const res = await fetch('/api/people/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ canonicalProfileId, mergeProfileIds, companyId }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, updatedRecords: 0, error: `API ${res.status}: ${text}` };
  }

  return res.json();
}
