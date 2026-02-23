/**
 * Opsly Admin — system identity for platform-generated messages.
 *
 * This profile exists in the `profiles` table with no corresponding
 * auth.users account (auth_user_id = NULL, company_id = NULL).
 * Used as sender_profile_id for ticket reply DMs, resolution
 * notifications, and any future system-generated messages.
 */
export const OPSLY_ADMIN_PROFILE_ID = '00000000-0000-0000-0000-000000000001';
export const OPSLY_ADMIN_NAME = 'Opsly Admin';
