import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================================================
// WhatsApp 24-hour service window management
// After a contact sends an inbound message, you can reply with free-form
// text for 24 hours. Outside the window, you must use templates.
// ============================================================================

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if the service window is open for a contact.
 * Returns true if free-form text can be sent.
 */
export async function isServiceWindowOpen(
  phoneNumber: string,
  companyId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('whatsapp_contacts')
    .select('service_window_expires')
    .eq('phone_number', phoneNumber)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!data?.service_window_expires) return false;
  return new Date(data.service_window_expires) > new Date();
}

/**
 * Update the service window for a contact after an inbound message.
 * Sets the window to expire 24 hours from now.
 */
export async function refreshServiceWindow(
  phoneNumber: string,
  companyId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const expires = new Date(now.getTime() + WINDOW_DURATION_MS);

  await supabase
    .from('whatsapp_contacts')
    .update({
      last_message_at: now.toISOString(),
      service_window_expires: expires.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('phone_number', phoneNumber)
    .eq('company_id', companyId);
}
