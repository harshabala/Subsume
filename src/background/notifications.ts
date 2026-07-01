export type NotificationBadgeKind = 'new-releases' | 'watch-alert' | 'weekly-digest';

const NOTIFICATION_BADGE_TEXT: Record<NotificationBadgeKind, string> = {
  'new-releases': 'NEW',
  'watch-alert': '!',
  'weekly-digest': '✦',
};

export function setNotificationBadge(kind: NotificationBadgeKind): void {
  chrome.action.setBadgeText({ text: NOTIFICATION_BADGE_TEXT[kind] });
  chrome.action.setBadgeBackgroundColor({ color: '#a78bfa' });
}

export function clearNotificationBadge(): void {
  chrome.action.setBadgeText({ text: '' });
}

export function showRateLimitNotification(provider: string, usingFallback: boolean) {
  const message = usingFallback
    ? `Rate limit hit for ${provider}. Switching to secondary key...`
    : `Rate limit hit. No secondary key configured.`;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'API Rate Limit Reached',
    message,
    priority: 2
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('Notification error:', chrome.runtime.lastError.message);
    }
  });
}

export function showAuthErrorNotification(provider: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'API Authentication Error',
    message: `Invalid credentials for ${provider}. Please check your API key in Settings.`,
    priority: 2
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('Notification error:', chrome.runtime.lastError.message);
    }
  });
}
