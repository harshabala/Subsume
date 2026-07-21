import { ContentPrefs, UserPreferences } from '@/shared/types';

export function isHostnameDisabled(hostname: string, disabledDomains: string[]): boolean {
  const normalizedHost = hostname.toLowerCase();
  return disabledDomains.some((domain) => {
    const rule = domain.trim().toLowerCase();
    if (!rule) return false;
    if (rule.startsWith('.')) {
      const base = rule.slice(1);
      return normalizedHost === base || normalizedHost.endsWith(rule);
    }
    return normalizedHost === rule || normalizedHost.endsWith(`.${rule}`);
  });
}

/** Strip sensitive prefs down to fields safe for the content script. */
export function buildContentPrefs(prefs: UserPreferences, hostname: string): ContentPrefs {
  const disabledDomains = Array.isArray(prefs.disabledDomains) ? prefs.disabledDomains : [];
  const domainDisabled = isHostnameDisabled(hostname, disabledDomains);

  return {
    hoverCardsEnabled: !domainDisabled && (prefs.hoverCardsEnabled ?? true),
    posterOverlaysEnabled: !domainDisabled && (prefs.posterOverlaysEnabled ?? true),
    screenplayDockEnabled: !domainDisabled && (prefs.screenplayDockEnabled ?? true),
    detectionSensitivity: prefs.detectionSensitivity || 'medium',
    disabledDomains,
    domainDisabled,
    detectScreenWorks: !domainDisabled && (prefs.detectScreenWorks ?? true),
    detectBooks: !domainDisabled && (prefs.detectBooks ?? true),
    coverOverlaysEnabled: !domainDisabled && (prefs.coverOverlaysEnabled ?? true),
  };
}