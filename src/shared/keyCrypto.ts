/**
 * Per-install API key encryption using WebCrypto AES-GCM.
 *
 * Security boundary & limitation:
 * This wraps sensitive API keys at rest using a per-install key stored separately
 * in chrome.storage.local. This defends against casual disk/sync inspection and
 * other extensions reading storage directly.
 * It does NOT defend against a compromised profile, root access, or malicious
 * code execution running directly within the extension's execution context.
 */

import type { UserPreferences } from './types';

export const INSTALL_KEY_STORAGE_KEY = 'subsume_install_crypto_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 12;
const PREFIX = 'enc:v1:';

export const SENSITIVE_PREF_KEYS = [
  'tmdbApiKey',
  'omdbApiKey',
  'llmApiKey',
  'llmSecondaryApiKey',
  'googleBooksApiKey',
] as const;

export type SensitivePrefKey = (typeof SENSITIVE_PREF_KEYS)[number];

let cachedCryptoKey: CryptoKey | null = null;
let inMemoryKeyFallback: string | null = null;
let installKeyPromise: Promise<CryptoKey> | null = null;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const bufObj = (globalThis as unknown as {
    Buffer?: { from: (b: Uint8Array) => { toString: (enc: string) => string } };
  }).Buffer;

  if (bufObj) {
    return bufObj.from(bytes).toString('base64');
  }

  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bufObj = (globalThis as unknown as {
    Buffer?: { from: (str: string, enc: string) => { buffer: ArrayBuffer; byteOffset: number; byteLength: number } };
  }).Buffer;

  if (bufObj) {
    const b = bufObj.from(base64, 'base64');
    return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  }

  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle =
    typeof crypto !== 'undefined' && crypto.subtle
      ? crypto.subtle
      : (globalThis as unknown as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;

  if (!subtle) {
    throw new Error('WebCrypto SubtleCrypto is not available in this environment');
  }
  return subtle;
}

async function getStorageItem(key: string): Promise<string | null> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const res = await new Promise<Record<string, unknown>>((resolve, reject) => {
      try {
        const maybePromise: unknown = chrome.storage.local.get(key, (items) => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(items || {});
          }
        });
        if (maybePromise && typeof (maybePromise as Promise<Record<string, unknown>>).then === 'function') {
          (maybePromise as Promise<Record<string, unknown>>).then(resolve).catch(reject);
        }
      } catch (err) {
        reject(err);
      }
    });
    if (res && typeof res[key] === 'string' && (res[key] as string).length > 0) {
      return res[key] as string;
    }
    return inMemoryKeyFallback;
  }
  return inMemoryKeyFallback;
}

async function setStorageItem(key: string, value: string): Promise<void> {
  inMemoryKeyFallback = value;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await new Promise<void>((resolve, reject) => {
        try {
          const maybePromise: unknown = chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
          if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
            (maybePromise as Promise<void>).then(resolve).catch(reject);
          }
        } catch (err) {
          reject(err);
        }
      });
    } catch {
      // In-memory fallback already set
    }
  }
}

/**
 * Retrieve or generate the per-install WebCrypto key.
 * Uses promise memoization to guard against concurrent first-run initialization races.
 * Never generates a new key or overwrites storage if a storage read merely errored;
 * only generates when the key is genuinely absent.
 */
export async function getOrCreateInstallKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) {
    return cachedCryptoKey;
  }
  if (installKeyPromise) {
    return installKeyPromise;
  }

  installKeyPromise = (async () => {
    const subtle = getSubtleCrypto();
    const storedKeyBase64 = await getStorageItem(INSTALL_KEY_STORAGE_KEY);

    if (storedKeyBase64) {
      try {
        const keyBytes = base64ToUint8Array(storedKeyBase64);
        cachedCryptoKey = await subtle.importKey(
          'raw',
          keyBytes as unknown as BufferSource,
          { name: ALGORITHM, length: KEY_LENGTH },
          false,
          ['encrypt', 'decrypt']
        );
        return cachedCryptoKey;
      } catch (err) {
        throw new Error(
          `Failed to import existing install key from storage: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Generate a new 256-bit AES-GCM key only when genuinely absent
    const generatedKey = await subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );

    const raw = await subtle.exportKey('raw', generatedKey);
    const base64Key = uint8ArrayToBase64(new Uint8Array(raw));
    await setStorageItem(INSTALL_KEY_STORAGE_KEY, base64Key);

    cachedCryptoKey = generatedKey;
    return cachedCryptoKey;
  })().finally(() => {
    installKeyPromise = null;
  });

  return installKeyPromise;
}

/**
 * Check whether a string value is an encrypted key token.
 */
export function isEncryptedKey(value: unknown): boolean {
  return typeof value === 'string' && value.trim().startsWith(PREFIX);
}

/**
 * Encrypt a plaintext string using AES-GCM.
 * Idempotent: returns already-encrypted strings unchanged.
 */
export async function encryptKey(plaintext: string): Promise<string> {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    return plaintext;
  }
  if (isEncryptedKey(plaintext)) {
    return plaintext;
  }

  const key = await getOrCreateInstallKey();
  const subtle = getSubtleCrypto();

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await subtle.encrypt(
    { name: ALGORITHM, iv: iv as unknown as BufferSource },
    key,
    encoded
  );

  const ivB64 = uint8ArrayToBase64(iv);
  const cipherB64 = uint8ArrayToBase64(new Uint8Array(cipherBuffer));
  return `${PREFIX}${ivB64}:${cipherB64}`;
}

/**
 * Decrypt an encrypted key token.
 * If the input is not encrypted (e.g. existing plaintext before migration),
 * returns the string as-is.
 */
export async function decryptKey(encryptedOrPlain: string): Promise<string> {
  if (typeof encryptedOrPlain !== 'string' || encryptedOrPlain.length === 0) {
    return encryptedOrPlain;
  }
  if (!isEncryptedKey(encryptedOrPlain)) {
    return encryptedOrPlain;
  }

  const parts = encryptedOrPlain.split(':');
  if (parts.length !== 4 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Invalid encrypted key format');
  }

  const [, , ivB64, cipherB64] = parts;
  if (!ivB64 || !cipherB64) {
    throw new Error('Invalid encrypted key format: missing IV or ciphertext');
  }

  const iv = base64ToUint8Array(ivB64);
  const cipherBytes = base64ToUint8Array(cipherB64);

  const key = await getOrCreateInstallKey();
  const subtle = getSubtleCrypto();

  try {
    const decryptedBuffer = await subtle.decrypt(
      { name: ALGORITHM, iv: iv as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    throw new Error('Decryption failed: corrupted key or invalid authentication tag');
  }
}

/**
 * Encrypt all sensitive API key fields in a preferences object before storage.
 */
export async function encryptUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const result: UserPreferences = { ...prefs };
  const prefAccessor = result as unknown as Record<SensitivePrefKey, string | undefined>;

  for (const key of SENSITIVE_PREF_KEYS) {
    const val = prefAccessor[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      prefAccessor[key] = await encryptKey(val.trim());
    }
  }

  // Also handle optional nested apiKeys dictionary if present
  const anyPrefs = result as unknown as Record<string, unknown>;
  if (anyPrefs.apiKeys && typeof anyPrefs.apiKeys === 'object' && !Array.isArray(anyPrefs.apiKeys)) {
    const encryptedApiKeys: Record<string, string> = { ...(anyPrefs.apiKeys as Record<string, string>) };
    for (const [provider, keyVal] of Object.entries(encryptedApiKeys)) {
      if (typeof keyVal === 'string' && keyVal.trim().length > 0) {
        encryptedApiKeys[provider] = await encryptKey(keyVal.trim());
      }
    }
    anyPrefs.apiKeys = encryptedApiKeys;
  }

  return result;
}

/**
 * Decrypt sensitive API key fields in a preferences object after loading from storage.
 * Detects whether any keys were stored as plaintext (needing migration write-back).
 */
export async function decryptUserPreferences(
  prefs: UserPreferences
): Promise<{ decrypted: UserPreferences; needsMigration: boolean; undecryptable: string[] }> {
  const undecryptable: string[] = [];
  const decrypted: UserPreferences = { ...prefs };
  const prefAccessor = decrypted as unknown as Record<SensitivePrefKey, string | undefined>;
  let needsMigration = false;

  for (const key of SENSITIVE_PREF_KEYS) {
    const val = prefAccessor[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      if (!isEncryptedKey(val)) {
        needsMigration = true;
        prefAccessor[key] = val; // Already plaintext, will be migrated
      } else {
        try {
          prefAccessor[key] = await decryptKey(val);
        } catch {
          // Decryption failed (transient error, key mismatch, or corruption). Surface as
          // missing in memory only; the stored ciphertext must stay untouched so a later
          // successful read can still recover it. Never a reason to write back.
          prefAccessor[key] = undefined;
          undecryptable.push(key);
        }
      }
    }
  }

  // Also handle optional nested apiKeys dictionary if present
  const anyPrefs = decrypted as unknown as Record<string, unknown>;
  if (anyPrefs.apiKeys && typeof anyPrefs.apiKeys === 'object' && !Array.isArray(anyPrefs.apiKeys)) {
    const decryptedApiKeys: Record<string, string> = { ...(anyPrefs.apiKeys as Record<string, string>) };
    for (const [provider, keyVal] of Object.entries(decryptedApiKeys)) {
      if (typeof keyVal === 'string' && keyVal.trim().length > 0) {
        if (!isEncryptedKey(keyVal)) {
          needsMigration = true;
          decryptedApiKeys[provider] = keyVal;
        } else {
          try {
            decryptedApiKeys[provider] = await decryptKey(keyVal);
          } catch {
            delete decryptedApiKeys[provider];
            undecryptable.push(`apiKeys.${provider}`);
          }
        }
      }
    }
    anyPrefs.apiKeys = decryptedApiKeys;
  }

  return { decrypted, needsMigration, undecryptable };
}

/**
 * Clear cached key in memory (for testing purposes).
 */
export function _resetCryptoKeyCacheForTesting(): void {
  cachedCryptoKey = null;
  inMemoryKeyFallback = null;
  installKeyPromise = null;
}
