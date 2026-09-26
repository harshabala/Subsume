import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  encryptKey,
  decryptKey,
  isEncryptedKey,
  encryptUserPreferences,
  decryptUserPreferences,
  _resetCryptoKeyCacheForTesting,
  INSTALL_KEY_STORAGE_KEY,
  getOrCreateInstallKey,
} from '@/shared/keyCrypto';
import {
  getPreferences,
  savePreferences,
  getDb,
  DEFAULT_PREFS,
} from '@/background/storage';
import type { UserPreferences } from '@/shared/types';

describe('keyCrypto - WebCrypto AES-GCM encryption', () => {
  let storageMock: Record<string, unknown> = {};

  beforeEach(() => {
    _resetCryptoKeyCacheForTesting();
    storageMock = {};

    // Mock chrome.storage.local to persist in storageMock
    (chrome as unknown as { storage: { local: unknown } }).storage = {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (!keys) return { ...storageMock };
          if (typeof keys === 'string') return { [keys]: storageMock[keys] };
          if (Array.isArray(keys)) {
            const out: Record<string, unknown> = {};
            for (const k of keys) out[k] = storageMock[k];
            return out;
          }
          return { ...storageMock };
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(storageMock, items);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) delete storageMock[k];
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    };
  });

  afterEach(() => {
    _resetCryptoKeyCacheForTesting();
  });

  it('round-trip encrypts and decrypts a sensitive API key', async () => {
    const rawKey = 'sk-proj-test-1234567890abcdefg';
    const encrypted = await encryptKey(rawKey);

    expect(isEncryptedKey(encrypted)).toBe(true);
    expect(encrypted).toMatch(/^enc:v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(encrypted).not.toContain(rawKey);

    const decrypted = await decryptKey(encrypted);
    expect(decrypted).toBe(rawKey);
  });

  it('uses unique IVs so two encryptions of the same key produce different ciphertexts', async () => {
    const rawKey = 'sk-ant-test-998877665544';
    const encrypted1 = await encryptKey(rawKey);
    const encrypted2 = await encryptKey(rawKey);

    expect(encrypted1).not.toBe(encrypted2);
    expect(await decryptKey(encrypted1)).toBe(rawKey);
    expect(await decryptKey(encrypted2)).toBe(rawKey);
  });

  it('is idempotent when encrypting an already-encrypted string', async () => {
    const rawKey = 'tmdb_sample_secret_key';
    const encrypted = await encryptKey(rawKey);
    const encryptedAgain = await encryptKey(encrypted);

    expect(encryptedAgain).toBe(encrypted);
  });

  it('handles empty and whitespace strings safely', async () => {
    expect(await encryptKey('')).toBe('');
    expect(await decryptKey('')).toBe('');
  });

  it('returns plaintext as-is for backward compatibility / migration', async () => {
    const legacyPlaintext = 'legacy-unencrypted-tmdb-key-12345';
    const result = await decryptKey(legacyPlaintext);
    expect(result).toBe(legacyPlaintext);
  });

  it('fails decryption if ciphertext is tampered with', async () => {
    const rawKey = 'super-secret-anthropic-key';
    const encrypted = await encryptKey(rawKey);
    const parts = encrypted.split(':');

    // Tamper with the last byte of the ciphertext
    const cipherB64 = parts[3];
    const tamperedB64 = cipherB64.slice(0, -2) + (cipherB64.endsWith('A') ? 'B' : 'A');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedB64}`;

    await expect(decryptKey(tampered)).rejects.toThrow(/authentication failed|corrupted/i);
  });

  it('fails decryption if encrypted format is malformed', async () => {
    await expect(decryptKey('enc:v1:corrupt')).rejects.toThrow(/Invalid encrypted key format/i);
  });

  it('persists install key in chrome.storage.local and recovers after memory cache reset', async () => {
    const rawKey = 'google-books-secret-key-123';
    const encrypted = await encryptKey(rawKey);

    // Verify key was saved to chrome.storage.local
    expect(storageMock[INSTALL_KEY_STORAGE_KEY]).toBeDefined();
    const storedInstallKey = storageMock[INSTALL_KEY_STORAGE_KEY];

    // Reset in-memory key cache
    _resetCryptoKeyCacheForTesting();

    // Decrypt should reload the key from chrome.storage.local and succeed
    const decrypted = await decryptKey(encrypted);
    expect(decrypted).toBe(rawKey);
    expect(storageMock[INSTALL_KEY_STORAGE_KEY]).toBe(storedInstallKey);
  });

  it('fails decryption if the per-install key has changed', async () => {
    const rawKey = 'gemini-key-to-fail';
    const encrypted = await encryptKey(rawKey);

    // Reset memory and overwrite chrome.storage.local with a new random key
    _resetCryptoKeyCacheForTesting();
    delete storageMock[INSTALL_KEY_STORAGE_KEY];

    // Trigger generation of a new install key by encrypting a dummy string
    await encryptKey('dummy');

    // Attempting to decrypt the old ciphertext with the new key should fail
    await expect(decryptKey(encrypted)).rejects.toThrow(/authentication failed|corrupted/i);
  });

  it('does not generate a new key or overwrite existing key when storage read errors', async () => {
    // 1. Establish an existing install key in storage
    const originalKey = await encryptKey('initial-seed-key');
    const storedInstallKey = storageMock[INSTALL_KEY_STORAGE_KEY];
    expect(storedInstallKey).toBeDefined();

    // Reset in-memory cache so next call must read from storage
    _resetCryptoKeyCacheForTesting();

    // 2. Simulate storage read failure via chrome.runtime.lastError
    const originalGet = chrome.storage.local.get;
    chrome.storage.local.get = vi.fn((_keys, callback) => {
      if (typeof callback === 'function') {
        (chrome.runtime as unknown as { lastError: { message: string } }).lastError = {
          message: 'Simulated chrome.storage.local read failure',
        };
        callback({});
        delete (chrome.runtime as unknown as { lastError?: unknown }).lastError;
      }
    }) as unknown as typeof chrome.storage.local.get;

    // 3. Attempting to get or create install key should reject due to read failure
    await expect(getOrCreateInstallKey()).rejects.toThrow(/read failure/i);

    // 4. Verify existing key was NEVER overwritten
    expect(storageMock[INSTALL_KEY_STORAGE_KEY]).toBe(storedInstallKey);

    // 5. Restore normal storage read and verify recovery without key generation
    chrome.storage.local.get = originalGet;
    const decrypted = await decryptKey(originalKey);
    expect(decrypted).toBe('initial-seed-key');
    expect(storageMock[INSTALL_KEY_STORAGE_KEY]).toBe(storedInstallKey);
  });

  describe('UserPreferences encryption and decryption helpers', () => {
    it('encrypts all sensitive fields while preserving non-sensitive fields', async () => {
      const prefs: UserPreferences = {
        ...DEFAULT_PREFS,
        tmdbApiKey: 'tmdb-raw-key',
        omdbApiKey: 'omdb-raw-key',
        llmApiKey: 'openai-raw-key',
        llmSecondaryApiKey: 'anthropic-raw-key',
        googleBooksApiKey: 'google-raw-key',
        theme: 'dark',
        favoriteGenres: ['Sci-Fi', 'Drama'],
      };

      const encryptedPrefs = await encryptUserPreferences(prefs);

      expect(encryptedPrefs.theme).toBe('dark');
      expect(encryptedPrefs.favoriteGenres).toEqual(['Sci-Fi', 'Drama']);
      expect(isEncryptedKey(encryptedPrefs.tmdbApiKey)).toBe(true);
      expect(isEncryptedKey(encryptedPrefs.omdbApiKey)).toBe(true);
      expect(isEncryptedKey(encryptedPrefs.llmApiKey)).toBe(true);
      expect(isEncryptedKey(encryptedPrefs.llmSecondaryApiKey)).toBe(true);
      expect(isEncryptedKey(encryptedPrefs.googleBooksApiKey)).toBe(true);

      const { decrypted, needsMigration } = await decryptUserPreferences(encryptedPrefs);
      expect(needsMigration).toBe(false);
      expect(decrypted.tmdbApiKey).toBe('tmdb-raw-key');
      expect(decrypted.omdbApiKey).toBe('omdb-raw-key');
      expect(decrypted.llmApiKey).toBe('openai-raw-key');
      expect(decrypted.llmSecondaryApiKey).toBe('anthropic-raw-key');
      expect(decrypted.googleBooksApiKey).toBe('google-raw-key');
    });

    it('detects unencrypted plaintext keys and flags needsMigration=true', async () => {
      const legacyPrefs: UserPreferences = {
        ...DEFAULT_PREFS,
        tmdbApiKey: 'unencrypted-plaintext-key',
        theme: 'dark',
      };

      const { decrypted, needsMigration } = await decryptUserPreferences(legacyPrefs);
      expect(needsMigration).toBe(true);
      expect(decrypted.tmdbApiKey).toBe('unencrypted-plaintext-key');
    });

    it('encrypts and decrypts nested apiKeys object if present', async () => {
      const prefsWithNested = {
        ...DEFAULT_PREFS,
        apiKeys: {
          tmdb: 'nested-tmdb-key',
          openai: 'nested-openai-key',
        },
      } as unknown as UserPreferences;

      const encrypted = await encryptUserPreferences(prefsWithNested);
      const encAny = encrypted as unknown as { apiKeys: Record<string, string> };
      expect(isEncryptedKey(encAny.apiKeys.tmdb)).toBe(true);
      expect(isEncryptedKey(encAny.apiKeys.openai)).toBe(true);

      const { decrypted, needsMigration } = await decryptUserPreferences(encrypted);
      expect(needsMigration).toBe(false);
      const decAny = decrypted as unknown as { apiKeys: Record<string, string> };
      expect(decAny.apiKeys.tmdb).toBe('nested-tmdb-key');
      expect(decAny.apiKeys.openai).toBe('nested-openai-key');
    });
  });

  describe('Storage transparent encryption & migration in IndexedDB', () => {
    it('migrates plaintext keys on read and writes back encrypted keys', async () => {
      // 1. Direct write of plaintext preferences into the DB (simulating an existing install)
      const db = await getDb();
      const plaintextPrefs = {
        ...DEFAULT_PREFS,
        tmdbApiKey: 'legacy-tmdb-plaintext-1234',
        omdbApiKey: 'legacy-omdb-plaintext-5678',
      };
      await db.put('preferences', plaintextPrefs, 'user-prefs');

      // 2. Read through getPreferences()
      const returnedPrefs = await getPreferences();

      // Returned in-memory object must be usable plaintext
      expect(returnedPrefs.tmdbApiKey).toBe('legacy-tmdb-plaintext-1234');
      expect(returnedPrefs.omdbApiKey).toBe('legacy-omdb-plaintext-5678');

      // 3. Inspect the actual raw record in IndexedDB: it must now be ENCRYPTED!
      const rawInDb = (await db.get('preferences', 'user-prefs')) as UserPreferences;
      expect(rawInDb.tmdbApiKey).not.toBe('legacy-tmdb-plaintext-1234');
      expect(isEncryptedKey(rawInDb.tmdbApiKey)).toBe(true);
      expect(rawInDb.omdbApiKey).not.toBe('legacy-omdb-plaintext-5678');
      expect(isEncryptedKey(rawInDb.omdbApiKey)).toBe(true);

      // 4. Calling getPreferences() again still returns plaintext
      const returnedAgain = await getPreferences();
      expect(returnedAgain.tmdbApiKey).toBe('legacy-tmdb-plaintext-1234');
      expect(returnedAgain.omdbApiKey).toBe('legacy-omdb-plaintext-5678');
    });

    it('savePreferences stores encrypted keys at rest', async () => {
      const newPrefs: UserPreferences = {
        ...DEFAULT_PREFS,
        tmdbApiKey: 'brand-new-plaintext-key-999',
        googleBooksApiKey: 'brand-new-google-key-888',
      };

      await savePreferences(newPrefs);

      // Verify raw database contents are encrypted
      const db = await getDb();
      const rawInDb = (await db.get('preferences', 'user-prefs')) as UserPreferences;
      expect(isEncryptedKey(rawInDb.tmdbApiKey)).toBe(true);
      expect(rawInDb.tmdbApiKey).not.toContain('brand-new-plaintext-key-999');
      expect(isEncryptedKey(rawInDb.googleBooksApiKey)).toBe(true);
      expect(rawInDb.googleBooksApiKey).not.toContain('brand-new-google-key-888');

      // getPreferences returns the decrypted values
      const loaded = await getPreferences();
      expect(loaded.tmdbApiKey).toBe('brand-new-plaintext-key-999');
      expect(loaded.googleBooksApiKey).toBe('brand-new-google-key-888');
    });
    describe('decrypt failure is never destructive', () => {
      async function seedEncryptedTmdb(): Promise<{ cipher: string; goodInstallKey: unknown }> {
        await savePreferences({ ...DEFAULT_PREFS, tmdbApiKey: 'tmdb-secret-abcdef-123456' });
        const db = await getDb();
        const raw = (await db.get('preferences', 'user-prefs')) as UserPreferences;
        return { cipher: raw.tmdbApiKey as string, goodInstallKey: storageMock[INSTALL_KEY_STORAGE_KEY] };
      }

      async function breakInstallKey(): Promise<void> {
        _resetCryptoKeyCacheForTesting();
        // A different (valid) 256-bit key: decrypt fails authentication.
        storageMock[INSTALL_KEY_STORAGE_KEY] = Buffer.from(new Uint8Array(32).fill(7)).toString('base64');
      }

      it('decryptUserPreferences does not flag migration or write back for failed ciphertext', async () => {
        const { cipher } = await seedEncryptedTmdb();
        await breakInstallKey();
        const res = await decryptUserPreferences({ ...DEFAULT_PREFS, tmdbApiKey: cipher });
        expect(res.decrypted.tmdbApiKey).toBeUndefined();
        expect(res.needsMigration).toBe(false);
        expect(res.undecryptable).toEqual(['tmdbApiKey']);
      });

      it('transient decrypt failure leaves stored ciphertext intact and recovers later', async () => {
        const { cipher, goodInstallKey } = await seedEncryptedTmdb();
        await breakInstallKey();

        const during = await getPreferences();
        expect(during.tmdbApiKey).toBeUndefined();
        const db = await getDb();
        const rawDuring = (await db.get('preferences', 'user-prefs')) as UserPreferences;
        expect(rawDuring.tmdbApiKey).toBe(cipher);

        // Storage recovers
        _resetCryptoKeyCacheForTesting();
        storageMock[INSTALL_KEY_STORAGE_KEY] = goodInstallKey;
        const after = await getPreferences();
        expect(after.tmdbApiKey).toBe('tmdb-secret-abcdef-123456');
      });

      it('still migrates plaintext keys, while preserving a sibling ciphertext that failed', async () => {
        const { cipher } = await seedEncryptedTmdb();
        const db = await getDb();
        await db.put(
          'preferences',
          { ...DEFAULT_PREFS, tmdbApiKey: cipher, omdbApiKey: 'plain-omdb-key-0001' },
          'user-prefs'
        );
        await breakInstallKey();

        const prefs = await getPreferences();
        expect(prefs.omdbApiKey).toBe('plain-omdb-key-0001');
        expect(prefs.tmdbApiKey).toBeUndefined();

        const raw = (await db.get('preferences', 'user-prefs')) as UserPreferences;
        expect(isEncryptedKey(raw.omdbApiKey)).toBe(true); // plaintext migrated
        expect(raw.tmdbApiKey).toBe(cipher); // failed ciphertext untouched
      });

      it('corrupt ciphertext is left alone and does not throw out of getPreferences', async () => {
        const db = await getDb();
        const corrupt = 'enc:v1:not-base64!:garbage';
        await db.put('preferences', { ...DEFAULT_PREFS, llmApiKey: corrupt }, 'user-prefs');
        const prefs = await getPreferences();
        expect(prefs.llmApiKey).toBeUndefined();
        const raw = (await db.get('preferences', 'user-prefs')) as UserPreferences;
        expect(raw.llmApiKey).toBe(corrupt);
      });
    });
  });
});
