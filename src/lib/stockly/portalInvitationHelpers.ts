import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generatePortalInvitationEmailHTML } from '@/lib/emails/portalInvitation';
import { sendEmail } from '@/lib/send-email';
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random hex token (64 characters)
 * Used for portal invitation links
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 32 bytes = 64 hex characters
}

/**
 * Validate an invitation token
 * Checks if token exists, is not expired, and hasn't been used
 * 
 * @param token - The invitation token to validate
 * @returns Promise with customer_id if valid, null if invalid
 */
export async function validateInvitationToken(
  token: string
): Promise<{ customer_id: string; email: string } | null> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: invitation, error } = await supabase
      .from('portal_invitations')
      .select(`
        id,
        customer_id,
        expires_at,
        used_at,
        customer:order_book_customers!inner(
          id,
          email,
          business_name
        )
      `)
      .eq('token', token)
      .is('used_at', null)
      .single();
    
    if (error || !invitation) {
      return null;
    }
    
    // Check if token is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return null;
    }
    
    // Check if customer exists and has email
    const customer = invitation.customer as any;
    if (!customer || !customer.email) {
      return null;
    }
    
    return {
      customer_id: invitation.customer_id,
      email: customer.email,
    };
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return null;
  }
}

/**
 * Expire old invitations for a customer
 * Sets used_at timestamp on all unused invitations for the customer
 * Called when sending a new invitation
 */
export async function expireOldInvitations(customerId: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    
    await supabase
      .from('portal_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('customer_id', customerId)
      .is('used_at', null);
  } catch (error) {
    console.error('Error expiring old invitations:', error);
    // Don't throw - this is a best-effort cleanup
  }
}

/**
 * Mark an invitation token as used
 * Called after customer successfully completes setup
 */
export async function markInvitationAsUsed(token: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    
    await supabase
      .from('portal_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)
      .is('used_at', null);
  } catch (error) {
    console.error('Error marking invitation as used:', error);
    throw error;
  }
}

/**
 * Send portal invitation email
 * Generates token, stores in database, and sends email
 * 
 * @param customer - Customer record with email and business_name
 * @returns Promise with the generated token
 */
export async function sendPortalInviteEmail(customer: {
  id: string;
  email: string;
  business_name: string;
  contact_name?: string | null;
}): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Expire old invitations
    await expireOldInvitations(customer.id);
    
    // Generate new token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days from now
    
    // Store invitation in database
    const { error: insertError } = await supabase
      .from('portal_invitations')
      .insert({
        customer_id: customer.id,
        token,
        expires_at: expiresAt.toISOString(),
      });
    
    if (insertError) {
      throw new Error(`Failed to store invitation: ${insertError.message}`);
    }
    
    // Update customer record
    await supabase
      .from('order_book_customers')
      .update({ portal_invite_sent_at: new Date().toISOString() })
      .eq('id', customer.id);
    
    // Send email via Resend directly
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const setupUrl = `${appUrl}/customer/setup?token=${token}`;

    try {
      const result = await sendEmail({
        to: customer.email,
        subject: `You're invited to our customer portal`,
        html: generatePortalInvitationEmailHTML({
          contactName: customer.contact_name || 'there',
          businessName: customer.business_name,
          setupUrl,
        }),
      });

      if (!result.success && !result.skipped) {
        console.error('Failed to send invitation email:', result.error);
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't throw - token is still created, email can be resent
    }
    
    return token;
  } catch (error) {
    console.error('Error sending portal invitation email:', error);
    throw error;
  }
}


