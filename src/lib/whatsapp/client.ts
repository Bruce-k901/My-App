import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { decryptValue, type EncryptedValue } from '@/lib/encryption';

// ============================================================================
// WhatsApp Cloud API Client
// Wraps the Meta Graph API for sending messages, managing templates, etc.
// ============================================================================

export const GRAPH_API_VERSION = 'v21.0';
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ---------------------------------------------------------------------------
// Credential resolution
// ---------------------------------------------------------------------------

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  appSecret: string;
}

/**
 * Resolve WhatsApp credentials for a company.
 * Looks up integration_connections first, falls back to env vars.
 */
export async function getWhatsAppCredentials(
  companyId?: string,
): Promise<WhatsAppCredentials | null> {
  // Try company-specific config from integration_connections
  if (companyId) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('integration_connections')
      .select('config')
      .eq('integration_type', 'whatsapp')
      .eq('integration_name', 'WhatsApp Business')
      .eq('status', 'connected')
      .eq('company_id', companyId)
      .maybeSingle();

    if (data?.config) {
      const cfg = data.config as Record<string, unknown>;
      const encKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;

      if (cfg.access_token_encrypted && encKey) {
        try {
          return {
            accessToken: decryptValue(
              cfg.access_token_encrypted as EncryptedValue,
              encKey,
              'WHATSAPP_TOKEN_ENCRYPTION_KEY',
            ),
            phoneNumberId: cfg.phone_number_id as string,
            wabaId: cfg.waba_id as string,
            appSecret: cfg.app_secret_encrypted
              ? decryptValue(
                  cfg.app_secret_encrypted as EncryptedValue,
                  encKey,
                  'WHATSAPP_TOKEN_ENCRYPTION_KEY',
                )
              : process.env.WHATSAPP_APP_SECRET || '',
          };
        } catch {
          console.error('[whatsapp/client] Failed to decrypt tokens for company', companyId);
        }
      }
    }
  }

  // Fallback to platform-level env vars
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!accessToken || !phoneNumberId || !wabaId) return null;

  return { accessToken, phoneNumberId, wabaId, appSecret: appSecret || '' };
}

// ---------------------------------------------------------------------------
// Send template message
// ---------------------------------------------------------------------------

export interface TemplateParam {
  type: 'text' | 'image' | 'document';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
}

export interface SendTemplateOptions {
  to: string;                               // E.164 phone number
  templateName: string;
  languageCode?: string;                    // default 'en_GB'
  headerParams?: TemplateParam[];
  bodyParams?: TemplateParam[];
  credentials: WhatsAppCredentials;
}

export async function sendTemplateMessage(opts: SendTemplateOptions): Promise<{
  success: boolean;
  waMessageId?: string;
  error?: string;
}> {
  const { to, templateName, languageCode = 'en_GB', headerParams, bodyParams, credentials } = opts;

  const components: Record<string, unknown>[] = [];
  if (headerParams?.length) {
    components.push({ type: 'header', parameters: headerParams });
  }
  if (bodyParams?.length) {
    components.push({ type: 'body', parameters: bodyParams });
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  const res = await fetch(
    `${GRAPH_API_BASE}/${credentials.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: data?.error?.message || `HTTP ${res.status}`,
    };
  }

  return {
    success: true,
    waMessageId: data.messages?.[0]?.id,
  };
}

// ---------------------------------------------------------------------------
// Send free-form text (inside 24hr service window only)
// ---------------------------------------------------------------------------

export async function sendTextMessage(
  to: string,
  text: string,
  credentials: WhatsAppCredentials,
): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  const res = await fetch(
    `${GRAPH_API_BASE}/${credentials.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: data?.error?.message || `HTTP ${res.status}`,
    };
  }

  return {
    success: true,
    waMessageId: data.messages?.[0]?.id,
  };
}
