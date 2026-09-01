import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ACTIVATION_METRICS_KEY,
  DEFAULT_ACTIVATION_METRICS,
  applyAppOpen,
  applyInscription,
  applyWeeklySelectionOpen,
  normalizeActivationMetrics,
  getActivationMetrics,
  incrementAppOpens,
  recordInscription,
  incrementWeeklySelectionOpens,
} from '@/shared/activationMetrics';

describe('activationMetrics pure helpers', () => {
  it('normalizeActivationMetrics fills defaults', () => {
    expect(normalizeActivationMetrics(undefined)).toEqual(DEFAULT_ACTIVATION_METRICS);
    expect(normalizeActivationMetrics({})).toEqual(DEFAULT_ACTIVATION_METRICS);
    expect(normalizeActivationMetrics({ appOpens: 3, inscriptionsTotal: 2 })).toEqual({
      appOpens: 3,
      inscriptionsTotal: 2,
      weeklySelectionOpens: 0,
      firstInscriptionAt: undefined,
    });
  });

  it('applyAppOpen increments', () => {
    expect(applyAppOpen(DEFAULT_ACTIVATION_METRICS).appOpens).toBe(1);
    expect(applyAppOpen({ ...DEFAULT_ACTIVATION_METRICS, appOpens: 4 }).appOpens).toBe(5);
  });

  it('applyInscription sets firstInscriptionAt only once and counts totals', () => {
    const first = applyInscription(DEFAULT_ACTIVATION_METRICS, 1_700_000_000_000);
    expect(first.inscriptionsTotal).toBe(1);
    expect(first.firstInscriptionAt).toBe(1_700_000_000_000);

    const second = applyInscription(first, 1_800_000_000_000);
    expect(second.inscriptionsTotal).toBe(2);
    expect(second.firstInscriptionAt).toBe(1_700_000_000_000);
  });

  it('applyWeeklySelectionOpen increments', () => {
    expect(applyWeeklySelectionOpen(DEFAULT_ACTIVATION_METRICS).weeklySelectionOpens).toBe(1);
  });
});

describe('activationMetrics storage', () => {
  beforeEach(() => {
    const store: Record<string, unknown> = {};
    (globalThis as { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string | string[]) => {
            const list = Array.isArray(keys) ? keys : [keys];
            const out: Record<string, unknown> = {};
            for (const k of list) out[k] = store[k];
            return Promise.resolve(out);
          }),
          set: vi.fn((obj: Record<string, unknown>) => {
            Object.assign(store, obj);
            return Promise.resolve();
          }),
        },
      },
    };
  });

  it('incrementAppOpens persists count', async () => {
    await incrementAppOpens();
    await incrementAppOpens();
    const metrics = await getActivationMetrics();
    expect(metrics.appOpens).toBe(2);
  });

  it('recordInscription sets firstInscriptionAt and total', async () => {
    const first = await recordInscription(1_111);
    expect(first.inscriptionsTotal).toBe(1);
    expect(first.firstInscriptionAt).toBe(1_111);

    const second = await recordInscription(2_222);
    expect(second.inscriptionsTotal).toBe(2);
    expect(second.firstInscriptionAt).toBe(1_111);

    const stored = await chrome.storage.local.get(ACTIVATION_METRICS_KEY);
    expect(stored[ACTIVATION_METRICS_KEY]).toMatchObject({
      inscriptionsTotal: 2,
      firstInscriptionAt: 1_111,
    });
  });

  it('incrementWeeklySelectionOpens persists', async () => {
    await incrementWeeklySelectionOpens();
    const metrics = await getActivationMetrics();
    expect(metrics.weeklySelectionOpens).toBe(1);
  });
});
