export const AVAILABLE_PLATFORMS = [
  { id: '8', name: 'Netflix' },
  { id: '9', name: 'Prime Video' },
  { id: '337', name: 'Disney+' },
  { id: '350', name: 'Apple TV+' },
  { id: '15', name: 'Hulu' },
  { id: '384', name: 'Max' },
] as const;

/** Map TMDb provider_name values to our display names where they differ. */
const TMDB_NAME_ALIASES: Record<string, string> = {
  'Amazon Prime Video': 'Prime Video',
  'Amazon Video': 'Prime Video',
  'HBO Max': 'Max',
  'Max Amazon Channel': 'Max',
};

export function formatPlatformName(providerName: string): string {
  if (TMDB_NAME_ALIASES[providerName]) {
    return TMDB_NAME_ALIASES[providerName];
  }

  const exact = AVAILABLE_PLATFORMS.find((p) => p.name === providerName);
  if (exact) return exact.name;

  const fuzzy = AVAILABLE_PLATFORMS.find(
    (p) =>
      providerName.toLowerCase().includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(providerName.toLowerCase())
  );
  return fuzzy?.name ?? providerName;
}

export function getPlatformNameById(id: string): string | undefined {
  return AVAILABLE_PLATFORMS.find((p) => p.id === id)?.name;
}