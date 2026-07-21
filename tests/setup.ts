import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

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
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockResolvedValue({}),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn(),
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
  vi.clearAllMocks();
});
