import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getSquareOAuthClient } from './client';
import { handleSquareError } from './errors';

// ---------------------------------------------------------------------------
// AES-256-GCM encryption for Square tokens at rest
// ---------------------------------------------------------------------------

interface EncryptedValue {
  iv: string;
  ciphertext: string;
  tag: string;
}

function getEncryptionKey(): Buffer {
  const hex = process.env.SQUARE_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'SQUARE_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptToken(plaintext: string): EncryptedValue {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptToken(encrypted: EncryptedValue): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encrypted.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ---------------------------------------------------------------------------
// Token CRUD
// ---------------------------------------------------------------------------

export interface SquareTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO
  merchantId: string;
  locationId?: string;
  locationName?: string;
}

/**
 * Encrypt and store Square tokens in the integration_connections row.
 * Creates the row if it doesn't exist, updates it otherwise.
 */
export async function storeSquareTokens(
  companyId: string,
  siteId: string,
  tokens: SquareTokens,
) {
  const supabase = getSupabaseAdmin();

  const config: Record<string, unknown> = {
    access_token_encrypted: encryptToken(tokens.accessToken),
    refresh_token_encrypted: encryptToken(tokens.refreshToken),
    expires_at: tokens.expiresAt,
    merchant_id: tokens.merchantId,
  };
  if (tokens.locationId) config.location_id = tokens.locationId;
  if (tokens.locationName) config.location_name = tokens.locationName;

  const { error } = await supabase
    .from('integration_connections')
    .upsert(
      {
        company_id: companyId,
        integration_type: 'pos_system',
        integration_name: 'Square',
        config,
        status: tokens.locationId ? 'connected' : 'pending',
        last_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,integration_type,integration_name' },
    );

  if (error) throw new Error(`Failed to store Square tokens: ${error.message}`);
}

/**
 * Read and decrypt Square tokens for a company.
 * Returns null if no connection exists.
 */
export async function getSquareTokens(
  companyId: string,
): Promise<(SquareTokens & { connectionId: string }) | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('integration_connections')
    .select('id, config')
    .eq('company_id', companyId)
    .eq('integration_type', 'pos_system')
    .eq('integration_name', 'Square')
    .maybeSingle();

  if (error || !data) return null;

  const cfg = data.config as Record<string, unknown>;
  if (!cfg?.access_token_encrypted) return null;

  try {
    return {
      connectionId: data.id,
      accessToken: decryptToken(cfg.access_token_encrypted as EncryptedValue),
      refreshToken: decryptToken(cfg.refresh_token_encrypted as EncryptedValue),
      expiresAt: cfg.expires_at as string,
      merchantId: cfg.merchant_id as string,
      locationId: cfg.location_id as string | undefined,
      locationName: cfg.location_name as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Refresh the Square access token using the refresh token.
 * Updates the stored tokens on success. Sets status to 'error' on failure.
 */
export async function refreshSquareToken(
  companyId: string,
): Promise<boolean> {
  const existing = await getSquareTokens(companyId);
  if (!existing) return false;

  const supabase = getSupabaseAdmin();

  try {
    const client = getSquareOAuthClient();
    const response = await client.oAuth.obtainToken({
      clientId: process.env.SQUARE_APP_ID!,
      clientSecret: process.env.SQUARE_APP_SECRET!,
      grantType: 'refresh_token',
      refreshToken: existing.refreshToken,
    });

    await storeSquareTokens(companyId, '', {
      accessToken: response.accessToken!,
      refreshToken: response.refreshToken!,
      expiresAt: response.expiresAt!,
      merchantId: existing.merchantId,
      locationId: existing.locationId,
      locationName: existing.locationName,
    });

    return true;
  } catch (err) {
    // Mark connection as errored
    await supabase
      .from('integration_connections')
      .update({
        status: 'error',
        last_error: 'Token refresh failed — please reconnect Square',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.connectionId);

    console.error('[square/tokens] Refresh failed:', err);
    return false;
  }
}

/**
 * Returns a valid access token, refreshing if needed.
 * Returns null if the token cannot be obtained (caller should handle gracefully).
 */
export async function ensureValidToken(
  companyId: string,
): Promise<string | null> {
  const tokens = await getSquareTokens(companyId);
  if (!tokens) return null;

  const expiresAt = new Date(tokens.expiresAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // If expiring within 7 days, proactively refresh
  if (expiresAt - now < sevenDaysMs) {
    const refreshed = await refreshSquareToken(companyId);
    if (!refreshed) return null;
    const updated = await getSquareTokens(companyId);
    return updated?.accessToken ?? null;
  }

  return tokens.accessToken;
}
