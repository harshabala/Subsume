export interface KeyValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Live-check a TMDb API Read Access Token (Bearer) against /authentication.
 * Options-page only — does not touch background state.
 */
export async function validateTmdbKey(key: string): Promise<KeyValidationResult> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, error: 'TMDb API Read Access Token is required.' };
  }

  try {
    const res = await fetch('https://api.themoviedb.org/3/authentication', {
      headers: { Authorization: `Bearer ${trimmed}` },
    });

    if (res.status === 401) {
      return {
        valid: false,
        error:
          'Invalid token. Use your TMDb API Read Access Token (starts with eyJ…), not the API Key (v3 auth).',
      };
    }

    if (!res.ok) {
      return {
        valid: false,
        error: `TMDb returned ${res.status}. Try again in a moment.`,
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Could not reach TMDb. Check your connection and try again.',
    };
  }
}

/**
 * Live-check an OMDb API key with a lightweight title query.
 * Options-page only — does not touch background state.
 */
export async function validateOmdbKey(key: string): Promise<KeyValidationResult> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, error: 'OMDb API key is empty.' };
  }

  try {
    const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(trimmed)}&t=Inception`;
    const res = await fetch(url);

    if (!res.ok) {
      return {
        valid: false,
        error: `OMDb returned ${res.status}. Try again in a moment.`,
      };
    }

    const data = (await res.json()) as { Response?: string; Error?: string };

    if (data.Response === 'True') {
      return { valid: true };
    }

    const errMsg = data.Error || 'Invalid OMDb API key.';
    if (/invalid api key/i.test(errMsg)) {
      return {
        valid: false,
        error: 'Invalid OMDb API key. Get a free key at omdbapi.com.',
      };
    }

    // Title not found still means the key was accepted
    if (/not found/i.test(errMsg)) {
      return { valid: true };
    }

    return { valid: false, error: errMsg };
  } catch {
    return {
      valid: false,
      error: 'Could not reach OMDb. Check your connection and try again.',
    };
  }
}
