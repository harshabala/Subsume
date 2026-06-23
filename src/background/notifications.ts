export function showRateLimitNotification(provider: string, usingFallback: boolean) {
  const message = usingFallback
    ? `Rate limit hit for ${provider}. Switching to secondary key...`
    : `Rate limit hit. No secondary key configured.`;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon-128.png',
    title: 'API Rate Limit Reached',
    message,
    priority: 2
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('Notification error:', chrome.runtime.lastError.message);
    }
  });
}
