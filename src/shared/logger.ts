/// <reference types="vite/client" />
import { SystemLog } from './types';

const DEBUG = import.meta.env.DEV;

let storageQueue = Promise.resolve();

function pushLog(level: 'info' | 'warn' | 'error', args: any[]) {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
  
  // Format the message
  let message = '';
  if (args.length > 0) {
    message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
  }
  
  const logEntry: SystemLog = {
    timestamp: Date.now(),
    level,
    message,
    details: args.length > 1 ? args.slice(1) : undefined
  };

  storageQueue = storageQueue.then(async () => {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        try {
          const maybePromise = chrome.storage.local.get('system_logs', (res) => {
            if (chrome.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res || {});
            }
          }) as any;
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(resolve).catch(reject);
          }
        } catch (err) {
          reject(err);
        }
      });

      let logs: SystemLog[] = result.system_logs || [];
      logs.push(logEntry);
      if (logs.length > 100) {
        logs = logs.slice(logs.length - 100);
      }

      await new Promise<void>((resolve, reject) => {
        try {
          const maybePromise = chrome.storage.local.set({ system_logs: logs }, () => {
            if (chrome.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          }) as any;
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(resolve).catch(reject);
          }
        } catch (err) {
          reject(err);
        }
      });
    } catch (err) {
      if (err instanceof Error && (err.name === 'QuotaExceededError' || err.message.includes('QuotaExceededError'))) {
        if (DEBUG) {
          console.warn('[Subsume Logger] QuotaExceededError while saving log:', err.message);
        }
        return;
      }
      if (DEBUG) {
        console.error('[Subsume Logger] Failed to save log:', err);
      }
    }
  }).catch(() => {
    // Ensure queue keeps flowing even if something unexpectedly rejects
  });
}

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (DEBUG) {
      console.info(...args);
    }
    pushLog('info', args);
  },
  warn: (...args: any[]) => {
    if (DEBUG) {
      console.warn(...args);
    }
    pushLog('warn', args);
  },
  error: (...args: any[]) => {
    if (DEBUG) {
      console.error(...args);
    }
    pushLog('error', args);
  },
  _flushQueue: () => storageQueue
};
