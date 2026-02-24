import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================================================
// Multi-tenant webhook routing
// Resolves an inbound WhatsApp webhook to the correct company_id.
// Mirrors the Square webhook routing pattern.
// ============================================================================

export interface RoutingResult {
  companyId: string;
  connectionId?: string;
}

/**
 * Resolve which company an inbound webhook belongs to.
 *
 * Strategy (in order):
 * 1. Match the receiving phone_number_id against integration_connections config
 * 2. Match the sender's phone number against whatsapp_contacts
 * 3. Return null if unroutable
 */
export async function resolveCompanyFromWebhook(
  phoneNumberId: string,
  senderPhone?: string,
): Promise<RoutingResult | null> {
  const supabase = getSupabaseAdmin();

  // Step 1: Find company by WABA phone number ID
  const { data: connection } = await supabase
    .from('integration_connections')
    .select('id, company_id')
    .eq('integration_type', 'whatsapp')
    .eq('status', 'connected')
    .filter('config->>phone_number_id', 'eq', phoneNumberId)
    .maybeSingle();

  if (connection) {
    return {
      companyId: connection.company_id,
      connectionId: connection.id,
    };
  }

  // Step 2: Fallback — find company by sender phone in contacts
  if (senderPhone) {
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('company_id')
      .eq('phone_number', senderPhone)
      .limit(1)
      .maybeSingle();

    if (contact) {
      return { companyId: contact.company_id };
    }
  }

  // Step 3: Try platform-level env var as last resort
  // (single shared WABA for all companies — check if phone_number_id matches)
  const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (envPhoneNumberId && envPhoneNumberId === phoneNumberId && senderPhone) {
    // With a shared number, we can only route via contacts
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('company_id')
      .eq('phone_number', senderPhone)
      .limit(1)
      .maybeSingle();

    if (contact) {
      return { companyId: contact.company_id };
    }
  }

  return null;
}
