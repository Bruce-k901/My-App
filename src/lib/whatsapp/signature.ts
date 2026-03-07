import crypto from 'crypto';

// ============================================================================
// WhatsApp webhook signature validation (HMAC-SHA256)
// Meta signs every webhook POST with X-Hub-Signature-256 header.
// ============================================================================

/**
 * Validate the X-Hub-Signature-256 header from a Meta webhook POST.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawBody - The raw request body as a string (from request.text())
 * @param signature - The X-Hub-Signature-256 header value (e.g. 'sha256=abc...')
 * @param appSecret - The Meta app secret for HMAC key
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  appSecret: string,
): boolean {
  if (!signature || !appSecret) return false;

  try {
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const expected = `sha256=${expectedHash}`;

    // Timing-safe comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}
