/**
 * Structured error for Square API failures.
 */
export class SquareApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public category: 'AUTH' | 'RATE_LIMIT' | 'NOT_FOUND' | 'VALIDATION' | 'API' | 'UNKNOWN',
    public squareErrors?: unknown[],
  ) {
    super(message);
    this.name = 'SquareApiError';
  }
}

/**
 * Wraps a Square SDK call and throws a typed SquareApiError on failure.
 */
export function handleSquareError(error: unknown): never {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const err = error as { statusCode: number; errors?: unknown[]; message?: string };

    if (err.statusCode === 401) {
      throw new SquareApiError(
        'Square authentication expired or invalid',
        401,
        'AUTH',
        err.errors,
      );
    }
    if (err.statusCode === 429) {
      throw new SquareApiError(
        'Square rate limit exceeded — try again shortly',
        429,
        'RATE_LIMIT',
        err.errors,
      );
    }
    if (err.statusCode === 404) {
      throw new SquareApiError(
        'Square resource not found',
        404,
        'NOT_FOUND',
        err.errors,
      );
    }
    if (err.statusCode === 400) {
      throw new SquareApiError(
        err.message || 'Square validation error',
        400,
        'VALIDATION',
        err.errors,
      );
    }

    throw new SquareApiError(
      err.message || `Square API error (${err.statusCode})`,
      err.statusCode,
      'API',
      err.errors,
    );
  }

  // Unknown shape — re-throw wrapped
  const msg = error instanceof Error ? error.message : String(error);
  throw new SquareApiError(msg, 0, 'UNKNOWN');
}

/**
 * Sleep helper for exponential backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff on rate-limit (429) errors.
 * Retries up to `maxRetries` times with delays of 1s, 2s, 4s, …
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRateLimit =
        err instanceof SquareApiError && err.category === 'RATE_LIMIT';
      if (!isRateLimit || attempt === maxRetries) break;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}
