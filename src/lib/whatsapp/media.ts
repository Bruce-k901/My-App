import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { GRAPH_API_BASE } from './client';

// ============================================================================
// WhatsApp media download and Supabase Storage upload
// Meta provides temporary URLs that expire within minutes.
// We download the binary and re-upload to Supabase Storage.
// ============================================================================

const STORAGE_BUCKET = 'whatsapp-media';

/**
 * Download media from Meta and upload to Supabase Storage.
 *
 * @param mediaId - The media_id from the inbound webhook payload
 * @param messageId - Our whatsapp_messages.id for the storage path
 * @param companyId - Company ID for path-based access control
 * @param accessToken - WABA access token for Bearer auth
 * @returns The Supabase Storage path, or null on failure
 */
export async function downloadAndStoreMedia(
  mediaId: string,
  messageId: string,
  companyId: string,
  accessToken: string,
): Promise<{ storagePath: string; mimeType: string } | null> {
  try {
    // 1. Get download URL from Meta
    const metaRes = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaRes.ok) {
      console.error('[whatsapp/media] Failed to get media URL:', metaRes.status);
      return null;
    }

    const { url, mime_type } = (await metaRes.json()) as {
      url: string;
      mime_type: string;
    };

    // 2. Download the binary (also requires Bearer token)
    const mediaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mediaRes.ok) {
      console.error('[whatsapp/media] Failed to download media:', mediaRes.status);
      return null;
    }

    const buffer = await mediaRes.arrayBuffer();

    // 3. Determine extension from mime_type
    const ext = mimeToExtension(mime_type);
    const storagePath = `${companyId}/${messageId}.${ext}`;

    // 4. Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, Buffer.from(buffer), {
        contentType: mime_type,
        upsert: false,
      });

    if (error) {
      console.error('[whatsapp/media] Upload failed:', error.message);
      return null;
    }

    return { storagePath, mimeType: mime_type };
  } catch (err) {
    console.error('[whatsapp/media] Unexpected error:', err);
    return null;
  }
}

/**
 * Generate a signed URL for accessing stored WhatsApp media.
 * URLs expire after 1 hour.
 */
export async function getMediaSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return map[mimeType] || mimeType.split('/')[1] || 'bin';
}
