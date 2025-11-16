import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface SignedUrlOptions {
  bucket: string;
  path: string;
  expiresInSeconds?: number;
}

const DEFAULT_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Generates a short-lived signed URL for Supabase Storage uploads/downloads.
 * Must be called from the server (never the browser) because it uses the
 * service role key via getSupabaseAdmin().
 */
export async function createSignedStorageUrl({
  bucket,
  path,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
}: SignedUrlOptions) {
  if (!bucket) throw new Error("Missing storage bucket");
  if (!path) throw new Error("Missing storage path");

  const admin = getSupabaseAdmin();

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds, { download: false });

  if (error) {
    throw new Error(`Failed to create signed url: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Helper to build a predictable evidence path for temperature artifacts.
 */
export function buildTemperatureEvidencePath({
  tenantId,
  siteId,
  assetId,
  filename,
}: {
  tenantId: string;
  siteId: string;
  assetId?: string | null;
  filename: string;
}) {
  const parts = [
    "tenants",
    tenantId,
    "temperature",
    siteId,
  ];
  if (assetId) parts.push(assetId);
  parts.push(filename);
  return parts.join("/");
}





