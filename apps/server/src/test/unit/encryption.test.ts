import { describe, expect, it, beforeAll } from "vitest";

const TEST_ENCRYPTION_KEY = "Qvo1In0h4qLxAT8GrbPafztMj+/TS4HDetQV1xLA8Mc=";

describe("Encryption Service", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  it("encrypts and decrypts strings correctly", async () => {
    const { initEncryption, encryptString, decryptString } = await import(
      "../../services/encryption.js"
    );

    initEncryption();

    const plaintext = "super-secret-oauth-token-12345";
    const encrypted = encryptString(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(":");

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext (unique IV)", async () => {
    const { initEncryption, encryptString } = await import(
      "../../services/encryption.js"
    );

    initEncryption();

    const plaintext = "same-input-different-output";
    const encrypted1 = encryptString(plaintext);
    const encrypted2 = encryptString(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it("throws on invalid ciphertext format", async () => {
    const { initEncryption, decryptString } = await import(
      "../../services/encryption.js"
    );

    initEncryption();

    expect(() => decryptString("invalid-no-colons")).toThrow();
    expect(() => decryptString("only:two:parts")).toThrow();
  });
});
