import { ContentPrefs, UserPreferences } from '@/shared/types';

export function isHostnameDisabled(hostname: string, disabledDomains: string[]): boolean {
  return disabledDomains.some((d) => d === hostname || d === `.${hostname}`);
}

/** Strip sensitive prefs down to fields safe for the content script. */
export function buildContentPrefs(prefs: UserPreferences, hostname: string): ContentPrefs {
  const disabledDomains = Array.isArray(prefs.disabledDomains) ? prefs.disabledDomains : [];
  const domainDisabled = isHostnameDisabled(hostname, disabledDomains);

  return {
    hoverCardsEnabled: !domainDisabled && (prefs.hoverCardsEnabled ?? true),
    posterOverlaysEnabled: !domainDisabled && (prefs.posterOverlaysEnabled ?? true),
    detectionSensitivity: prefs.detectionSensitivity || 'medium',
    disabledDomains,
    domainDisabled,
  };
}