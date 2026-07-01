export const BASE_URL = 'https://api.themoviedb.org/3';
export const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let tmdbApiKey: string | null = null;

export function setApiKey(key: string): void {
  tmdbApiKey = key;
}

export function getTmdbApiKey(): string {
  if (!tmdbApiKey) {
    throw new Error('TMDB API key not configured. Please set it in Settings.');
  }
  return tmdbApiKey;
}

export async function fetchWithRetry(
  url: string,
  retries = 3,
  baseDelay = 500,
  options?: RequestInit
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      if (res.status >= 500) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError || new Error(`Failed after ${retries} retries`);
}

export function makeBearerHeaders(key: string): RequestInit {
  if (!key || !key.trim()) {
    throw new Error('TMDb API key is missing or empty.');
  }
  return { headers: { Authorization: `Bearer ${key}` } };
}
