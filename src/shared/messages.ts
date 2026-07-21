import { ExtensionMessage, ExtensionResponse, MessageType } from './types';
import { logDiagnostic } from './diagnosticLog';

/** Interactive Google OAuth can take a long time — UI sendMessage must match. */
export const CONNECT_GOOGLE_DRIVE_TIMEOUT_MS = 120_000;

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
      const err = `Message ${type} timed out after ${timeoutMs}ms`;
      logDiagnostic('error', 'ui.sendMessage', err, `type=${type}`);
      reject(new Error(err));
    }, timeoutMs);

    const message: ExtensionMessage<TReq> = { type, payload };
    chrome.runtime.sendMessage(message, (response: ExtensionResponse<TRes> | undefined) => {
      clearTimeout(timeoutId);
      if (chrome.runtime.lastError) {
        const err = chrome.runtime.lastError.message ?? 'Unknown chrome.runtime error';
        logDiagnostic('error', 'ui.sendMessage', err, `type=${type}`);
        reject(new Error(err));
        return;
      }
      if (!response) {
        const err = `Message ${type} received no response`;
        logDiagnostic('error', 'ui.sendMessage', err);
        reject(new Error(err));
        return;
      }
      if (!response.success) {
        const err = response.error ?? `Message ${type} failed`;
        logDiagnostic('error', 'ui.sendMessage', err, `type=${type}`);
        reject(new Error(err));
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
        MessageType.RESOLVE_PAGE_CANDIDATE,
        MessageType.GET_TITLE_DETAILS,
        MessageType.GET_WORK_DETAILS,
        MessageType.ADD_TO_LIST,
        MessageType.ADD_TO_ARCHIVE,
        MessageType.REMOVE_FROM_LIBRARY,
        MessageType.CHECK_LIBRARY_STATUS,
        MessageType.CHECK_ARCHIVE_STATUS,
        MessageType.OPEN_DETAIL,
        MessageType.OPEN_CAPTURE_CANVAS,
      ]);

      if (!isExtensionOrigin && !ALLOWED_CONTENT_SCRIPT_MESSAGES.has(message.type)) {
        console.warn(`[Subsume] Blocked unauthorized message type ${message.type} from origin ${sender.url}`);
        logDiagnostic('warn', 'bg.router', `Blocked message ${message.type}`, sender.url ?? '');
        sendResponse({
          success: false,
          error: `Unauthorized message type for this origin: ${message.type}`,
        });
        return false;
      }

      const handler = handlers[message.type];

      if (!handler) {
        logDiagnostic('warn', 'bg.router', `Unknown message type: ${message.type}`);
        sendResponse({
          success: false,
          error: `Unknown message type: ${message.type}`,
        });
        return false;
      }

      const result = handler(message.payload, sender);

      if (result instanceof Promise) {
        result
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            logDiagnostic('error', 'bg.handler', msg, `type=${message.type}`);
            sendResponse({
              success: false,
              error: msg,
            });
          });
        return true;
      }

      sendResponse({ success: true, data: result });
      return false;
    }
  );
}
