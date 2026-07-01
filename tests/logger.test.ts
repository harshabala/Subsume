import { describe, test, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/shared/logger';
import { Logs } from '@/ui/pages/Logs';
import { h, render } from 'preact';

describe('Logger Stability & Polish', () => {
  let storedLogs: any[] = [];

  beforeEach(() => {
    storedLogs = [];
    delete (chrome.runtime as any).lastError;
    (chrome as any).storage = {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    };
  });

  test('serializes storage mutations in pushLog so concurrent logs do not overwrite each other', async () => {
    chrome.storage.local.get = vi.fn().mockImplementation((key: string, cb?: any) => {
      const res = { system_logs: [...storedLogs] };
      if (cb && typeof cb === 'function') cb(res);
      return Promise.resolve(res);
    });

    chrome.storage.local.set = vi.fn().mockImplementation((obj: any, cb?: any) => {
      // Async set that takes 20ms before updating storedLogs
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (obj.system_logs) {
            storedLogs = [...obj.system_logs];
          }
          if (cb && typeof cb === 'function') cb();
          resolve();
        }, 20);
      });
    });

    // Fire two concurrent logs synchronously
    logger.warn('first concurrent log');
    logger.error('second concurrent log');

    // Wait enough time for async operations to finish
    await new Promise((r) => setTimeout(r, 80));
    if ((logger as any)._flushQueue) {
      await (logger as any)._flushQueue();
    }

    expect(storedLogs).toHaveLength(2);
    expect(storedLogs[0].message).toBe('first concurrent log');
    expect(storedLogs[1].message).toBe('second concurrent log');
  });

  test('inspects chrome.runtime.lastError and safely handles QuotaExceededError without unhandled exception', async () => {
    let lastErrorAccessed = false;
    
    chrome.storage.local.get = vi.fn().mockImplementation((key: string, cb?: any) => {
      const res = { system_logs: [...storedLogs] };
      if (cb && typeof cb === 'function') cb(res);
      return Promise.resolve(res);
    });

    chrome.storage.local.set = vi.fn().mockImplementation((obj: any, cb?: any) => {
      Object.defineProperty(chrome.runtime, 'lastError', {
        get() {
          lastErrorAccessed = true;
          return { message: 'QuotaExceededError: storage limit reached' };
        },
        configurable: true,
      });
      
      if (cb && typeof cb === 'function') {
        cb();
      }
      return Promise.reject(new Error('QuotaExceededError: storage limit reached'));
    });

    expect(() => {
      logger.error('huge quota log');
    }).not.toThrow();

    await new Promise((r) => setTimeout(r, 40));
    if ((logger as any)._flushQueue) {
      await expect((logger as any)._flushQueue()).resolves.not.toThrow();
    }
    expect(lastErrorAccessed).toBe(true);
  });

  test('truncates large persisted log details instead of storing full response bodies', async () => {
    chrome.storage.local.get = vi.fn().mockImplementation((key: string, cb?: any) => {
      const res = { system_logs: [...storedLogs] };
      if (cb && typeof cb === 'function') cb(res);
      return Promise.resolve(res);
    });

    chrome.storage.local.set = vi.fn().mockImplementation((obj: any, cb?: any) => {
      if (obj.system_logs) {
        storedLogs = [...obj.system_logs];
      }
      if (cb && typeof cb === 'function') cb();
      return Promise.resolve();
    });

    const hugeBody = 'x'.repeat(500);
    logger.error('Gemini API error (Status 500):', hugeBody);

    await new Promise((r) => setTimeout(r, 40));
    if ((logger as any)._flushQueue) {
      await (logger as any)._flushQueue();
    }

    expect(storedLogs).toHaveLength(1);
    const persistedDetails = storedLogs[0].details?.[0];
    expect(typeof persistedDetails).toBe('string');
    expect((persistedDetails as string).length).toBeLessThanOrEqual(201);
    expect(persistedDetails).toContain('…');
  });

  test('Logs page renders correct badge styles for info, warn, and error levels', async () => {
    storedLogs = [
      { timestamp: 1000, level: 'info', message: 'info message' },
      { timestamp: 2000, level: 'warn', message: 'warn message' },
      { timestamp: 3000, level: 'error', message: 'error message' }
    ];

    (chrome as any).storage = {
      local: {
        get: vi.fn().mockImplementation((key: string, cb?: any) => {
          const res = { system_logs: storedLogs };
          if (cb && typeof cb === 'function') cb(res);
          return Promise.resolve(res);
        }),
        set: vi.fn().mockResolvedValue(undefined),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    render(h(Logs, null), container);

    await new Promise((r) => setTimeout(r, 50));

    const badges = Array.from(container.querySelectorAll('tbody tr td:nth-child(2) span')) as HTMLElement[];
    expect(badges).toHaveLength(3);

    const errorBadge = badges.find(b => b.textContent === 'ERROR');
    const warnBadge = badges.find(b => b.textContent === 'WARN');
    const infoBadge = badges.find(b => b.textContent === 'INFO');

    expect(errorBadge).toBeDefined();
    expect(warnBadge).toBeDefined();
    expect(infoBadge).toBeDefined();

    expect(errorBadge!.style.color).toBe('rgb(255, 68, 68)'); // #ff4444
    expect(warnBadge!.style.color).toBe('rgb(255, 153, 0)'); // #ff9900
    expect(infoBadge!.style.color).not.toBe('rgb(255, 153, 0)');
    expect(infoBadge!.style.color).toBe('rgb(74, 144, 226)'); // #4a90e2 (blue/gray)

    document.body.removeChild(container);
  });
});
