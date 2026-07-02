import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFreeDataSourceStatuses } from '@/background/dataSources';

describe('getFreeDataSourceStatuses', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns configured=true for all free sources', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

    const statuses = await getFreeDataSourceStatuses();

    expect(statuses).toHaveLength(3);
    expect(statuses.every((s) => s.configured)).toBe(true);
    expect(statuses.map((s) => s.id).sort()).toEqual(['trakt', 'tvmaze', 'wikidata']);
  });

  it('marks sources as working when health probes succeed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

    const statuses = await getFreeDataSourceStatuses();

    expect(statuses.every((s) => s.working)).toBe(true);
  });

  it('marks sources as not working when health probes fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    const statuses = await getFreeDataSourceStatuses();

    expect(statuses.every((s) => !s.working)).toBe(true);
  });
});