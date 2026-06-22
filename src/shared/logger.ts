/// <reference types="vite/client" />
const DEBUG = import.meta.env.DEV;

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
  },
  error: (...args: any[]) => {
    if (DEBUG) {
      console.error(...args);
    }
  }
};
