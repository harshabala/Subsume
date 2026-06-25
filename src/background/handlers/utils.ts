import { logger } from '@/shared/logger';

export async function broadcastMessage(message: any) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('[Subsume] Failed to query tabs for broadcast:', err);
  }
}
