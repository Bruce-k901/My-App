import type { LablitProduct, LablitSyncResult } from './types';
import { LablitApiError } from './errors';

// ---------------------------------------------------------------------------
// Labl.it API client
// TODO: Replace placeholder methods once API documentation is available.
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = 'https://api.labl.it/v1';

export class LablitClient {
  private apiKey: string;
  private baseUrl: string;
  private deviceId: string;

  constructor(apiKey: string, deviceId: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.deviceId = deviceId;
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Internal fetch wrapper with auth headers.
   * TODO: Confirm auth scheme from Labl.it docs (Bearer vs X-API-Key).
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const category =
        res.status === 401 || res.status === 403 ? 'AUTH' as const :
        res.status === 429 ? 'RATE_LIMIT' as const :
        res.status === 404 ? 'NOT_FOUND' as const :
        res.status === 422 ? 'VALIDATION' as const :
        'API' as const;

      throw new LablitApiError(
        `Labl.it API error: ${res.status} ${res.statusText}`,
        res.status,
        category,
      );
    }

    return res.json() as Promise<T>;
  }

  /**
   * Test the API connection and verify the device exists.
   * TODO: Replace with actual endpoint (e.g. GET /devices/{deviceId} or GET /account).
   */
  async testConnection(): Promise<{ ok: boolean; deviceName?: string }> {
    throw new LablitApiError(
      'Labl.it API not yet implemented - awaiting API documentation',
      0,
      'NOT_IMPLEMENTED',
    );
  }

  /**
   * Push a single product/label to Labl.it's cloud.
   * TODO: Replace with actual endpoint (e.g. POST /products or POST /labels).
   */
  async pushProduct(product: LablitProduct): Promise<{ id: string }> {
    throw new LablitApiError(
      'Labl.it API not yet implemented - awaiting API documentation',
      0,
      'NOT_IMPLEMENTED',
    );
  }

  /**
   * Push multiple products/labels in a batch.
   * TODO: Replace with actual batch endpoint.
   */
  async pushProducts(products: LablitProduct[]): Promise<LablitSyncResult> {
    throw new LablitApiError(
      'Labl.it API not yet implemented - awaiting API documentation',
      0,
      'NOT_IMPLEMENTED',
    );
  }

  /**
   * List devices associated with the account.
   * TODO: Replace with actual endpoint (e.g. GET /devices).
   */
  async listDevices(): Promise<Array<{ id: string; name: string; status: string }>> {
    throw new LablitApiError(
      'Labl.it API not yet implemented - awaiting API documentation',
      0,
      'NOT_IMPLEMENTED',
    );
  }
}
