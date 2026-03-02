/**
 * Opsly Assistant — system identity for AI-generated messages, tasks, and notifications.
 *
 * This profile exists in the `profiles` table with no corresponding
 * auth.users account (auth_user_id = NULL, company_id = NULL).
 * Separate from "Opsly Admin" (..000001) which handles ticket admin replies.
 */

import { OPSLY_ADMIN_PROFILE_ID } from '@/lib/opsly-admin';

export const OA_PROFILE_ID = '00000000-0000-0000-0000-000000000002';
export const OA_DISPLAY_NAME = 'Opsly Assistant';
export const OA_EMAIL = 'assistant@opsly.app';
export const OA_BRAND_COLOR = '#D37E91';

/** Check if a sender is the Opsly Assistant */
export function isOpslyAssistant(senderId: string | null | undefined): boolean {
  return senderId === OA_PROFILE_ID;
}

/** Check if a sender is any system profile (Opsly Admin or Opsly Assistant) */
export function isSystemProfile(senderId: string | null | undefined): boolean {
  return senderId === OA_PROFILE_ID || senderId === OPSLY_ADMIN_PROFILE_ID;
}
