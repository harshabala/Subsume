import { ExtensionMessage, ExtensionResponse, MessageType } from './types';

/**
 * Send a typed message from content script or UI to the background service worker.
 */
export function sendMessage<TReq, TRes>(
  type: MessageType,
  payload: TReq,
  timeoutMs: number = 30000
): Promise<ExtensionResponse<TRes>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Message ${type} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const message: ExtensionMessage<TReq> = { type, payload };
    chrome.runtime.sendMessage(message, (response: ExtensionResponse<TRes>) => {
      clearTimeout(timeoutId);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

/**
 * Type-safe handler map for background message routing.
 */
export type MessageHandler<TReq = unknown, TRes = unknown> = (
  payload: TReq,
  sender: chrome.runtime.MessageSender
) => Promise<TRes> | TRes;

export type MessageHandlerMap = Partial<{
  [K in MessageType]: (payload: unknown, sender: chrome.runtime.MessageSender) => Promise<unknown> | unknown;
}>;

/**
 * Create a message router for the background service worker.
 * Registers chrome.runtime.onMessage and dispatches to handlers.
 */
export function createMessageRouter(handlers: MessageHandlerMap): void {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: ExtensionResponse) => void
    ) => {
      const extensionOrigin = chrome.runtime.getURL('');
      const isExtensionOrigin = sender.url ? sender.url.startsWith(extensionOrigin) : false;

      const ALLOWED_CONTENT_SCRIPT_MESSAGES = new Set<string>([
        MessageType.GET_CONTENT_PREFS,
        MessageType.RESOLVE_POSTER,
        MessageType.GET_TITLE_DETAILS,
        MessageType.ADD_TO_LIST,
        MessageType.REMOVE_FROM_LIBRARY,
        MessageType.GET_LIBRARY,
      ]);

      if (!isExtensionOrigin && !ALLOWED_CONTENT_SCRIPT_MESSAGES.has(message.type)) {
        console.warn(`[Subsume] Blocked unauthorized message type ${message.type} from origin ${sender.url}`);
        sendResponse({
          success: false,
          error: `Unauthorized message type for this origin: ${message.type}`,
        });
        return false;
      }

      const handler = handlers[message.type];

      if (!handler) {
        sendResponse({
          success: false,
          error: `Unknown message type: ${message.type}`,
        });
        return false;
      }

      // Handle async responses
      const result = handler(message.payload, sender);

      if (result instanceof Promise) {
        result
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) =>
            sendResponse({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
          );
        return true; // Keep the message channel open for async response
      }

      sendResponse({ success: true, data: result });
      return false;
    }
  );
}
