import crypto from 'crypto';

// ============================================================================
// Shared AES-256-GCM encryption for API tokens stored at rest.
// Used by Square, WhatsApp, and future integrations.
// Each integration passes its own encryption key from env vars.
// ============================================================================

export interface EncryptedValue {
  iv: string;
  ciphertext: string;
  tag: string;
}

function parseKey(hex: string | undefined, label: string): Buffer {
  if (!hex || hex.length !== 64) {
    throw new Error(
      `${label} must be a 64-character hex string (32 bytes)`,
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptValue(plaintext: string, keyHex: string, keyLabel = 'Encryption key'): EncryptedValue {
  const key = parseKey(keyHex, keyLabel);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptValue(encrypted: EncryptedValue, keyHex: string, keyLabel = 'Encryption key'): string {
  const key = parseKey(keyHex, keyLabel);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encrypted.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
