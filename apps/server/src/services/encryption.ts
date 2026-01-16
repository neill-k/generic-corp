import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

let encryptionKey: Buffer | null = null;

/**
 * Initialize the encryption module with the key from environment.
 * Must be called before encrypt/decrypt operations.
 * Throws if ENCRYPTION_KEY is missing or invalid.
 */
export function initEncryption(): void {
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64 || keyBase64 === "CHANGE_ME" || keyBase64.trim() === "") {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. Generate with: openssl rand -base64 32"
    );
  }

  const keyBuffer = Buffer.from(keyBase64, "base64");
  if (keyBuffer.length < 32) {
    throw new Error(
      `ENCRYPTION_KEY must be at least 32 bytes (256 bits). Got ${keyBuffer.length} bytes. Generate with: openssl rand -base64 32`
    );
  }

  // Use first 32 bytes if key is longer
  encryptionKey = keyBuffer.subarray(0, 32);
}

/**
 * Check if encryption is initialized.
 */
export function isEncryptionInitialized(): boolean {
  return encryptionKey !== null;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded string: iv:authTag:ciphertext
 */
export function encryptString(plaintext: string): string {
  if (!encryptionKey) {
    throw new Error("Encryption not initialized. Call initEncryption() first.");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a string encrypted with encryptString().
 * Expects format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function decryptString(encryptedData: string): string {
  if (!encryptionKey) {
    throw new Error("Encryption not initialized. Call initEncryption() first.");
  }

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format. Expected iv:authTag:ciphertext");
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length. Expected ${IV_LENGTH}, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length. Expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
