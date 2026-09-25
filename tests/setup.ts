import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

export const storageBackingStore = new Map<string, any>();

function getStorageData(keys?: string | string[] | Record<string, any> | null): Record<string, any> {
  const result: Record<string, any> = {};
  if (keys === null || keys === undefined) {
    for (const [k, v] of storageBackingStore.entries()) {
      result[k] = v;
    }
  } else if (typeof keys === 'string') {
    if (storageBackingStore.has(keys)) {
      result[keys] = storageBackingStore.get(keys);
    }
  } else if (Array.isArray(keys)) {
    for (const k of keys) {
      if (storageBackingStore.has(k)) {
        result[k] = storageBackingStore.get(k);
      }
    }
  } else if (typeof keys === 'object') {
    for (const [k, defaultVal] of Object.entries(keys)) {
      result[k] = storageBackingStore.has(k) ? storageBackingStore.get(k) : defaultVal;
    }
  }
  return result;
}

const mockGet = (keys?: any, cb?: (result: any) => void) => {
  const callback = typeof keys === 'function' ? keys : cb;
  const targetKeys = typeof keys === 'function' ? null : keys;
  const result = getStorageData(targetKeys);
  if (typeof callback === 'function') {
    callback(result);
  }
  return Promise.resolve(result);
};

const mockSet = (items: Record<string, any>, cb?: () => void) => {
  if (items && typeof items === 'object') {
    for (const [k, v] of Object.entries(items)) {
      storageBackingStore.set(k, v);
    }
  }
  if (typeof cb === 'function') {
    cb();
  }
  return Promise.resolve();
};

const mockRemove = (keys: string | string[], cb?: () => void) => {
  const toRemove = Array.isArray(keys) ? keys : [keys];
  for (const k of toRemove) {
    storageBackingStore.delete(k);
  }
  if (typeof cb === 'function') {
    cb();
  }
  return Promise.resolve();
};

const mockClear = (cb?: () => void) => {
  storageBackingStore.clear();
  if (typeof cb === 'function') {
    cb();
  }
  return Promise.resolve();
};

const chromeMock = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => 
      `chrome-extension://test-extension-id/${path}`),
  },
  storage: {
    local: {
      get: vi.fn(mockGet),
      set: vi.fn(mockSet),
      remove: vi.fn(mockRemove),
      clear: vi.fn(mockClear),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockResolvedValue({}),
  },
  windows: {
    update: vi.fn().mockResolvedValue({}),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn((_name: string, cb?: (alarm?: chrome.alarms.Alarm) => void) => {
      // Callback form used by reconcileDispatchAlarm / ensurePeriodAlarm.
      if (cb) cb(undefined);
      return Promise.resolve(undefined);
    }),
    clear: vi.fn((_name: string, cb?: () => void) => {
      if (cb) cb();
      return Promise.resolve(true);
    }),
    onAlarm: { addListener: vi.fn() },
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};

// @ts-ignore — intentional global override for test env
global.chrome = chromeMock;

beforeEach(() => {
  storageBackingStore.clear();
  // @ts-ignore
  global.chrome = chromeMock;
  chromeMock.storage.local.get = vi.fn(mockGet);
  chromeMock.storage.local.set = vi.fn(mockSet);
  chromeMock.storage.local.remove = vi.fn(mockRemove);
  chromeMock.storage.local.clear = vi.fn(mockClear);
  vi.clearAllMocks();
});
