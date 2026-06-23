/// <reference types="vite/client" />
import { SystemLog } from './types';

const DEBUG = import.meta.env.DEV;

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

  chrome.storage.local.get('system_logs', (result) => {
    let logs: SystemLog[] = result.system_logs || [];
    logs.push(logEntry);
    if (logs.length > 100) {
      logs = logs.slice(logs.length - 100);
    }
    chrome.storage.local.set({ system_logs: logs });
  });
}

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG) {
      console.log(...args);
    }
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
  }
};
