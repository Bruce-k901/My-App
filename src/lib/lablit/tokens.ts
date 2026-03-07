import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { encryptValue, decryptValue, type EncryptedValue } from '@/lib/encryption';
import type { LablitConfig } from './types';

// ---------------------------------------------------------------------------
// AES-256-GCM encryption for Labl.it API key at rest
// Uses shared encryption utility from @/lib/encryption
// ---------------------------------------------------------------------------

function getEncryptionKeyHex(): string {
  const hex = process.env.LABLIT_API_KEY_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'LABLIT_API_KEY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    );
  }
  return hex;
}

export function encryptApiKey(plaintext: string): EncryptedValue {
  return encryptValue(plaintext, getEncryptionKeyHex(), 'LABLIT_API_KEY_ENCRYPTION_KEY');
}

export function decryptApiKey(encrypted: EncryptedValue): string {
  return decryptValue(encrypted, getEncryptionKeyHex(), 'LABLIT_API_KEY_ENCRYPTION_KEY');
}

// ---------------------------------------------------------------------------
// Config CRUD — integration_connections row for Labl.it
// ---------------------------------------------------------------------------

export interface StoredLablitConfig {
  connectionId: string;
  apiKey: string;
  deviceId: string;
  deviceName?: string;
  accountId?: string;
  baseUrl?: string;
}

/**
 * Encrypt and store Labl.it config in the integration_connections row.
 * Creates the row if it doesn't exist, updates it otherwise.
 */
export async function storeLablitConfig(
  companyId: string,
  apiKey: string,
  deviceId: string,
  deviceName?: string,
) {
  const supabase = getSupabaseAdmin();

  const config: LablitConfig = {
    api_key_encrypted: encryptApiKey(apiKey),
    device_id: deviceId,
    device_name: deviceName,
  };

  const { error } = await supabase
    .from('integration_connections')
    .upsert(
      {
        company_id: companyId,
        integration_type: 'label_printer',
        integration_name: 'Labl.it',
        config,
        status: 'connected',
        last_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,integration_type,integration_name' },
    );

  if (error) throw new Error(`Failed to store Labl.it config: ${error.message}`);
}

/**
 * Read and decrypt Labl.it config for a company.
 * Returns null if no connection exists.
 */
export async function getLablitConfig(
  companyId: string,
): Promise<StoredLablitConfig | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('integration_connections')
    .select('id, config')
    .eq('company_id', companyId)
    .eq('integration_type', 'label_printer')
    .eq('integration_name', 'Labl.it')
    .maybeSingle();

  if (error || !data) return null;

  const cfg = data.config as LablitConfig | null;
  if (!cfg?.api_key_encrypted) return null;

  try {
    return {
      connectionId: data.id,
      apiKey: decryptApiKey(cfg.api_key_encrypted),
      deviceId: cfg.device_id,
      deviceName: cfg.device_name,
      accountId: cfg.account_id,
      baseUrl: cfg.base_url,
    };
  } catch {
    return null;
  }
}

/**
 * Delete the Labl.it integration connection for a company.
 */
export async function deleteLablitConfig(connectionId: string) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('integration_connections')
    .delete()
    .eq('id', connectionId);

  if (error) throw new Error(`Failed to delete Labl.it config: ${error.message}`);
}
