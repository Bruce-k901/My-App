import crypto from "crypto";

export interface HmacVerificationResult<T = unknown> {
  payload: T;
  signature: string;
  expectedSignature: string;
  valid: boolean;
}

export function generateHmacSignature(secret: string, body: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyHmacSignature<T = unknown>(
  secret: string,
  rawBody: string,
  providedSignature: string | null
): HmacVerificationResult<T> {
  const expected = generateHmacSignature(secret, rawBody);
  const provided = providedSignature ?? "";

  const valid = provided.length === expected.length
    ? crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    : false;

  const payload = (() => {
    try {
      return JSON.parse(rawBody) as T;
    } catch {
      return null as unknown as T;
    }
  })();

  return {
    payload,
    signature: provided,
    expectedSignature: expected,
    valid,
  };
}





