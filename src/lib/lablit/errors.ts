// ---------------------------------------------------------------------------
// Labl.it API error handling (mirrors src/lib/square/errors.ts)
// ---------------------------------------------------------------------------

export type LablitErrorCategory =
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'API'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN';

export class LablitApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public category: LablitErrorCategory = 'UNKNOWN',
  ) {
    super(message);
    this.name = 'LablitApiError';
  }
}

export function handleLablitError(error: unknown): never {
  if (error instanceof LablitApiError) throw error;
  const msg = error instanceof Error ? error.message : String(error);
  throw new LablitApiError(msg, 0, 'UNKNOWN');
}
