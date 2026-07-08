import { logDiagnostic } from '../shared/diagnosticLog';
import { GOOGLE_CLIENT_ID, GOOGLE_OAUTH_SCOPES } from './driveConfig';

export { CONNECT_GOOGLE_DRIVE_TIMEOUT_MS } from '../shared/messages';

const TOKEN_STORAGE_KEY = 'subsume_google_drive_token';
const EMAIL_STORAGE_KEY = 'subsume_google_drive_account_email';
const EXPIRY_BUFFER_MS = 60_000;

export function getGoogleOAuthClientId(): string {
  return GOOGLE_CLIENT_ID;
}

export function getOAuthRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}

export function assertGoogleDriveConfigured(): void {
  if (!GOOGLE_CLIENT_ID?.includes('.apps.googleusercontent.com')) {
    throw new Error('Google Drive backup is not configured (missing OAuth client_id).');
  }
}

/** Parse implicit-grant redirect (#access_token=…&expires_in=…). */
export function parseImplicitGrantResponseUrl(responseUrl: string): {
  accessToken: string;
  expiresAt: number;
} {
  const url = new URL(responseUrl);
  const params = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const oauthError = params.get('error');
  if (oauthError) {
    const desc = params.get('error_description') || oauthError;
    throw new Error(desc);
  }
  const accessToken = params.get('access_token');
  if (!accessToken) {
    throw new Error('Google sign-in completed but no access token was returned.');
  }
  const expiresInSec = parseInt(params.get('expires_in') || '3600', 10);
  const expiresAt = Date.now() + Math.max(60, expiresInSec) * 1000;
  return { accessToken, expiresAt };
}

function formatOAuthFlowError(raw: string): string {
  const msg = raw.trim() || 'Could not connect to Google Drive.';
  if (/redirect_uri_mismatch|redirect_uri/i.test(msg)) {
    return `Google rejected the redirect URI. In Google Cloud (Web application client), add: ${getOAuthRedirectUri()}`;
  }
  if (/bad request|invalid_request|invalid_client/i.test(msg)) {
    return `Google sign-in failed. Confirm Web application client ${GOOGLE_CLIENT_ID.slice(0, 12)}… and redirect URI ${getOAuthRedirectUri()}.`;
  }
  if (/canceled|cancelled|closed|user did not approve|did not approve|The user closed/i.test(msg)) {
    return 'Sign-in was cancelled. Tap Connect again and finish the Google account prompt.';
  }
  if (/network|offline|failed to fetch/i.test(msg)) {
    return 'Network error while signing in. Check your connection and try again.';
  }
  if (/timed out|timeout/i.test(msg)) {
    return 'Sign-in timed out. Try again and allow the Google sign-in window to open.';
  }
  if (/login_required|interaction_required|consent_required|access_denied/i.test(msg)) {
    return 'Google needs you to sign in again. Tap Connect and approve access.';
  }
  return msg;
}

function buildAuthorizationUrl(interactive: boolean): string {
  const redirectURL = chrome.identity.getRedirectURL();
  const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authURL.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authURL.searchParams.set('response_type', 'token');
  authURL.searchParams.set('redirect_uri', redirectURL);
  authURL.searchParams.set('scope', GOOGLE_OAUTH_SCOPES);
  if (interactive) {
    authURL.searchParams.set('prompt', 'consent select_account');
  } else {
    authURL.searchParams.set('prompt', 'none');
  }
  return authURL.toString();
}

async function readStoredToken(): Promise<{ accessToken: string; expiresAt: number } | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(TOKEN_STORAGE_KEY, (result) => {
      const raw = result[TOKEN_STORAGE_KEY] as { accessToken?: string; expiresAt?: number } | undefined;
      if (!raw?.accessToken || typeof raw.expiresAt !== 'number') {
        resolve(null);
        return;
      }
      resolve({ accessToken: raw.accessToken, expiresAt: raw.expiresAt });
    });
  });
}

async function storeAccessToken(accessToken: string, expiresAt: number): Promise<void> {
  const safeExpiry = expiresAt - EXPIRY_BUFFER_MS;
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { [TOKEN_STORAGE_KEY]: { accessToken, expiresAt: safeExpiry } },
      () => resolve()
    );
  });
}

export async function clearStoredDriveToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([TOKEN_STORAGE_KEY, EMAIL_STORAGE_KEY], () => resolve());
  });
}

export async function getStoredDriveAccountEmail(): Promise<string | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(EMAIL_STORAGE_KEY, (result) => {
      const email = result[EMAIL_STORAGE_KEY];
      resolve(typeof email === 'string' && email.length > 0 ? email : undefined);
    });
  });
}

async function storeAccountEmail(email: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [EMAIL_STORAGE_KEY]: email }, () => resolve());
  });
}

/** Best-effort account label (Drive appdata scope may not include email). */
async function resolveConnectedAccountLabel(accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { email?: string };
    if (data.email) {
      await storeAccountEmail(data.email);
      return data.email;
    }
  } catch {
    /* appdata-only token — no email scope */
  }
  return undefined;
}

function isTokenValid(stored: { expiresAt: number } | null): stored is { accessToken: string; expiresAt: number } {
  return !!stored && stored.expiresAt > Date.now();
}

function launchWebAuthFlow(interactive: boolean): Promise<{ accessToken: string; expiresAt: number }> {
  return new Promise((resolve, reject) => {
    const url = buildAuthorizationUrl(interactive);
    logDiagnostic(
      'info',
      'drive.oauth',
      'Calling chrome.identity.launchWebAuthFlow',
      `interactive=${interactive} redirect_uri=${getOAuthRedirectUri()}`
    );

    const timeout = globalThis.setTimeout(() => {
      logDiagnostic('error', 'drive.oauth', 'launchWebAuthFlow timed out', `interactive=${interactive}`);
      reject(new Error(formatOAuthFlowError('Sign-in timed out')));
    }, 120_000);

    chrome.identity.launchWebAuthFlow({ url, interactive }, (responseUrl) => {
      globalThis.clearTimeout(timeout);
      const err = chrome.runtime.lastError;
      if (err?.message) {
        const formatted = formatOAuthFlowError(err.message);
        logDiagnostic('error', 'drive.oauth', formatted, `interactive=${interactive}`);
        reject(new Error(formatted));
        return;
      }
      if (!responseUrl) {
        const formatted = formatOAuthFlowError('Sign-in was cancelled');
        logDiagnostic('warn', 'drive.oauth', formatted, `interactive=${interactive}`);
        reject(new Error(formatted));
        return;
      }
      try {
        const parsed = parseImplicitGrantResponseUrl(responseUrl);
        logDiagnostic('info', 'drive.oauth', 'Access token obtained', `interactive=${interactive}`);
        resolve(parsed);
      } catch (e) {
        const formatted = formatOAuthFlowError(e instanceof Error ? e.message : String(e));
        logDiagnostic('error', 'drive.oauth', formatted);
        reject(new Error(formatted));
      }
    });
  });
}

async function persistFromFlow(interactive: boolean): Promise<string> {
  const { accessToken, expiresAt } = await launchWebAuthFlow(interactive);
  await storeAccessToken(accessToken, expiresAt);
  return accessToken;
}

/** Obtain a valid access token (silent refresh when possible). */
export async function getAccessToken(options: { interactive?: boolean } = {}): Promise<string> {
  assertGoogleDriveConfigured();
  const wantInteractive = options.interactive ?? false;

  const stored = await readStoredToken();
  if (isTokenValid(stored)) {
    return stored.accessToken;
  }

  if (!wantInteractive) {
    try {
      return await persistFromFlow(false);
    } catch {
      logDiagnostic('info', 'drive.oauth', 'Silent sign-in failed; will try interactive if needed');
    }
  }

  return persistFromFlow(true);
}

let connectInFlight: Promise<{ email?: string }> | null = null;

export async function connectGoogleDrive(): Promise<{ email?: string }> {
  if (connectInFlight) {
    logDiagnostic('warn', 'drive.connect', 'Connect already in progress — reusing same attempt');
    return connectInFlight;
  }

  connectInFlight = (async () => {
    assertGoogleDriveConfigured();
    logDiagnostic(
      'info',
      'drive.connect',
      'Starting Google Drive connect (launchWebAuthFlow)',
      `extensionId=${chrome.runtime.id} oauthClientId=${GOOGLE_CLIENT_ID} redirect_uri=${getOAuthRedirectUri()}`
    );
    await clearStoredDriveToken();
    try {
      const token = await persistFromFlow(true);
      const email = await resolveConnectedAccountLabel(token);
      logDiagnostic('info', 'drive.connect', 'Google Drive connect succeeded', email ? `email=${email}` : undefined);
      return { email };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logDiagnostic('error', 'drive.connect', msg);
      throw e;
    } finally {
      connectInFlight = null;
    }
  })();

  return connectInFlight;
}

async function fetchDriveApi(url: string, init: RequestInit = {}): Promise<Response> {
  let token: string;
  try {
    token = await getAccessToken({ interactive: false });
  } catch {
    token = await getAccessToken({ interactive: true });
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', 'Bearer ' + token);

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    await clearStoredDriveToken();
    token = await getAccessToken({ interactive: true });
    headers.set('Authorization', 'Bearer ' + token);
    res = await fetch(url, { ...init, headers });
  }

  return res;
}

async function getBackupFileId(): Promise<string | null> {
  const driveFileSearchQuery = encodeURIComponent(
    "name='subsume_backup.json' and 'appDataFolder' in parents and trashed=false"
  );
  const res = await fetchDriveApi(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${driveFileSearchQuery}`
  );
  if (!res.ok) {
    throw new Error(`Could not reach Google Drive (${res.status}). Try again later.`);
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function uploadDatabaseBackup(jsonString: string): Promise<void> {
  const metadata = {
    name: 'subsume_backup.json',
    parents: ['appDataFolder'],
  };

  const fileId = await getBackupFileId();
  const boundary = '-------314159265358979323846';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closingMultipartDelimiter = '\r\n--' + boundary + '--';

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonString +
    closingMultipartDelimiter;

  const method = fileId ? 'PATCH' : 'POST';
  const path = fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files';

  const res = await fetchDriveApi(`https://www.googleapis.com${path}?uploadType=multipart`, {
    method,
    headers: {
      'Content-Type': 'multipart/related; boundary="' + boundary + '"',
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Backup upload failed (${res.status}). ${body.slice(0, 200)}`);
  }
}

export async function downloadDatabaseBackup(): Promise<string> {
  const fileId = await getBackupFileId();
  if (!fileId) throw new Error('No backup found on Google Drive for this account.');

  const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);

  if (!res.ok) {
    throw new Error(`Backup download failed (${res.status}). Try again later.`);
  }

  return await res.text();
}