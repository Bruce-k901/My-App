import { WebhooksHelper } from 'square';

/**
 * Verify a Square webhook signature using the SDK's built-in helper.
 *
 * IMPORTANT: The `rawBody` must be the raw request body string obtained
 * via `request.text()` — NOT parsed JSON re-stringified.
 */
export async function verifySquareWebhook(
  signatureKey: string,
  webhookUrl: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  try {
    return await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureKey,
      notificationUrl: webhookUrl,
      signature,
    });
  } catch {
    return false;
  }
}
